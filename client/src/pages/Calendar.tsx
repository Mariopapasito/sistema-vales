import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon, XMarkIcon, Bars3Icon,
} from '@heroicons/react/24/outline';
import '../styles/Calendar.css';

interface CalendarEvent {
  id: number;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  color: string | null;
  categoria: string;
  completed: boolean;
  completado?: boolean;
}

interface ValeItem {
  id: number;
  folio: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  createdAt: string;
}

const CATEGORIES = [
  { key: 'mtto-prev',   label: 'MTTO PREV',            color: '#f59e0b', bg: '#fef3c7' },
  { key: 'correctivo',  label: 'Mtto Correctivo',       color: '#ef4444', bg: '#fee2e2' },
  { key: 'actividades', label: 'Actividades la Villita', color: '#22c55e', bg: '#dcfce7' },
  { key: 'general',     label: 'General',               color: '#3b82f6', bg: '#dbeafe' },
];

const PRIORIDAD_COLOR: Record<string, string> = {
  Alta: '#ef4444', Paro: '#7c3aed', Correctivo: '#f97316', Baja: '#3b82f6',
};

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MAX_PER_DAY = 6;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export const Calendar: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const canEdit = user?.rol === 'jefe' || user?.rol === 'sistemas';

  const [tab, setTab] = useState<'current'>('current');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [vales, setVales] = useState<ValeItem[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [form, setForm] = useState({ titulo: '', categoria: 'general', color: '' });
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getWeekStart(new Date()));

  useEffect(() => {
    fetchEvents();
    fetchVales();
  }, [weekStart]);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/calendar', { params: { weekStart: toDateStr(weekStart) } });
      setEvents(res.data || []);
    } catch (e) {
      console.error('Error fetching events:', e);
    }
  };

  const fetchVales = async () => {
    try {
      const res = await api.get('/orders');
      const orders = Array.isArray(res.data) ? res.data : (res.data?.orders || res.data?.data || []);
      setVales(orders.filter((o: any) => o.tipo === 'sistemas'));
    } catch (e) {
      console.error('Error fetching orders for calendar:', e);
    }
  };

  const getCalendarEventsForDay = (date: Date): CalendarEvent[] =>
    events.filter(e => e.fechaInicio && e.fechaInicio.slice(0, 10) === toDateStr(date));

  const getValesForDay = (date: Date): ValeItem[] =>
    vales.filter(v => v.createdAt && v.createdAt.slice(0, 10) === toDateStr(date));

  const getTotalForDay = (date: Date) =>
    getCalendarEventsForDay(date).length + getValesForDay(date).length;

  const getCatStyle = (event: CalendarEvent) => {
    const cat = CATEGORIES.find(c => c.key === event.categoria) || CATEGORIES[3];
    const clr = event.color || cat.color;
    return { borderColor: clr, borderLeftColor: clr, background: cat.bg };
  };

  const handleDayClick = (date: Date) => {
    if (!canEdit) return;
    if (getTotalForDay(date) >= MAX_PER_DAY) return;
    setSelectedDate(toDateStr(date));
    setEditEvent(null);
    setForm({ titulo: '', categoria: 'general', color: '' });
    setShowModal(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setEditEvent(event);
    setForm({ titulo: event.titulo || '', categoria: event.categoria || 'general', color: event.color || '' });
    setSelectedDate(event.fechaInicio.slice(0, 10));
    setShowModal(true);
  };

  const handleToggle = async (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      await api.patch(`/calendar/${event.id}/complete`);
      fetchEvents();
    } catch (err) {
      console.error('Error toggling completion:', err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (!window.confirm('Eliminar esta tarea?')) return;
    try {
      await api.delete(`/calendar/${id}`);
      setEvents(ev => ev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const handleDeleteVale = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (!window.confirm('Eliminar esta orden?')) return;
    try {
      await api.delete(`/orders/${id}`);
      setVales(v => v.filter(vale => vale.id !== id));
    } catch (err) {
      console.error('Error deleting vale:', err);
    }
  };

  const handleToggleVale = async (vale: ValeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      const newEstado = vale.estado === 'Completada' ? 'Sin iniciar' : 'Completada';
      await api.patch(`/orders/${vale.id}/estado`, { estado: newEstado });
      setVales(v => v.map(item => item.id === vale.id ? { ...item, estado: newEstado } : item));
    } catch (err) {
      console.error('Error toggling vale:', err);
    }
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) return;
    setLoading(true);
    try {
      const cat = CATEGORIES.find(c => c.key === form.categoria) || CATEGORIES[3];
      const payload = {
        titulo: form.titulo,
        descripcion: form.titulo,
        fechaInicio: selectedDate,
        categoria: form.categoria,
        color: form.color || cat.color,
        duracion: 60,
      };
      if (editEvent) {
        await api.put(`/calendar/${editEvent.id}`, payload);
      } else {
        await api.post('/calendar', payload);
      }
      fetchEvents();
      setShowModal(false);
    } catch (err) {
      console.error('Error saving event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('calEventId', String(id));
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDate(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    const calEventId = parseInt(e.dataTransfer.getData('calEventId'));
    if (!calEventId || isNaN(calEventId)) return;

    const targetStr = toDateStr(targetDate);
    const event = events.find(ev => ev.id === calEventId);
    if (!event || event.fechaInicio.slice(0, 10) === targetStr) return;
    if (getTotalForDay(targetDate) >= MAX_PER_DAY) {
      alert(`Máximo ${MAX_PER_DAY} actividades por día`);
      return;
    }
    setEvents(evs => evs.map(ev => ev.id === calEventId ? { ...ev, fechaInicio: targetStr } : ev));
    try {
      await api.put(`/calendar/${calEventId}`, {
        titulo: event.titulo,
        descripcion: event.descripcion,
        fechaInicio: targetStr,
        categoria: event.categoria,
        color: event.color,
        duracion: 60,
      });
    } catch (err) {
      console.error('Error moving event:', err);
      fetchEvents();
    }
  };



  const today = toDateStr(new Date());
  const weekLabel = `${weekDays[0].getDate()} - ${weekDays[6].getDate()} de ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  const goToPrevWeek = () => setWeekStart(prev => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart(prev => addDays(prev, 7));
  const goToCurrentWeek = () => setWeekStart(getWeekStart(new Date()));

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="dashboard-main">
        
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-menu-btn"
            style={{
              padding: '0.6rem 0.8rem',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              display: 'none',
            }}
          >
            <Bars3Icon style={{ width: '20px', height: '20px' }} />
          </button>
          </div>
<div className="dashboard-container cal-container">

          {/* Top bar */}
          <div className="cal-top-bar">
            <h1 className="cal-title">Calendario</h1>
          </div>

          <>
              {/* Week nav */}
              <div className="cal-week-row">
                <div className="cal-week-nav">
                  <button className="cal-nav-btn" onClick={goToPrevWeek} title="Semana anterior">
                    <ChevronLeftIcon style={{ width: 18, height: 18 }} />
                  </button>
                  <span className="cal-week-label">{weekLabel}</span>
                  <button className="cal-nav-btn" onClick={goToNextWeek} title="Semana siguiente">
                    <ChevronRightIcon style={{ width: 18, height: 18 }} />
                  </button>
                  {!isCurrentWeek && (
                    <button className="cal-nav-btn cal-nav-btn--today" onClick={goToCurrentWeek}>
                      Hoy
                    </button>
                  )}
                </div>

                {/* Legend */}
                <div className="cal-legend">
                  {CATEGORIES.map(cat => (
                    <div key={cat.key} className="cal-legend-item">
                      <span className="cal-legend-dot" style={{ background: cat.color }} />
                      <span>{cat.label}</span>
                    </div>
                  ))}
                  <div className="cal-legend-item cal-legend-sep">
                    <span className="cal-legend-dot cal-legend-dot--vale" />
                    <span>Vale asignado</span>
                  </div>
                </div>
              </div>

              {/* Weekly Grid */}
              <div className="cal-grid">
                {weekDays.map((day, i) => {
                  const isSunday = i === 6;
                  const isToday = toDateStr(day) === today;
                  const dateStr = toDateStr(day);
                  const calItems = getCalendarEventsForDay(day);
                  const valeItems = getValesForDay(day);
                  const total = calItems.length + valeItems.length;
                  const isFull = total >= MAX_PER_DAY;
                  const isDragTarget = dragOverDate === dateStr && !isSunday;

                  return (
                    <div
                      key={i}
                      className={['cal-col', isToday ? 'cal-col--today' : '', isSunday ? 'cal-col--sunday' : '', isDragTarget ? 'cal-col--dragover' : ''].filter(Boolean).join(' ')}
                      onDragOver={(e) => !isSunday && handleDragOver(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => !isSunday && handleDrop(e, day)}
                      onClick={() => !isSunday && handleDayClick(day)}
                    >
                      <div className={['cal-day-header', isToday ? 'cal-day-header--today' : '', isSunday ? 'cal-day-header--sunday' : ''].filter(Boolean).join(' ')}>
                        <span className="cal-day-num">{day.getDate()}</span>
                        <span className="cal-day-name">{DAY_NAMES[i]} · {MONTH_NAMES[day.getMonth()]}</span>
                        {isSunday && <span className="cal-day-badge">No laboral</span>}
                        {isFull && !isSunday && <span className="cal-day-badge cal-day-badge--full">{total}/{MAX_PER_DAY}</span>}
                      </div>

                      <div className="cal-tasks">
                        {calItems.map(ev => {
                          const isDone = ev.completed || ev.completado;
                          return (
                            <div
                              key={`ev-${ev.id}`}
                              className={['cal-task', isDone ? 'cal-task--done' : ''].filter(Boolean).join(' ')}
                              style={getCatStyle(ev)}
                              draggable={canEdit}
                              onDragStart={(e) => canEdit && handleDragStart(e, ev.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => handleEventClick(ev, e)}
                            >
                              <div className="cal-task-row">
                                {canEdit && (
                                  <input
                                    type="checkbox"
                                    className="cal-task-check"
                                    checked={!!isDone}
                                    readOnly
                                    onClick={(e) => { e.stopPropagation(); handleToggle(ev, e as any); }}
                                  />
                                )}
                                <span className="cal-task-text">{ev.titulo}</span>
                                {canEdit && (
                                  <button className="cal-task-del" onClick={(e) => handleDelete(ev.id, e)}>
                                    <TrashIcon style={{ width: 12, height: 12 }} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {valeItems.map(vale => {
                          const isDone = vale.estado === 'Completada';
                          return (
                            <div
                              key={`vale-${vale.id}`}
                              className={['cal-task', 'cal-task--vale', isDone ? 'cal-task--done' : ''].filter(Boolean).join(' ')}
                              style={{ borderColor: PRIORIDAD_COLOR[vale.prioridad] || '#64748b', borderLeftColor: PRIORIDAD_COLOR[vale.prioridad] || '#64748b', background: '#faf5ff' }}
                              title={`${vale.folio} — ${vale.descripcion}`}
                            >
                              <div className="cal-task-row">
                                {canEdit && (
                                  <input
                                    type="checkbox"
                                    className="cal-task-check"
                                    checked={!!isDone}
                                    readOnly
                                    onClick={(e) => { e.stopPropagation(); handleToggleVale(vale, e as any); }}
                                  />
                                )}
                                <span className="cal-task-badge" style={{ background: PRIORIDAD_COLOR[vale.prioridad] || '#64748b' }}>
                                  {vale.folio}
                                </span>
                                <span className="cal-task-text">{vale.descripcion}</span>
                                {canEdit && (
                                  <span title="Las órdenes se gestionan desde el panel principal" style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 'auto', cursor: 'default' }}>
                                    ver panel
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {canEdit && !isSunday && !isFull && (
                          <button className="cal-add-task" onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}>
                            <PlusIcon style={{ width: 12, height: 12 }} /> Agregar
                          </button>
                        )}
                        {isFull && !isSunday && <div className="cal-day-full-msg">Máx. {MAX_PER_DAY} actividades</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>

          </div>
      </main>

      {showModal && (
        <div className="cal-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h2>{editEvent ? 'Editar tarea' : 'Nueva tarea'}</h2>
              <button className="cal-modal-close" onClick={() => setShowModal(false)}>
                <XMarkIcon style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div className="cal-modal-body">
              <div className="cal-field">
                <label>Fecha</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div className="cal-field">
                <label>Descripción de la tarea</label>
                <textarea rows={3} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Revisar impresoras en almacén..." />
              </div>
              <div className="cal-field">
                <label>Categoría</label>
                <div className="cal-cat-grid">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      className={['cal-cat-btn', form.categoria === cat.key ? 'cal-cat-btn--active' : ''].filter(Boolean).join(' ')}
                      style={{ borderColor: cat.color, background: form.categoria === cat.key ? cat.bg : 'white' }}
                      onClick={() => setForm({ ...form, categoria: cat.key, color: cat.color })}
                    >
                      <span className="cal-cat-dot" style={{ background: cat.color }} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="cal-modal-footer">
              <button className="cal-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="cal-btn-save" onClick={handleSave} disabled={loading || !form.titulo.trim()}>
                {loading ? 'Guardando...' : editEvent ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
