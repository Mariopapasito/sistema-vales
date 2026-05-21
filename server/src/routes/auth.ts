import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, register, refreshToken, getMe, testEndpoint } from '../controllers/authController';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts
});

router.post('/login', loginLimiter, login);
router.post('/register', register);
router.post('/refresh-token', refreshToken);
router.get('/me', getMe);
router.post('/test', testEndpoint);

export default router;
