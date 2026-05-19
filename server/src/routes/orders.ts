import express from 'express';
import { Op } from 'sequelize';
import Order from '../models/Order';
import User from '../models/User';
import WorkReport from '../models/WorkReport';
import { protect, AuthRequest } from '../middleware/auth';
import NotificationService from '../services/notificationService';

const router = express.Router();

const ESTACION_LIKE = ['estacion', 'almacen', 'constructora'];

// GET orders — with search & filter support
// Query params: busqueda, folio, estado, prioridad, tipo, estacion, fechaDesde, fechaHasta
router.get('/', protect, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.rol;
    const userId = req.userId;

    if (!userRole) return res.status(401).json({ message: 'User role not found' });

    // Role-based base filter
    let where: any = {};
    if (ESTACION_LIKE.includes(userRole || '')) where.usuarioId = userId;
    else if (userRole === 'sistemas') {
      where[Op.or] = [
        { tipo: 'sistemas' },
        { tipo: 'compras', usuarioId: userId },
      ];
    }
    else if (userRole === 'compras') where.tipo = 'compras';
    else if (userRole === 'jefe') { /* sees all */ }
    else return res.status(403).json({ message: `Unknown role: ${userRole}` });

    // Search filters from query params
    const { busqueda, folio, estado, prioridad, tipo, estacion, fechaDesde, fechaHasta, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    if (folio) where.folio = { [Op.like]: `%${folio}%` };
    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (tipo && userRole === 'jefe') where.tipo = tipo;
    if (estacion) where.localizacion = { [Op.like]: `%${estacion}%` };

    // Date range filter
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt[Op.gte] = new Date(fechaDesde as string);
      if (fechaHasta) {
        const hasta = new Date(fechaHasta as string);
        hasta.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = hasta;
      }
    }

    // Free text search in descripcion + folio
    let userWhere: any = {};
    if (busqueda) {
      const term = `%${busqueda}%`;
      where[Op.or] = [
        { folio: { [Op.like]: term } },
        { descripcion: { [Op.like]: term } },
        { localizacion: { [Op.like]: term } },
      ];
      userWhere = { nombre: { [Op.like]: term } };
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'nombre', 'estacion', 'rol'],
          ...(Object.keys(userWhere).length ? { where: userWhere, required: false } : {})
        },
        { model: WorkReport, as: 'workReport', attributes: ['id', 'number'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true,
    });

    res.json({
      orders,
      total: count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      limit: limitNum,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
});

// GET order by ID
router.get('/:id', protect, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.rol;
    const userId = req.userId;

    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['id', 'nombre', 'estacion', 'rol'] },
        { model: WorkReport, as: 'workReport' }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (ESTACION_LIKE.includes(userRole || '') && order.usuarioId !== userId)
      return res.status(403).json({ message: 'Not authorized' });
    if (userRole === 'sistemas' && order.tipo !== 'sistemas' && !(order.tipo === 'compras' && order.usuarioId === userId))
      return res.status(403).json({ message: 'Not authorized' });
    if (userRole === 'compras' && order.tipo !== 'compras')
      return res.status(403).json({ message: 'Not authorized' });

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
});

