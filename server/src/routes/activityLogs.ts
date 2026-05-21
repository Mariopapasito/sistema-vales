import express from 'express';
import { Op } from 'sequelize';
import ActivityLog from '../models/ActivityLog';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

const canView = authorize('jefe', 'sistemas');

// GET /api/activity-logs
router.get('/', protect, canView, async (req: AuthRequest, res) => {
  try {
    const { accion, entidad, usuarioNombre, fechaDesde, fechaHasta, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};

    if (accion) where.accion = { [Op.like]: `%${accion}%` };
    if (entidad) where.entidad = entidad;
    if (usuarioNombre) where.usuarioNombre = { [Op.like]: `%${usuarioNombre}%` };

    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt[Op.gte] = new Date(fechaDesde as string);
      if (fechaHasta) {
        const hasta = new Date(fechaHasta as string);
        hasta.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = hasta;
      }
    }

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    res.json({
      logs,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener logs', error: error.message });
  }
});

export default router;
