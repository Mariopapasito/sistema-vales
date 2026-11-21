import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    estacion?: string;
  };
  userId?: number;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ message: 'Not authorized - No token provided' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

    // Get user from token
    const user = await User.findByPk(decoded.id);

    if (!user || !user.activo) {
      res.status(401).json({ message: 'Not authorized - User not found' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      estacion: user.estacion
    };
    req.userId = user.id;

    // The new RH role has no implicit access to legacy endpoints that allow every logged-in user.
    const pathname = req.originalUrl.split('?')[0];
    if (user.rol === 'rh' && !pathname.startsWith('/api/attendance/') &&
        !pathname.startsWith('/api/auth/') &&
        !(pathname === `/api/users/${user.id}` && ['GET', 'PUT'].includes(req.method))) {
      res.status(403).json({ message: 'RH solo tiene acceso a asistencia y a su perfil.' });
      return;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Not authorized - Invalid token' });
  }
};

// Check if user has required role(s)
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!roles.includes(req.user.rol)) {
      res.status(403).json({
        message: 'Not authorized - Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export default protect;

// Check if user can access calendar (sistemas or jefe only)
export const canAccessCalendar = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }

  if (!['sistemas', 'jefe'].includes(req.user.rol)) {
    res.status(403).json({
      message: 'Not authorized - Only sistemas and jefe can access calendar'
    });
    return;
  }

  next();
};