// POST - Create order (estacion, jefe y sistemas)
router.post('/', protect, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.rol;
    const userId = req.userId;
    const userEstacion = req.user?.estacion;

    if (!['estacion', 'almacen', 'constructora', 'jefe', 'sistemas'].includes(userRole || ''))
      return res.status(403).json({ message: 'Only Estacion, Jefe and Sistemas can create orders' });

    const { tipo, prioridad, descripcion, observaciones } = req.body;
    if (!['sistemas', 'compras'].includes(tipo))
      return res.status(400).json({ message: 'Invalid tipo' });

    if (userRole === 'sistemas' && tipo !== 'compras')
      return res.status(403).json({ message: 'Sistemas can only create compras orders' });

    const lastOrder = await Order.findOne({ order: [['id', 'DESC']] });
    const newFolio = `ORD-${String(1001 + (lastOrder?.id || 0)).padStart(5, '0')}`;

    const order = await Order.create({
      folio: newFolio,
      usuarioId: userId,
      prioridad,
      localizacion: userEstacion,
      descripcion,
      observaciones,
      tipo,
      estado: 'Sin iniciar',
      confirmadoEstacion: false,
      confirmadoProveedor: false,
      historialCambios: [{
        quien: req.user?.nombre,
        rol: userRole,
        accion: 'Creada',
        estado: 'Sin iniciar',
        timestamp: new Date().toISOString(),
        hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }]
    });

    // Auto-create WorkReport for 'sistemas' orders
    if (tipo === 'sistemas') {
      const currentUser = await User.findByPk(userId);
      await WorkReport.create({
        number: `WR-${String(order.id).padStart(4, '0')}`,
        orderId: order.id,
        createdById: userId,
        assignedToId: userId,
        station: currentUser?.estacion || userEstacion || '',
        faultDescription: descripcion,
        attendedBy: currentUser?.nombre || '',
        completed: false,
      });


    }

    // Enviar notificaciones según el tipo de orden
    try {
      const ns = new NotificationService();
      const rolesToNotify = tipo === 'sistemas' ? ['sistemas', 'jefe'] : ['compras', 'jefe'];
      await ns.notifyByRoles(rolesToNotify, {
        tipo: 'NEW_ORDER',
        titulo: '📋 Nueva orden de trabajo',
        mensaje: `${req.user?.nombre} creó la orden ${order.folio} (${tipo})`,
        datos: { orderId: order.id, folio: order.folio, tipo, prioridad }
      }, userId);
    } catch (notifErr) {
      console.error('[Notification] Error sending notification:', notifErr);
    }

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// PATCH - Update order status
// sistemas, compras y jefe pueden cambiar estado
// estacion puede marcar como "Completada" vía /confirmar
router.patch('/:id/estado', protect, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.rol;
    const { estado, firma } = req.body;

    if (!['sistemas', 'compras', 'jefe'].includes(userRole || ''))
      return res.status(403).json({ message: 'Not authorized to update status' });

    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (userRole === 'compras' && order.tipo !== 'compras')
      return res.status(403).json({ message: 'Compras can only update purchase orders' });
    if (userRole === 'sistemas' && order.tipo !== 'sistemas')
      return res.status(403).json({ message: 'Sistemas can only update system orders' });

    const historial = order.historialCambios || [];
    const ahora = new Date();
    historial.push({
      quien: req.user?.nombre,
      rol: userRole,
      accion: `Cambió estado a: ${estado}${firma ? ' (con firma)' : ''}`,
      estadoAnterior: order.estado,
      estadoNuevo: estado,
      timestamp: ahora.toISOString(),
      hora: ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });

    order.estado = estado;
    order.historialCambios = historial;

    // firma de sistemas (técnico en orden de trabajo)
    if (firma) {
      (order as any).firma_sistemas = firma;
      (order as any).firma = firma; // backward compat
    }

    if (estado === 'Completada') {
      order.confirmadoProveedor = true;
    } else {
      order.confirmadoProveedor = false;
      order.confirmadoEstacion = false;
    }

    await order.save();

    // Notificar cambio de estado
    try {
      const ns = new NotificationService();
      const estadoLabels: Record<string, string> = {
        'Sin iniciar': '🔴 Sin iniciar',
        'En proceso': '🟡 En proceso',
        'Completada': '🟢 Completada'
      };
      await ns.notifyByRoles(['sistemas', 'jefe', 'estacion', 'almacen', 'constructora'], {
        tipo: 'ORDER_STATUS_CHANGED',
        titulo: '📊 Cambio de estado',
        mensaje: `${req.user?.nombre} cambió ${order.folio} a ${estadoLabels[estado] || estado}`,
        datos: { orderId: order.id, folio: order.folio, estado }
      }, req.userId);
    } catch (notifErr) {
      console.error('[Notification] Error sending status notification:', notifErr);
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
});

// PATCH - Update order fields (prioridad, localizacion, descripcion, observaciones)
router.patch('/:id', protect, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.rol;
    const { prioridad, localizacion, descripcion, observaciones } = req.body;

    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['id', 'nombre', 'estacion', 'rol'] },
        { model: WorkReport, as: 'workReport', attributes: ['id', 'number'] }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // La estación creadora, sistemas y jefe pueden editar (pero no si está completada)
    const canEdit = userRole === 'sistemas' || userRole === 'jefe' || userRole === 'compras' || order.usuarioId === req.userId;
    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to edit this order' });
    }

    if (order.estado === 'Completada') {
      return res.status(400).json({ message: 'Cannot edit a completed order' });
    }

    // Actualizar los campos permitidos
    if (prioridad !== undefined) order.prioridad = prioridad;
    if (localizacion !== undefined) order.localizacion = localizacion;
    if (descripcion !== undefined) order.descripcion = descripcion;
    if (observaciones !== undefined) order.observaciones = observaciones;

    await order.save();

    // Recargar con relaciones
    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, attributes: ['id', 'nombre', 'estacion', 'rol'] },
        { model: WorkReport, as: 'workReport' }
      ]
    });

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

