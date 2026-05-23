import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { protect, AuthRequest } from '../middleware/auth';
import DirectMessage from '../models/DirectMessage';
import User from '../models/User';
import NotificationService from '../services/notificationService';
import sequelize from '../config/database';

const router = Router();
const ns = new NotificationService();

// GET /messages/users — list all users (to start a new DM)
router.get('/users', protect, async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const users = await User.findAll({
      where: { activo: true, id: { [Op.ne]: myId } },
      attributes: ['id', 'nombre', 'rol', 'estacion', 'foto'],
      order: [['nombre', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo usuarios' });
  }
});

// GET /messages/conversations — list all DM conversations for current user
router.get('/conversations', protect, async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;

    // Get last message per conversation partner
    const rows = await sequelize.query(`
      SELECT
        dm.*,
        u_from.nombre   AS fromNombre,
        u_from.rol      AS fromRol,
        u_from.foto     AS fromFoto,
        u_to.nombre     AS toNombre,
        u_to.rol        AS toRol,
        u_to.foto       AS toFoto,
        (SELECT COUNT(*) FROM direct_messages ux
         WHERE ux.leido = 0 AND ux.toUserId = :myId
           AND ux.fromUserId = CASE WHEN dm.fromUserId = :myId THEN dm.toUserId ELSE dm.fromUserId END
        ) AS unread
      FROM direct_messages dm
      JOIN users u_from ON u_from.id = dm.fromUserId
      JOIN users u_to   ON u_to.id   = dm.toUserId
      INNER JOIN (
        SELECT
          LEAST(fromUserId, toUserId)    AS u1,
          GREATEST(fromUserId, toUserId) AS u2,
          MAX(id) AS maxId
        FROM direct_messages
        WHERE fromUserId = :myId OR toUserId = :myId
        GROUP BY u1, u2
      ) latest ON dm.id = latest.maxId
      ORDER BY dm.createdAt DESC
    `, { replacements: { myId }, type: 'SELECT' as any });

    const conversations = (rows as any[]).map(r => {
      const partnerId = r.fromUserId === myId ? r.toUserId : r.fromUserId;
      const partnerNombre = r.fromUserId === myId ? r.toNombre : r.fromNombre;
      const partnerRol = r.fromUserId === myId ? r.toRol : r.fromRol;
      const partnerFoto = r.fromUserId === myId ? r.toFoto : r.fromFoto;
      return {
        partnerId,
        partnerNombre,
        partnerRol,
        partnerFoto,
        lastMessage: { texto: r.texto, fromMe: r.fromUserId === myId, createdAt: r.createdAt },
        unread: Number(r.unread),
      };
    });

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo conversaciones' });
  }
});

// GET /messages/:userId — get all messages between me and :userId
router.get('/:userId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const otherId = parseInt(req.params.userId);

    // Mark received messages as read
    await DirectMessage.update(
      { leido: true },
      { where: { fromUserId: otherId, toUserId: myId, leido: false } }
    );

    const messages = await DirectMessage.findAll({
      where: {
        [Op.or]: [
          { fromUserId: myId, toUserId: otherId },
          { fromUserId: otherId, toUserId: myId },
        ],
      },
      include: [
        { model: User, as: 'from', attributes: ['id', 'nombre', 'rol', 'foto'] },
      ],
      order: [['createdAt', 'ASC']],
      limit: 200,
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo mensajes' });
  }
});

// POST /messages/:userId — send a DM to :userId
router.post('/:userId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const toId = parseInt(req.params.userId);
    const { texto } = req.body;

    if (!texto?.trim()) return res.status(400).json({ message: 'Mensaje vacío' });

    const target = await User.findByPk(toId, { attributes: ['id', 'nombre', 'activo'] });
    if (!target || !(target as any).activo) return res.status(404).json({ message: 'Usuario no encontrado' });

    const msg = await DirectMessage.create({ fromUserId: myId, toUserId: toId, texto: texto.trim() });

    const full = await DirectMessage.findByPk(msg.id, {
      include: [{ model: User, as: 'from', attributes: ['id', 'nombre', 'rol', 'foto'] }],
    });

    // Notify recipient
    const senderName = req.user!.nombre;
    const preview = texto.trim().substring(0, 80) + (texto.trim().length > 80 ? '…' : '');
    ns.notifyUser(toId, {
      tipo: 'COMMENT',
      titulo: `💬 Mensaje de ${senderName}`,
      mensaje: preview,
      datos: { dmFromUserId: myId, senderName },
    }).catch(console.error);

    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ message: 'Error enviando mensaje' });
  }
});

export default router;
