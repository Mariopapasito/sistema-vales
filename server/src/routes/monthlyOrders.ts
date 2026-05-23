import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { protect as authMiddleware } from '../middleware/auth';
import MonthlyOrder from '../models/MonthlyOrder';
import User from '../models/User';

const router = express.Router();

// Get monthly orders for current user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Estaciones ven solo sus pedidos
    // Compras y Jefe ven todos
    let where: any = {};
    if (user.rol === 'estacion') {
      where.estacion = user.estacion || user.nombre;
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

    // Generate unique folio
    const folio = `PEDIDO-${tipo.toUpperCase().slice(0, 1)}-${Date.now()}`;

    const order = await MonthlyOrder.create({
      folio,
      tipo,
      estacion: estacion || user.estacion || user.nombre,
      fecha: new Date(),
      items: items || [],
      estado: 'borrador',
      createdBy: user.id
    });

    res.json({ success: true, data: order });
  } catch (error: any) {
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
      return res.status(403).json({ error: 'No tienes permisos para editar este pedido' });
    }

    const { items, estado, notas } = req.body;
    if (items) (order as any).items = items;
    if (estado) (order as any).estado = estado;
    if (notas) (order as any).notas = notas;

    await order.save();
    res.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Error updating monthly order:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Confirmar completado (doble confirmación: compras + estacion)
router.patch('/:id/confirmar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await MonthlyOrder.findByPk(req.params.id);

    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    if (user.rol === 'estacion') {
      // Estacion solo puede confirmar sus propios pedidos
      const orderEstacion = (order as any).estacion;
      if (orderEstacion !== user.estacion && orderEstacion !== user.nombre) {
        return res.status(403).json({ error: 'No autorizado' });
      }
      (order as any).confirmadoEstacion = true;
    } else if (['compras', 'jefe'].includes(user.rol)) {
      (order as any).confirmadoCompras = true;
    } else {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Si ambos confirmaron → completado
    if ((order as any).confirmadoCompras && (order as any).confirmadoEstacion) {
      (order as any).estado = 'completado';
    }

    await order.save();
    res.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Error confirming monthly order:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH - Confirmar completado (compras o estacion)
router.patch('/:id/confirmar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const order = await MonthlyOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    if (user.rol === 'estacion') {
      (order as any).confirmadoEstacion = true;
    } else if (['compras', 'jefe'].includes(user.rol)) {
      (order as any).confirmadoCompras = true;
    } else {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    // If both confirmed, set estado to completado
    if ((order as any).confirmadoEstacion && (order as any).confirmadoCompras) {
      (order as any).estado = 'completado';
    } else if ((order as any).estado === 'borrador') {
      // At least one confirmed → mark as enviado
      (order as any).estado = 'enviado';
    }

    await order.save();
    res.json({ success: true, data: order });
  } catch (error: any) {
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
      return res.status(403).json({ error: 'No tienes permisos para eliminar este pedido' });
    }

    await order.destroy();
    res.json({ success: true, message: 'Pedido eliminado' });
  } catch (error: any) {
    console.error('Error deleting monthly order:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
