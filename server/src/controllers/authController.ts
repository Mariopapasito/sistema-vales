import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activityLogger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email y contraseña requeridos' });
      return;
    }
    const user = await User.findOne({ where: { email, activo: true } } as any);
    if (!user) {
      logActivity({ req, usuarioNombre: email, usuarioRol: '-', accion: 'LOGIN_FALLIDO', entidad: 'auth', detalle: `Intento fallido: ${email}` });
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }
    const valid = await bcrypt.compare(password, (user as any).password);
    if (!valid) {
      logActivity({ req, usuarioId: (user as any).id, usuarioNombre: (user as any).nombre, usuarioRol: (user as any).rol, accion: 'LOGIN_FALLIDO', entidad: 'auth', detalle: `Contraseña incorrecta: ${email}` });
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }
    const accessToken = jwt.sign({ id: (user as any).id }, JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = jwt.sign({ id: (user as any).id }, JWT_REFRESH_SECRET, { expiresIn: '90d' });
    logActivity({ req, usuarioId: (user as any).id, usuarioNombre: (user as any).nombre, usuarioRol: (user as any).rol, accion: 'LOGIN', entidad: 'auth', detalle: `Inicio de sesión exitoso` });
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: (user as any).id,
        nombre: (user as any).nombre,
        email: (user as any).email,
        rol: (user as any).rol,
        estacion: (user as any).estacion,
        foto: (user as any).foto,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error en login', error: error.message });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  res.status(405).json({ message: 'Registro no permitido. Contacta al administrador.' });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(401).json({ message: 'Token requerido' });
      return;
    }
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: number };
    const user = await User.findByPk(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado' });
      return;
    }
    // Rolling refresh: issue both new access + new refresh token so session never expires
    const accessToken = jwt.sign({ id: decoded.id }, JWT_SECRET, { expiresIn: '8h' });
    const newRefreshToken = jwt.sign({ id: decoded.id }, JWT_REFRESH_SECRET, { expiresIn: '90d' });
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ message: 'Token inválido' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user?.id, { attributes: { exclude: ['password'] } });
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

export const testEndpoint = (_req: Request, res: Response): void => {
  res.json({ status: 'ok' });
};