// PATCH - Confirmar completado (estacion confirma recepción, proveedor confirma entrega)
router.patch('/:id/confirmar', protect, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.rol;
    const { firma } = req.body;

    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['id', 'nombre', 'estacion', 'rol'] },
        { model: WorkReport, as: 'workReport', attributes: ['id', 'number'] }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const historial = order.historialCambios || [];
    const ahora = new Date();

    if (ESTACION_LIKE.includes(userRole || '')) {
      if (order.usuarioId !== req.userId)
        return res.status(403).json({ message: 'Not authorized' });
      order.confirmadoEstacion = true;
      // firma de estacion → "Nombre y Firma de Conformidad" en vale y "Supervisor" en orden de trabajo
      if (firma) {
        (order as any).firma_estacion = firma;
      }
      if (order.estado === 'Sin iniciar' || order.estado === 'En proceso') {
        order.estado = 'Completada';
      }
      historial.push({
        quien: req.user?.nombre, rol: userRole,
        accion: `Estación marcó como completada${firma ? ' (con firma)' : ''}`,
        timestamp: ahora.toISOString(),
        hora: ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } else if (['sistemas', 'compras', 'jefe'].includes(userRole || '')) {
      order.confirmadoProveedor = true;
      if (order.estado !== 'Completada') order.estado = 'Completada';
      historial.push({
        quien: req.user?.nombre, rol: userRole,
        accion: 'Proveedor confirmó completado',
        timestamp: ahora.toISOString(),
        hora: ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    order.historialCambios = historial;
    await order.save();

    // Crear orden de trabajo automáticamente si ambos han confirmado y es de tipo 'sistemas'
    if (order.confirmadoEstacion && order.confirmadoProveedor && order.tipo === 'sistemas' && !order.workReport) {
      const currentUser = await User.findByPk(req.userId);
      const workReport = await WorkReport.create({
        orderId: order.id,
        createdById: req.userId,
        assignedToId: req.userId,
        station: currentUser?.estacion || '',
        faultDescription: order.descripcion || '',
        attendedBy: currentUser?.nombre || '',
        completed: false,
      });

      // Reload order with workReport
      const updatedOrder = await Order.findByPk(order.id, {
        include: [
          { model: User, attributes: ['id', 'nombre', 'estacion', 'rol'] },
          { model: WorkReport, as: 'workReport' }
        ]
      });

      return res.json(updatedOrder);
    }

    // If not creating workReport, reload with current workReport
    const finalOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, attributes: ['id', 'nombre', 'estacion', 'rol'] },
        { model: WorkReport, as: 'workReport' }
      ]
    });

    res.json(finalOrder);
  } catch (error: any) {
    res.status(500).json({ message: 'Error confirming order', error: error.message });
  }
});

export default router;
