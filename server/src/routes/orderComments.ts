import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { protect as authMiddleware, AuthRequest } from '../middleware/auth';
import sequelize from '../config/database';
import OrderComment from '../models/OrderComment';
import Order from '../models/Order';
import User from '../models/User';
import Notification from '../models/Notification';
import NotificationService from '../services/notificationService';

const router = Router();
const ns = new NotificationService();

/** Notify relevant users about a new comment */
async function notifyNewComment(order: any, commentorId: number, commentorName: string, texto: string) {
  const preview = texto.substring(0, 80) + (texto.length > 80 ? '…' : '');
  const commentor = await User.findByPk(commentorId, { attributes: ['rol'] });
  const commentorRole = commentor ? (commentor as any).rol : '';

  // Managers for each order type: compras orders → compras+jefe; sistemas orders → sistemas+jefe
  const orderManagerRoles: string[] = order.tipo === 'compras' ? ['compras', 'jefe'] : ['sistemas', 'jefe'];
  const commentorIsManager = orderManagerRoles.includes(commentorRole);

  if (!commentorIsManager) {
    // Non-manager commented → notify the order's responsible role(s)
    await ns.notifyByRoles(orderManagerRoles, {
      tipo: 'COMMENT',
      titulo: '💬 Nuevo mensaje en orden',
      mensaje: `${commentorName} en ${order.folio}: "${preview}"`,
      datos: { orderId: order.id, folio: order.folio },
    }, commentorId);
  } else if (order.usuarioId !== commentorId) {
    // Manager replied → notify order creator
    await ns.notifyUser(order.usuarioId, {
      tipo: 'COMMENT',
      titulo: '💬 Respuesta en tu orden',
      mensaje: `${commentorName} respondió en ${order.folio}: "${preview}"`,
      datos: { orderId: order.id, folio: order.folio },
    });
  }
}

/** Extract @nombre mentions and create notifications */
async function processMentions(texto: string, orderId: number, commentId: number, authorId: number, folio: string) {
  const mentionRegex = /@(\S+)/g;
  const matches = [...texto.matchAll(mentionRegex)];
  if (!matches.length) return;

  const mentioned = new Set<number>();
  for (const match of matches) {
    const username = match[1].toLowerCase();
    const user = await User.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        { [Op.like]: `${username}%` }
      )
    });
    if (user && user.id !== authorId && !mentioned.has(user.id)) {
      mentioned.add(user.id);
      await Notification.create({
        usuarioId: user.id,
        tipo: 'MENTION',
        titulo: 'Te mencionaron en un comentario',
        mensaje: `Te mencionaron en la orden ${folio}: "${texto.substring(0, 80)}${texto.length > 80 ? '...' : ''}"`,
        datos: { orderId, commentId, folio },
        leida: false,
      });
    }
  }
}

// GET /api/orders/:id/comments
router.get('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const [comments, order] = await Promise.all([
      OrderComment.findAll({
        where: { orderId },
        include: [{ model: User, as: 'author', attributes: ['id', 'nombre', 'rol', 'foto'] }],
        order: [['createdAt', 'ASC']],
      }),
      Order.findByPk(orderId, { attributes: ['usuarioId'] }),
    ]);
    res.json({ comments, orderUsuarioId: order?.usuarioId ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener comentarios' });
  }
});

// POST /api/orders/:id/comments
router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const usuarioId = req.user?.id;
    const userRole = req.user?.rol;
    const { texto } = req.body;

    if (!texto?.trim()) {
      return res.status(400).json({ message: 'El comentario no puede estar vacío' });
    }

    // Verify order exists
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });

    // Only order creator or the order's managing role can post comments
    const isCreator = order.usuarioId === usuarioId;
    const orderManagers = order.tipo === 'compras' ? ['compras', 'jefe'] : ['sistemas', 'jefe'];
    const isManagerRole = orderManagers.includes(userRole || '');
    if (!isCreator && !isManagerRole) {
      return res.status(403).json({ message: 'Solo el creador de la orden o el rol responsable puede comentar' });
    }

    const comment = await OrderComment.create({ orderId, usuarioId, texto: texto.trim() });

    // Return with author info
    const full = await OrderComment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'nombre', 'rol', 'foto'] }],
    });

    // Process @mentions in background
    processMentions(texto.trim(), orderId, comment.id, usuarioId!, order.folio).catch(console.error);
    // Notify relevant users about new comment
    notifyNewComment(order, usuarioId!, req.user?.nombre || 'Alguien', texto.trim()).catch(console.error);

    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear comentario' });
  }
});

// DELETE /api/orders/:id/comments/:commentId
router.delete('/:id/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user?.id;
    const userRole = req.user?.rol;

    const comment = await OrderComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

    // Only author or jefe/sistemas can delete
    if (comment.usuarioId !== userId && !['jefe', 'sistemas'].includes(userRole || '')) {
      return res.status(403).json({ message: 'Sin permiso para eliminar este comentario' });
    }

    await comment.destroy();
    res.json({ message: 'Comentario eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar comentario' });
  }
});

export default router;
