import express from 'express';
import { Op } from 'sequelize';
import CalendarEvent from '../models/CalendarEvent';
import User from '../models/User';
import { protect, canAccessCalendar, AuthRequest } from '../middleware/auth';

const router = express.Router();

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Obtener eventos de una semana (acepta ?weekStart=YYYY-MM-DD, default = semana actual)
router.get('/', protect, canAccessCalendar, async (req, res) => {
  try {
    const base = req.query.weekStart ? new Date(req.query.weekStart as string) : new Date();
    const { start, end } = getWeekBounds(base);
    const events = await CalendarEvent.findAll({
      where: { fechaInicio: { [Op.between]: [start, end] } },
      order: [['fechaInicio', 'ASC']]
    });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Historial: todas las semanas pasadas agrupadas
router.get('/history', protect, canAccessCalendar, async (req, res) => {
  try {
    const { start: thisWeekStart } = getWeekBounds(new Date());
    const events = await CalendarEvent.findAll({
      where: { fechaInicio: { [Op.lt]: thisWeekStart } },
      order: [['fechaInicio', 'DESC']]
    });

    // Group by ISO week key "YYYY-WNN"
    const grouped: Record<string, { weekLabel: string; weekStart: string; events: any[] }> = {};
    for (const ev of events) {
      const d = new Date(ev.fechaInicio);
      const { start } = getWeekBounds(d);
      const key = start.toISOString().slice(0, 10);
      if (!grouped[key]) {
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        grouped[key] = {
          weekLabel: `${start.getDate()} – ${end.getDate()} de ${months[end.getMonth()]} ${end.getFullYear()}`,
          weekStart: key,
          events: [],
        };
      }
      grouped[key].events.push(ev);
    }

    res.json(Object.values(grouped));
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching history' });
  }
});

router.post('/', protect, canAccessCalendar, async (req: AuthRequest, res) => {
  try {
    const { titulo, descripcion, fechaInicio, duracion, color, categoria } = req.body;

    const event = await CalendarEvent.create({
      titulo: titulo || null,
      descripcion,
      fechaInicio,
      duracion: duracion || 60,
      color: color || null,
      categoria,
      createdBy: req.user?.id,
      completed: false,
    });

    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating event' });
  }
});

// Actualizar evento
router.put('/:id', protect, canAccessCalendar, async (req, res) => {
  try {
    const { titulo, descripcion, fechaInicio, duracion, color, categoria, completed } = req.body;
    const event = await CalendarEvent.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.update({
      titulo: titulo !== undefined ? titulo : event.titulo,
      descripcion: descripcion !== undefined ? descripcion : event.descripcion,
      fechaInicio: fechaInicio || event.fechaInicio,
      duracion: duracion || event.duracion,
      color: color !== undefined ? color : event.color,
      categoria: categoria || event.categoria,
      completed: completed !== undefined ? completed : event.completed,
    });

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating event' });
  }
});

// Toggle completion de un evento
router.patch('/:id/complete', protect, canAccessCalendar, async (req, res) => {
  try {
    const event = await CalendarEvent.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.update({
      completed: !event.completed,
    });

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating event' });
  }
});

// Eliminar evento
router.delete('/:id', protect, canAccessCalendar, async (req, res) => {
  try {
    const event = await CalendarEvent.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.destroy();
    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting event' });
  }
});

export default router;
