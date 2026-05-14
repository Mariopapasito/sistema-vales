import { Router } from 'express';
import { AuthRequest, protect, authorize } from '../middleware/auth';
import Material from '../models/Material';
import { Response } from 'express';

const router = Router();

// GET all materials
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const materials = await Material.findAll({
      where: { activo: true },
      order: [['name', 'ASC']],
    });
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Error fetching materials' });
  }
});

// GET material by ID
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    res.json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ message: 'Error fetching material' });
  }
});

// CREATE material (jefe/sistemas only)
router.post('/', protect, authorize('jefe', 'sistemas'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, sku, category, quantity, unit, cost, provider, minStock, description } = req.body;

    if (!name || !category || !unit || !cost) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const material = await Material.create({
      name,
      sku,
      category,
      quantity: quantity || 0,
      unit,
      cost,
      provider,
      minStock: minStock || 5,
      description,
    });

    res.status(201).json(material);
  } catch (error: any) {
    console.error('Error creating material:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'SKU already exists' });
    }
    res.status(500).json({ message: 'Error creating material' });
  }
});

// UPDATE material (jefe/sistemas only)
router.put('/:id', protect, authorize('jefe', 'sistemas'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, sku, category, quantity, unit, cost, provider, minStock, description, activo } = req.body;

    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    await material.update({
      name: name || material.name,
      sku: sku || material.sku,
      category: category || material.category,
      quantity: quantity !== undefined ? quantity : material.quantity,
      unit: unit || material.unit,
      cost: cost || material.cost,
      provider: provider || material.provider,
      minStock: minStock !== undefined ? minStock : (material.minStock || 5),
      description: description || material.description,
      activo: activo !== undefined ? activo : material.activo,
    });

    res.json(material);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ message: 'Error updating material' });
  }
});

// DELETE material (soft delete - marcar como inactivo)
router.delete('/:id', protect, authorize('jefe', 'sistemas'), async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    await material.update({ activo: false });
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ message: 'Error deleting material' });
  }
});

// GET materials with low stock
router.get('/low-stock/alert', protect, authorize('jefe', 'sistemas'), async (req: AuthRequest, res: Response) => {
  try {
    const materials = await Material.findAll({
      where: {
        activo: true,
      },
    });

    const lowStock = materials.filter(m => m.quantity <= (m.minStock || 5));
    res.json(lowStock);
  } catch (error) {
    console.error('Error fetching low stock materials:', error);
    res.status(500).json({ message: 'Error fetching low stock materials' });
  }
});

export default router;
