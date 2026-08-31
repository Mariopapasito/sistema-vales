import { Router } from 'express';
import { Op } from 'sequelize';
import Bitacora from '../models/Bitacora';
import User from '../models/User';
import { protect, AuthRequest } from '../middleware/auth';
import NotificationService from '../services/notificationService';
import { canEditBitacora, canUseBitacoras } from '../domain/permissions';

const router = Router();
const validTipos = ['station', 'weekly'];

router.use(protect);

router.get('/', async (req: AuthRequest, res) => {
  try {
    if (!canUseBitacoras(req.user?.rol)) {
      return res.status(403).json({ message: 'No tienes permisos para ver bitácoras' });
    }

    const where: any = {};
    const { estacion, fechaDesde, fechaHasta, tipo } = req.query;

    if (req.user?.rol === 'estacion') {
      // La restricción depende del usuario autenticado, no de parámetros del navegador.
      where.userId = req.user.id;
    } else {
      if (typeof estacion === 'string' && estacion.trim()) {
        where.estacion = { [Op.like]: `%${estacion.trim()}%` };
      }
      if (typeof tipo === 'string' && validTipos.includes(tipo)) where.tipo = tipo;
      if (fechaDesde || fechaHasta) {
        where.createdAt = {};
        if (typeof fechaDesde === 'string' && fechaDesde) {
          where.createdAt[Op.gte] = new Date(`${fechaDesde}T00:00:00`);
        }
        if (typeof fechaHasta === 'string' && fechaHasta) {
          where.createdAt[Op.lte] = new Date(`${fechaHasta}T23:59:59.999`);
        }
      }
    }

    const bitacoras = await Bitacora.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'nombre', 'estacion', 'rol'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json(bitacoras);
  } catch (error) {
    console.error('Error fetching bitacoras:', error);
    res.status(500).json({ message: 'Error al obtener las bitácoras' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!canUseBitacoras(req.user?.rol)) {
      return res.status(403).json({ message: 'No tienes permisos para guardar bitácoras' });
    }

    const requestedTipo = req.body?.tipo;
    const tipo: 'station' | 'weekly' = requestedTipo;
    if (!validTipos.includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de bitácora inválido' });
    }

    const legacyId = typeof req.body?.legacyId === 'string' ? req.body.legacyId.slice(0, 191) : undefined;
    if (legacyId) {
      const existing = await Bitacora.findOne({ where: { userId: req.user!.id, legacyId } });
      if (existing) return res.json(existing);
    }

    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ message: 'El contenido de la bitácora es requerido' });
    }

    const estacion = req.user?.rol === 'estacion'
      ? (req.user.estacion || '').trim()
      : String(req.body?.estacion || payload.estacion || payload.area || '').trim();
    if (!estacion) return res.status(400).json({ message: 'La estación es requerida' });

    const fecha = String(req.body?.fecha || payload.fecha || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ message: 'La fecha es requerida' });
    }

    const latest = await Bitacora.findOne({
      where: { tipo, estacion },
      order: [['id', 'DESC']],
      attributes: ['folio'],
    });
    const latestNumber = Number(String(latest?.folio || '').replace(/\D/g, '')) || 0;
    const folio = String(latestNumber + 1).padStart(3, '0');
    const nombre = tipo === 'station' ? 'REPORTE DE VISITA A ESTACIONES' : 'LISTA DE VERIFICACIÓN SEMANAL';

    const savedPayload = { ...payload, estacion, fecha, folio };
    const bitacora = await Bitacora.create({
      tipo,
      nombre,
      estacion,
      fecha,
      folio,
      payload: savedPayload,
      userId: req.user!.id,
      legacyId,
    });

    if (req.user?.rol === 'estacion' && !legacyId) {
      const ns = new NotificationService();
      await ns.notifyByRoles(['jefe'], {
        tipo: 'SYSTEM',
        titulo: '📋 Nueva bitácora registrada',
        mensaje: `${req.user.nombre} registró una bitácora para ${estacion} con folio ${folio}`,
        datos: { bitacoraId: bitacora.id, tipo, estacion, fecha, folio },
      }, req.user.id);
    }

    const result = await Bitacora.findByPk(bitacora.id, {
      include: [{ model: User, attributes: ['id', 'nombre', 'estacion', 'rol'] }],
    });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating bitacora:', error);
    res.status(500).json({ message: 'Error al guardar la bitácora' });
  }
});

router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    if (!canUseBitacoras(req.user?.rol)) {
      return res.status(403).json({ message: 'No tienes permisos para editar bitácoras' });
    }

    const bitacora = await Bitacora.findByPk(req.params.id);
    if (!bitacora) return res.status(404).json({ message: 'Bitácora no encontrada' });
    if (!canEditBitacora(req.user?.rol, req.user?.id, bitacora.userId)) {
      return res.status(403).json({ message: 'Solo puedes editar tus propias bitácoras' });
    }

    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ message: 'El contenido de la bitácora es requerido' });
    }

    const estacion = req.user?.rol === 'estacion'
      ? bitacora.estacion
      : String(req.body?.estacion || payload.estacion || payload.area || bitacora.estacion).trim();
    const fecha = String(req.body?.fecha || payload.fecha || bitacora.fecha).trim();
    if (!estacion || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ message: 'Estación y fecha válidas son requeridas' });
    }

    bitacora.estacion = estacion;
    bitacora.fecha = fecha;
    bitacora.payload = { ...payload, estacion, fecha, folio: bitacora.folio };
    await bitacora.save();

    res.json(bitacora);
  } catch (error) {
    console.error('Error updating bitacora:', error);
    res.status(500).json({ message: 'Error al actualizar la bitácora' });
  }
});

export default router;
