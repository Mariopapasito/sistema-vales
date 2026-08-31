import express, { Request, Response } from 'express';
import { protect as authMiddleware } from '../middleware/auth';
import MonthlyOrder from '../models/MonthlyOrder';
import User from '../models/User';
import { logActivity } from '../utils/activityLogger';
import { randomUUID } from 'crypto';

const router = express.Router();
const MONTHLY_ROLES = ['jefe', 'compras', 'estacion', 'almacen', 'constructora', 'sistemas'];
const STATION_ROLES = ['estacion', 'almacen', 'constructora'];

const canViewMonthlyOrder = (user: any, order: any): boolean => {
  if (!MONTHLY_ROLES.includes(user?.rol)) return false;
  if (user.rol === 'jefe' || user.rol === 'compras') return true;
  if (user.rol === 'sistemas') return order.tipo === 'toner';
  return STATION_ROLES.includes(user.rol) && order.estacion === (user.estacion || user.nombre);
};

// Get monthly orders for current user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!MONTHLY_ROLES.includes(user?.rol)) return res.status(403).json({ error: 'No tienes permisos' });

    // Estaciones y roles similares ven solo sus pedidos; Compras y Jefe ven todos; Sistemas solo toner
    const where: any = {};
    if (STATION_ROLES.includes(user.rol)) {
      where.estacion = user.estacion || user.nombre;
    } else if (user.rol === 'sistemas') {
      where.tipo = 'toner';
    }

    const orders = await MonthlyOrder.findAll({
      where,
      include: [{
        model: User,
        as: 'createdByUser',
        attributes: ['id', 'nombre', 'rol']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('Error fetching monthly orders:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get single monthly order
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const order = await MonthlyOrder.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'createdByUser',
        attributes: ['id', 'nombre', 'rol']
      }]
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const user = (req as any).user;
    if (!canViewMonthlyOrder(user, order)) return res.status(403).json({ error: 'No tienes permisos' });
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create monthly order
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { tipo, estacion, items } = req.body;

    if (!MONTHLY_ROLES.includes(user?.rol)) return res.status(403).json({ error: 'No tienes permisos' });

    if (!tipo) {
      logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: 'Fallo al crear pedido: falta campo "tipo"' });
      return res.status(400).json({ message: 'El campo tipo es requerido' });
    }
    if (!['aceites', 'papeleria', 'limpieza', 'toner', 'imprenta'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de pedido inválido' });
    }
    if (['sistemas', 'almacen', 'constructora'].includes(user.rol) && tipo !== 'toner') {
      return res.status(403).json({ error: 'Este rol solo puede crear pedidos de tóner' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Agrega al menos un artículo al pedido' });
    }
    const validItems = items
      .filter((item: any) => item && (String(item.descripcion || '').trim() || Number(item.cantidad) > 0))
      .map((item: any) => ({
        descripcion: String(item.descripcion || '').trim(),
        consumibles: Boolean(item.consumibles),
        intercambiables: Boolean(item.intercambiables),
        existencias: String(item.existencias || '').trim(),
        unidad: String(item.unidad || '').trim(),
        cantidad: Math.max(0, Number(item.cantidad) || 0),
      }));
    if (validItems.length === 0) return res.status(400).json({ error: 'El pedido no puede estar vacío' });

    const folio = `PEDIDO-${tipo.toUpperCase().slice(0, 1)}-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const order = await MonthlyOrder.create({
      folio,
      tipo,
      estacion: estacion || user.estacion || user.nombre,
      fecha: new Date(),
      items: validItems,
      estado: 'borrador',
      createdBy: user.id
    });

    logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_CREADO', entidad: 'pedido_mensual', detalle: `Folio: ${folio} | Tipo: ${tipo} | Estación: ${estacion || user.estacion || user.nombre} | Artículos: ${validItems.length}` });

    res.json({ success: true, data: order });
  } catch (error: any) {
    const user = (req as any).user;
    logActivity({ req, usuarioId: user?.id, usuarioNombre: user?.nombre, usuarioRol: user?.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: `Error al crear pedido: ${error.message}` });
    console.error('Error creating monthly order:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update monthly order
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await MonthlyOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Solo el creador, compras o jefe pueden editar
    if ((order as any).createdBy !== user.id && user.rol !== 'jefe' && user.rol !== 'compras') {
      logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: `Sin permiso para editar pedido ${(order as any).folio}` });
      return res.status(403).json({ error: 'No tienes permisos para editar este pedido' });
    }

    const { items, estado, notas } = req.body;
    if (items) (order as any).items = items;
    if (estado) (order as any).estado = estado;
    if (notas) (order as any).notas = notas;

    await order.save();

    logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_EDITADO', entidad: 'pedido_mensual', detalle: `Folio: ${(order as any).folio} | Campos editados: ${[items && 'items', estado && 'estado', notas && 'notas'].filter(Boolean).join(', ')}` });

    res.json({ success: true, data: order });
  } catch (error: any) {
    const user = (req as any).user;
    logActivity({ req, usuarioId: user?.id, usuarioNombre: user?.nombre, usuarioRol: user?.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: `Error al editar pedido ID ${req.params.id}: ${error.message}` });
    console.error('Error updating monthly order:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Confirmar pedido (doble confirmación: estacion + compras)
router.patch('/:id/confirmar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await MonthlyOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    if (STATION_ROLES.includes(user.rol)) {
      const orderEstacion = (order as any).estacion;
      if (orderEstacion !== user.estacion && orderEstacion !== user.nombre) {
        logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: `Sin permiso para confirmar pedido ${(order as any).folio} (estación no coincide)` });
        return res.status(403).json({ error: 'No autorizado' });
      }
      (order as any).confirmadoEstacion = true;
    } else if (['compras', 'jefe'].includes(user.rol)) {
      (order as any).confirmadoCompras = true;
    } else {
      logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: `Rol "${user.rol}" no autorizado para confirmar pedidos` });
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    // Si ambos confirmaron → completado, si no → enviado
    if ((order as any).confirmadoEstacion && (order as any).confirmadoCompras) {
      (order as any).estado = 'completado';
    } else if ((order as any).estado === 'borrador') {
      (order as any).estado = 'enviado';
    }

    await order.save();

    logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_CONFIRMADO', entidad: 'pedido_mensual', detalle: `Folio: ${(order as any).folio} | Confirmado por: ${user.rol} | Estado: ${(order as any).estado}` });

    res.json({ success: true, data: order });
  } catch (error: any) {
    const user = (req as any).user;
    logActivity({ req, usuarioId: user?.id, usuarioNombre: user?.nombre, usuarioRol: user?.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: `Error al confirmar pedido ID ${req.params.id}: ${error.message}` });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete monthly order
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await MonthlyOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Solo el creador o jefe pueden eliminar
    if ((order as any).createdBy !== user.id && user.rol !== 'jefe') {
      logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: `Sin permiso para eliminar pedido ${(order as any).folio}` });
      return res.status(403).json({ error: 'No tienes permisos para eliminar este pedido' });
    }

    const folio = (order as any).folio;
    const tipo = (order as any).tipo;
    await order.destroy();

    logActivity({ req, usuarioId: user.id, usuarioNombre: user.nombre, usuarioRol: user.rol, accion: 'PEDIDO_ELIMINADO', entidad: 'pedido_mensual', detalle: `Folio: ${folio} | Tipo: ${tipo}` });

    res.json({ success: true, message: 'Pedido eliminado' });
  } catch (error: any) {
    const user = (req as any).user;
    logActivity({ req, usuarioId: user?.id, usuarioNombre: user?.nombre, usuarioRol: user?.rol, accion: 'PEDIDO_ERROR', entidad: 'pedido_mensual', detalle: `Error al eliminar pedido ID ${req.params.id}: ${error.message}` });
    console.error('Error deleting monthly order:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
