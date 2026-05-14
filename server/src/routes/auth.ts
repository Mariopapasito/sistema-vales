import express from 'express';
import { login, register, refreshToken, getMe, testEndpoint } from '../controllers/authController';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/refresh-token', refreshToken);
router.get('/me', getMe);
router.post('/test', testEndpoint);

export default router;
