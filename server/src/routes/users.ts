import express, { Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

const canManageUsers = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || !['jefe', 'sistemas'].includes(req.user.rol)) {
    res.status(403).json({ message: 'No autorizado' });
    return;
  }
  next();
};

// POST create user (jefe y sistemas)
router.post('/', protect, canManageUsers, async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, email, password, rol, estacion } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Ya existe un usuario con ese email' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ nombre, email, password: hashedPassword, rol: rol || 'estacion', estacion });
    res.status(201).json({ message: 'Usuario creado', user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creando usuario' });
  }
});

// GET all users
router.get('/', protect, canManageUsers, async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      where: { activo: true },
      order: [['nombre', 'ASC']],
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// GET single user
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      estacion: user.estacion,
      foto: user.foto,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// UPDATE user profile
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, estacion, foto } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Solo el propio usuario o jefe/sistemas pueden editar
    const isAdminRole = req.user && ['jefe', 'sistemas'].includes(req.user.rol);
    const isOwnProfile = req.userId === parseInt(req.params.id);
    if (!isOwnProfile && !isAdminRole) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Update fields
    if (nombre) user.nombre = nombre;
    if (estacion) user.estacion = estacion;
    if (foto !== undefined) {
      // Validate foto is a valid base64 string or null
      if (foto === null) {
        (user as any).foto = null;
      } else if (typeof foto === 'string' && foto.length > 0) {
        (user as any).foto = foto;
      }
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        estacion: user.estacion,
        foto: user.foto,
        activo: user.activo,
      },
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// DELETE user (jefe y sistemas)
router.delete('/:id', protect, canManageUsers, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.activo = false;
    await user.save();

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

export default router;
