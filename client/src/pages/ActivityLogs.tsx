import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import {
  ClipboardDocumentListIcon,
  Bars3Icon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import '../styles/ActivityLogs.css';
import '../styles/Dashboard.css';

interface ActivityLog {
  id: number;
  usuarioId: number | null;
  usuarioNombre: string;
  usuarioRol: string;
  accion: string;
  entidad: string;
  entidadId: number | null;
  detalle: string;
  ip: string;
  createdAt: string;
}

const ACCION_LABELS: Record<string, string> = {
  LOGIN: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Intento fallido',
  ORDEN_CREADA: 'Orden creada',
  ESTADO_CAMBIADO: 'Estado cambiado',
};

const ACCION_COLORS: Record<string, string> = {
  LOGIN: 'log-badge-success',
  LOGIN_FALLIDO: 'log-badge-danger',
  ORDEN_CREADA: 'log-badge-info',
  ESTADO_CAMBIADO: 'log-badge-warning',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActivityLogs() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 50;

  // Filters
  const [filterAccion, setFilterAccion] = useState('');
  const [filterUsuario, setFilterUsuario] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterAccion) params.set('accion', filterAccion);
      if (filterUsuario) params.set('usuarioNombre', filterUsuario);
      if (filterFechaDesde) params.set('fechaDesde', filterFechaDesde);
      if (filterFechaHasta) params.set('fechaHasta', filterFechaHasta);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const res = await api.get(`/activity-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filterAccion, filterUsuario, filterFechaDesde, filterFechaHasta, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const clearFilters = () => {
    setFilterAccion('');
    setFilterUsuario('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    setPage(1);
  };

  if (!['jefe', 'sistemas'].includes(user?.rol || '')) {
    return <div className="logs-forbidden">No tienes acceso a esta sección.</div>;
  }

  return (
    <div className="logs-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="logs-main">
        {/* Mobile menu button */}
        <button className="dashboard-menu-btn lg:hidden" onClick={() => setSidebarOpen(true)}>
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div className="logs-container">
          <div className="logs-header">
            <div>
              <h1><ClipboardDocumentListIcon style={{ width: 28, height: 28 }} /> Logs de Actividad</h1>
              <p className="subtitle">Registro de acciones del sistema — {total} entradas</p>
            </div>
            <button className="logs-filter-btn" onClick={() => setShowFilters(v => !v)}>
              <FunnelIcon className="h-5 w-5" />
              Filtros
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="logs-filters">
              <div className="logs-filters-grid">
                <div className="filter-group">
                  <label>Acción</label>
                  <select value={filterAccion} onChange={e => { setFilterAccion(e.target.value); setPage(1); }}>
                    <option value="">Todas</option>
                    <option value="LOGIN">Inicio de sesión</option>
                    <option value="LOGIN_FALLIDO">Intento fallido</option>
                    <option value="ORDEN_CREADA">Orden creada</option>
                    <option value="ESTADO_CAMBIADO">Estado cambiado</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Usuario</label>
                  <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={filterUsuario}
                    onChange={e => { setFilterUsuario(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="filter-group">
                  <label>Desde</label>
                  <input type="date" value={filterFechaDesde} onChange={e => { setFilterFechaDesde(e.target.value); setPage(1); }} />
                </div>
                <div className="filter-group">
                  <label>Hasta</label>
                  <input type="date" value={filterFechaHasta} onChange={e => { setFilterFechaHasta(e.target.value); setPage(1); }} />
                </div>
              </div>
              <button className="logs-clear-btn" onClick={clearFilters}>
                <XMarkIcon className="h-4 w-4" /> Limpiar filtros
              </button>
            </div>
          )}

          {/* Table */}
          <div className="logs-card">
            {loading ? (
              <div className="logs-loading">Cargando logs...</div>
            ) : logs.length === 0 ? (
              <div className="logs-empty">No hay registros de actividad.</div>
            ) : (
              <div className="logs-table-wrapper">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Acción</th>
                      <th>Detalle</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td className="log-date">{formatDate(log.createdAt)}</td>
                        <td className="log-user">{log.usuarioNombre}</td>
                        <td className="log-rol">{log.usuarioRol}</td>
                        <td>
                          <span className={`log-badge ${ACCION_COLORS[log.accion] || 'log-badge-default'}`}>
                            {ACCION_LABELS[log.accion] || log.accion}
                          </span>
                        </td>
                        <td className="log-detalle">{log.detalle}</td>
                        <td className="log-ip">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="logs-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
              <span>Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
