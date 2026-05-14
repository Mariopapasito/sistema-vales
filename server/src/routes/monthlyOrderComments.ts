import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { protect as authMiddleware, AuthRequest } from '../middleware/auth';
import sequelize from '../config/database';
import MonthlyOrderComment from '../models/MonthlyOrderComment';
import MonthlyOrder from '../models/MonthlyOrder';
import User from '../models/User';
import Notification from '../models/Notification';

const router = Router();

async function processMentions(
  texto: string,
  monthlyOrderId: number,
  commentId: number,
  authorId: number,
  folio: string
) {
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
      ),
    });
    if (user && user.id !== authorId && !mentioned.has(user.id)) {
      mentioned.add(user.id);
      await Notification.create({
        usuarioId: user.id,
        tipo: 'MENTION',
        titulo: 'Te mencionaron en un comentario',
        mensaje: `Te mencionaron en el pedido mensual ${folio}: "${texto.substring(0, 80)}${texto.length > 80 ? '...' : ''}"`,
        datos: { monthlyOrderId, commentId, folio },
        leida: false,
      });
    }
  }
}

// GET /api/monthly-orders/:id/comments
router.get('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const monthlyOrderId = parseInt(req.params.id);
    const [comments, order] = await Promise.all([
      MonthlyOrderComment.findAll({
        where: { monthlyOrderId },
        include: [{ model: User, as: 'author', attributes: ['id', 'nombre', 'rol', 'foto'] }],
        order: [['createdAt', 'ASC']],
      }),
      MonthlyOrder.findByPk(monthlyOrderId, { attributes: ['createdBy'] }),
    ]);
    res.json({ comments, orderUsuarioId: (order as any)?.createdBy ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener comentarios' });
  }
});

// POST /api/monthly-orders/:id/comments
router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const monthlyOrderId = parseInt(req.params.id);
    const usuarioId = req.user?.id;
    const userRole = req.user?.rol;
    const { texto } = req.body;

    if (!texto?.trim()) {
      return res.status(400).json({ message: 'El comentario no puede estar vacío' });
    }

    const order = await MonthlyOrder.findByPk(monthlyOrderId);
    if (!order) return res.status(404).json({ message: 'Pedido mensual no encontrado' });

    const isCreator = (order as any).createdBy === usuarioId;
    const isManagerRole = ['sistemas', 'jefe', 'compras'].includes(userRole || '');
    if (!isCreator && !isManagerRole) {
      return res.status(403).json({ message: 'Sin permiso para comentar en este pedido' });
    }

    const comment = await MonthlyOrderComment.create({ monthlyOrderId, usuarioId, texto: texto.trim() });

    const full = await MonthlyOrderComment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'nombre', 'rol', 'foto'] }],
    });

    processMentions(texto.trim(), monthlyOrderId, comment.id, usuarioId!, (order as any).folio).catch(console.error);

    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear comentario' });
  }
});

// DELETE /api/monthly-orders/:id/comments/:commentId
router.delete('/:id/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user?.id;
    const userRole = req.user?.rol;

    const comment = await MonthlyOrderComment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

    if (comment.usuarioId !== userId && !['jefe', 'sistemas', 'compras'].includes(userRole || '')) {
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
