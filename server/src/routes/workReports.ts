import express from 'express';
import { Response } from 'express';
import WorkReport from '../models/WorkReport';
import Material from '../models/Material';
import MaterialUsage from '../models/MaterialUsage';
import User from '../models/User';
import Order from '../models/Order';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET all reports (admin/sistemas/jefe only)
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const reports = await WorkReport.findAll({
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'nombre', 'rol'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'nombre', 'rol'] },
        { model: Order, as: 'order', attributes: ['id', 'folio'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// GET report by ID
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const report = await WorkReport.findByPk(req.params.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'nombre', 'rol'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'nombre', 'rol'] },
        { model: Order, as: 'order', attributes: ['id', 'folio'] },
      ],
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching report', error: error.message });
  }
});

// POST - Create report
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const {
      orderId,
      station,
      faultCode = '',
      equipmentNumber = '',
      serialNumber = '',
      faultDescription = '',
      actionTaken = '',
      preventionTaken = '',
      attendedBy = '',
    } = req.body;

    // Get the assigned user (the one creating the report - typically sistemas/jefe)
    const currentUser = await User.findByPk(req.userId);

    const report = await WorkReport.create({
      orderId,
      createdById: req.userId,
      assignedToId: req.userId,
      station: station || currentUser?.estacion || '',
      faultCode,
      equipmentNumber,
      serialNumber,
      faultDescription,
      actionTaken,
      preventionTaken,
      attendedBy: attendedBy || currentUser?.nombre || '',
      completed: false,
    });

    res.status(201).json(report);
  } catch (error: any) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Error creating report', error: error.message });
  }
});

// PUT - Update report
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const {
      faultCode,
      equipmentNumber,
      serialNumber,
      faultDescription,
      actionTaken,
      preventionTaken,
      attendedBy,
      completed,
      rating,
      notes,
      materials = [],
    } = req.body;

    const report = await WorkReport.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Update report - only update fields that are provided
    const updateData: any = {};
    
    if (faultCode !== undefined) updateData.faultCode = faultCode;
    if (equipmentNumber !== undefined) updateData.equipmentNumber = equipmentNumber;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (faultDescription !== undefined) updateData.faultDescription = faultDescription;
    if (actionTaken !== undefined) updateData.actionTaken = actionTaken;
    if (preventionTaken !== undefined) updateData.preventionTaken = preventionTaken;
    if (attendedBy !== undefined) updateData.attendedBy = attendedBy;
    if (completed !== undefined) updateData.completed = completed;
    if (rating !== undefined) updateData.rating = rating;
    if (notes !== undefined) updateData.notes = notes;

    await report.update(updateData);

    // Update or create materials
    if (materials && materials.length > 0) {
      // Delete existing materials
      await MaterialUsage.destroy({ where: { workReportId: report.id } });

      // Create new ones
      for (const mat of materials) {
        await MaterialUsage.create({
          workReportId: report.id,
          materialId: mat.materialId,
          quantity: mat.quantity,
          quantityReturned: mat.quantityReturned || 0,
          costTotal: mat.costTotal,
        });
      }
    }

    const updatedReport = await WorkReport.findByPk(report.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'nombre', 'rol'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'nombre', 'rol'] },
      ],
    });

    res.json({
      message: 'Report updated successfully',
      report: updatedReport,
    });
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ message: 'Error updating report', error: error.message });
  }
});

// GET reports for specific user
router.get('/user/:userId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const reports = await WorkReport.findAll({
      where: { createdById: req.params.userId },
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'nombre', 'rol'] },
        { model: Order, as: 'order', attributes: ['id', 'folio'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching user reports', error: error.message });
  }
});

// DELETE report
router.delete('/:id', protect, authorize('jefe', 'sistemas'), async (req: AuthRequest, res: Response) => {
  try {
    const report = await WorkReport.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Delete associated materials
    await MaterialUsage.destroy({ where: { workReportId: report.id } });

    await report.destroy();
    res.json({ message: 'Report deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting report', error: error.message });
  }
});

export default router;
