import express, { Response } from 'express';
import webpush from 'web-push';
import { protect, AuthRequest } from '../middleware/auth';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

const router = express.Router();

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@grupolavillita.com',
  process.env.VAPID_PUBLIC_KEY || 'BGI03HeR6D59Q5j9LovsymcUxO5ZrjcL9607fbOpacXtGUXB3IsFk8MIj--Bo-G5FqNcCZhdE_Y5SM4Tz9o5Prk',
  process.env.VAPID_PRIVATE_KEY || 'OAglHpXd_04jz8kct-MKXfAZsJp8rEu4Otq5HY5k3d0'
);

router.post('/subscribe', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth || !userId) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    await sequelize.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (:userId, :endpoint, :p256dh, :auth)
       ON DUPLICATE KEY UPDATE user_id = :userId, p256dh = :p256dh, auth = :auth`,
      { replacements: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }, type: QueryTypes.INSERT }
    );

    res.json({ message: 'Suscrito exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error en suscripcion' });
  }
});

router.post('/unsubscribe', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { endpoint } = req.body;

    if (!userId || !endpoint) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    await sequelize.query(
      `DELETE FROM push_subscriptions WHERE user_id = :userId AND endpoint = :endpoint`,
      { replacements: { userId, endpoint }, type: QueryTypes.DELETE }
    );

    res.json({ message: 'Desuscrito' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error desuscribiendo' });
  }
});

export const sendPushToUser = async (userId: number, payload: object) => {
  try {
    const subs = await sequelize.query<{ endpoint: string; p256dh: string; auth: string }>(
      `SELECT ps.endpoint, ps.p256dh, ps.auth
       FROM push_subscriptions ps
       WHERE ps.user_id = :userId`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    const payloadStr = JSON.stringify(payload);

    await sendToSubscriptions(subs, payloadStr);
  } catch (error: any) {
    console.error('Push send error (user):', error.message);
  }
};

export const sendPushToRole = async (
  roles: string[],
  payload: object,
  excludeUserId?: number
) => {
  try {
    const subs = await sequelize.query<{ endpoint: string; p256dh: string; auth: string }>(
      `SELECT ps.endpoint, ps.p256dh, ps.auth
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.rol IN (:roles) AND u.activo = 1
         AND (:excludeUserId IS NULL OR u.id != :excludeUserId)`,
      { replacements: { roles, excludeUserId: excludeUserId ?? null }, type: QueryTypes.SELECT }
    );

    const payloadStr = JSON.stringify(payload);

    await sendToSubscriptions(subs, payloadStr);
  } catch (error: any) {
    console.error('Push send error:', error.message);
  }
};

interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const sendToSubscriptions = async (subs: StoredPushSubscription[], payload: string) => {
  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await sequelize.query(
          'DELETE FROM push_subscriptions WHERE endpoint = :endpoint',
          { replacements: { endpoint: sub.endpoint }, type: QueryTypes.DELETE }
        );
        return;
      }
      throw error;
    }
  }));
};

export { router as pushRoutes };
