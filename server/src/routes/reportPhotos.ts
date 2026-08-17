import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import ReportPhoto from '../models/ReportPhoto';
import User from '../models/User';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Usar memoria en lugar de disco (funciona en Railway y cualquier plataforma)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  },
});

// GET /reports - Obtener todos los reportes (SIN imágenes para no sobrecargar)
router.get('/', protect, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    const requestedTipo = typeof req.query.tipo === 'string' ? req.query.tipo : undefined;

    if (!['sistemas', 'compras', 'jefe', 'estacion'].includes(user?.rol || '')) {
      return res.status(403).json({ error: 'No tienes permisos para ver reportes' });
    }

    const whereClause: any = {};

    if (requestedTipo && ['estacion', 'jefe'].includes(requestedTipo)) {
      whereClause.tipo = requestedTipo;
    }

    if (user?.rol === 'estacion') {
      whereClause.userId = user.id;
      whereClause.tipo = 'estacion';
    } else if (user?.rol === 'jefe' && !requestedTipo) {
      whereClause.tipo = 'estacion';
    } else if (user?.rol === 'jefe' && requestedTipo === 'jefe') {
      whereClause.tipo = 'jefe';
    } else if (user?.rol !== 'jefe' && user?.rol !== 'sistemas' && user?.rol !== 'compras') {
      whereClause.userId = user?.id;
    }

    const reports = await ReportPhoto.findAll({
      where: whereClause,
      attributes: ['id', 'titulo', 'descripcion', 'tipo', 'userId', 'createdAt', 'updatedAt'],
      include: [
        {
          model: User,
          attributes: ['id', 'nombre', 'rol', 'estacion'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const reportsWithCount = reports.map((r: any) => {
      const plain = r.get({ plain: true });
      return plain;
    });

    res.json(reportsWithCount);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

// GET /reports/:id - Obtener un reporte con sus imágenes completas
router.get('/:id', protect, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!['sistemas', 'compras', 'jefe', 'estacion'].includes(user?.rol || '')) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const report = await ReportPhoto.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'nombre', 'rol', 'estacion'] }],
    });

    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });

    if (user?.rol === 'estacion' && (report as any).userId !== user?.id) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    if (user?.rol !== 'jefe' && user?.rol !== 'sistemas' && user?.rol !== 'compras' && user?.rol !== 'estacion') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    if (user?.rol !== 'jefe' && user?.rol !== 'sistemas' && user?.rol !== 'compras' && (report as any).userId !== user?.id) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    res.json(report);
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});

// POST /reports - Crear nuevo reporte con múltiples imágenes (base64)
router.post('/', protect, upload.array('imagenes', 10), async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    const requestedTipo = typeof req.body.tipo === 'string' ? req.body.tipo : 'estacion';

    if (!['sistemas', 'compras', 'jefe', 'estacion'].includes(user?.rol || '')) {
      return res.status(403).json({ error: 'No tienes permisos para crear reportes' });
    }

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'Al menos una imagen es requerida' });
    }

    const tipo = user?.rol === 'estacion' ? 'estacion' : requestedTipo === 'jefe' ? 'jefe' : 'estacion';

    if (user?.rol === 'estacion' && tipo !== 'estacion') {
      return res.status(403).json({ error: 'Las estaciones solo pueden enviar bitácoras de estación' });
    }

    const { titulo, descripcion, imageDescriptions } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    let descriptions: string[] = [];
    if (imageDescriptions) {
      try {
        descriptions = typeof imageDescriptions === 'string' ? JSON.parse(imageDescriptions) : imageDescriptions;
      } catch (e) {
        descriptions = [];
      }
    }

    const imagenes = (req.files as Express.Multer.File[]).map((file, index) => ({
      url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      descripcion: descriptions[index] || '',
    }));

    const report = await ReportPhoto.create({
      titulo,
      descripcion: descripcion || '',
      imagenes,
      tipo,
      userId: user?.id || 0,
    });

    const reportWithUser = await ReportPhoto.findByPk(report.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'nombre', 'rol', 'estacion'],
        },
      ],
    });

    res.status(201).json(reportWithUser);
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Error al crear reporte' });
  }
});

// DELETE /reports/:id - Eliminar reporte
router.delete('/:id', protect, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    const { id } = req.params;

    const report = await ReportPhoto.findByPk(id);

    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    if (report.userId !== user?.id && !['jefe', 'sistemas'].includes(user?.rol || '')) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este reporte' });
    }

    await report.destroy();

    res.json({ message: 'Reporte eliminado exitosamente' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: 'Error al eliminar reporte' });
  }
});

export default router;
