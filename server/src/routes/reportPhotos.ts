import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ReportPhoto from '../models/ReportPhoto';
import User from '../models/User';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Configurar multer para guardar imágenes
const uploadsDir = path.join(__dirname, '../../public/reports');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  },
});

// GET /report-photos - Obtener todos los reportes
router.get('/', protect, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    
    if (!['sistemas', 'compras', 'jefe'].includes(user?.rol || '')) {
      return res.status(403).json({ error: 'No tienes permisos para ver reportes' });
    }

    // Jefe ve todos; sistemas y compras solo ven los suyos
    const whereClause = user?.rol === 'jefe' ? {} : { userId: user?.id };

    const reports = await ReportPhoto.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'nombre', 'rol'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

// POST /report-photos - Crear nuevo reporte con múltiples imágenes
router.post('/', protect, upload.array('imagenes', 10), async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    
    // Verificar permisos
    if (!['sistemas', 'compras', 'jefe'].includes(user?.rol || '')) {
      return res.status(403).json({ error: 'No tienes permisos para crear reportes' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Al menos una imagen es requerida' });
    }

    const { titulo, descripcion, imageDescriptions } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    // Parsear descripciones de imágenes si es string JSON
    let descriptions: string[] = [];
    if (imageDescriptions) {
      try {
        descriptions = typeof imageDescriptions === 'string' ? JSON.parse(imageDescriptions) : imageDescriptions;
      } catch (e) {
        descriptions = [];
      }
    }

    // Crear array de imágenes con descripciones
    const imagenes = (req.files as Express.Multer.File[]).map((file, index) => ({
      url: `/reports/${file.filename}`,
      descripcion: descriptions[index] || '',
    }));

    const report = await ReportPhoto.create({
      titulo,
      descripcion: descripcion || '',
      imagenes,
      userId: user?.id || 0,
    });

    // Cargar usuario
    const reportWithUser = await ReportPhoto.findByPk(report.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'nombre', 'rol'],
        },
      ],
    });

    res.status(201).json(reportWithUser);
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Error al crear reporte' });
  }
});

// DELETE /report-photos/:id - Eliminar reporte
router.delete('/:id', protect, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    const { id } = req.params;

    const report = await ReportPhoto.findByPk(id);

    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Verificar que el usuario sea el dueño o admin
    if (report.userId !== user?.id && !['jefe', 'sistemas'].includes(user?.rol || '')) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este reporte' });
    }

    // Eliminar archivos si existen
    const imagenes = (report.imagenes as any) || [];
    imagenes.forEach((img: any) => {
      const filePath = path.join(__dirname, '../../public', img.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await report.destroy();

    res.json({ message: 'Reporte eliminado exitosamente' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: 'Error al eliminar reporte' });
  }
});

export default router;
