import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import NotificationCenter from '../components/NotificationCenter';
import SearchFilters, { FilterValues } from '../components/SearchFilters';
import { exportToExcel, exportToPDF } from '../utils/exportOrders';
import SignatureModal from '../components/SignatureModal';

import api from '../services/api';
import { OrderHistory } from '../components/OrderHistory';
import {
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
  UserIcon,
  SparklesIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PauseCircleIcon,
  QueueListIcon,
  BellAlertIcon,
  HandThumbUpIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';
import '../styles/Notifications.css';
import '../styles/SearchFilters.css';

interface Order {
  id: number;
  folio: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  tipo: string;
  localizacion: string;
  confirmadoEstacion: boolean;
  confirmadoProveedor: boolean;
  User?: { nombre: string; estacion: string; rol: string };
  historialCambios?: any[];
  createdAt: string;
}

const emptyFilters: FilterValues = {
  busqueda: '',
  estado: '',
  prioridad: '',
  tipo: '',
  estacion: '',
  fechaDesde: '',
  fechaHasta: '',
};

const DASHBOARD_STATE_KEY = 'dashboard-state-v1';

const readDashboardState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DASHBOARD_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

// Returns visual state for dual-confirmation logic
function getDisplayState(order: Order) {
  if (order.estado !== 'Completada') return order.estado;
  if (order.confirmadoProveedor && order.confirmadoEstacion) return 'Completada';
  return 'Por confirmar';
}

export const Dashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const savedDashboardState = readDashboardState();
  const initialDashboardStateRef = useRef(savedDashboardState);
  const restoredPositionRef = useRef(false);
  const [selectedTab, setSelectedTab] = useState<'sistemas' | 'compras' | 'todos'>(() => {
    const savedTab = savedDashboardState?.selectedTab;
    return savedTab === 'sistemas' || savedTab === 'compras' ? savedTab : 'todos';
  });
  const [historialOpen, setHistorialOpen] = useState(false);
  const [selectedHistorial, setSelectedHistorial] = useState<any[] | undefined>();
  const [filters, setFilters] = useState<FilterValues>(() => {
    const savedFilters = savedDashboardState?.filters;
    return savedFilters && typeof savedFilters === 'object' ? { ...emptyFilters, ...savedFilters } : emptyFilters;
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [forwardingOrderId, setForwardingOrderId] = useState<number | null>(null);

  // Refs for scrolling to sections
  const sinIniciarRef = useRef<HTMLDivElement>(null);
  const enProcesoRef = useRef<HTMLDivElement>(null);
  const completadasRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Stats (global totals, not page-limited)
  const [stats, setStats] = useState<{ sinIniciar: number; enProceso: number; completadas: number; total: number } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const savedPage = Number(savedDashboardState?.currentPage || 1);
    return Number.isFinite(savedPage) && savedPage > 0 ? savedPage : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const persistDashboardState = useCallback((selectedOrderId?: number) => {
    if (typeof window === 'undefined') return;
    const previous = readDashboardState();
    const snapshot = {
      selectedTab,
      currentPage,
      filters,
      scrollY: window.scrollY,
      selectedOrderId: selectedOrderId ?? previous?.selectedOrderId,
    };
    window.sessionStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(snapshot));
  }, [selectedTab, currentPage, filters]);

  // Signature modal state
  const [sigPending, setSigPending] = useState<{ orderId: number; newState: string; type: 'sistemas' | 'estacion' } | null>(null);

  // Busca solo cuando se confirma con Enter en el campo de búsqueda.
  const [debouncedFilters, setDebouncedFilters] = useState<FilterValues>(() => {
    const savedFilters = savedDashboardState?.filters;
    return savedFilters && typeof savedFilters === 'object' ? { ...emptyFilters, ...savedFilters } : emptyFilters;
  });

  const handleFiltersChange = useCallback((next: FilterValues) => {
    setFilters(next);
    setCurrentPage(1); // reset to page 1 on filter change
    setDebouncedFilters(next);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Actualiza página/filtros sin borrar la posición que todavía falta restaurar.
    const previous = readDashboardState();
    window.sessionStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify({
      ...previous,
      selectedTab,
      currentPage,
      filters,
      scrollY: restoredPositionRef.current ? window.scrollY : (previous?.scrollY || 0),
    }));
  }, [selectedTab, currentPage, filters]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedFilters.busqueda) params.set('busqueda', debouncedFilters.busqueda);
      if (debouncedFilters.estado) params.set('estado', debouncedFilters.estado);
      if (debouncedFilters.prioridad) params.set('prioridad', debouncedFilters.prioridad);
      if (debouncedFilters.tipo) params.set('tipo', debouncedFilters.tipo);
      if (debouncedFilters.estacion) params.set('estacion', debouncedFilters.estacion);
      if (debouncedFilters.fechaDesde) params.set('fechaDesde', debouncedFilters.fechaDesde);
      if (debouncedFilters.fechaHasta) params.set('fechaHasta', debouncedFilters.fechaHasta);
      const roleShowsTabs = user?.rol === 'jefe' || user?.rol === 'sistemas' ||
        ['estacion', 'almacen', 'constructora', 'marketing'].includes(user?.rol || '');
      if (roleShowsTabs && selectedTab !== 'todos') params.set('tipo', selectedTab);
      params.set('page', String(currentPage));
      params.set('limit', String(LIMIT));

      const qs = params.toString();
      const [ordersRes, statsRes] = await Promise.all([
        api.get(`/orders?${qs}`),
        api.get(`/orders/stats?${qs}`),
      ]);
      setOrders(ordersRes.data.orders);
      setTotalPages(ordersRes.data.totalPages);
      setTotal(ordersRes.data.total);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, currentPage, selectedTab, user?.rol]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (loading || restoredPositionRef.current || typeof window === 'undefined') return;
    const savedState = initialDashboardStateRef.current;
    restoredPositionRef.current = true;

    // Esperar a que React pinte las tarjetas antes de restaurar la posición.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const selectedOrderId = Number(savedState?.selectedOrderId);
        const selectedCard = Number.isFinite(selectedOrderId)
          ? document.querySelector<HTMLElement>(`[data-order-id="${selectedOrderId}"]`)
          : null;
        const savedScroll = Number(savedState?.scrollY || 0);

        if (Number.isFinite(savedScroll)) window.scrollTo({ top: savedScroll, behavior: 'auto' });

        if (selectedCard) {
          const cardRect = selectedCard.getBoundingClientRect();
          if (cardRect.bottom < 0 || cardRect.top > window.innerHeight) {
            selectedCard.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
          selectedCard.classList.add('order-card-restored');
          window.setTimeout(() => selectedCard.classList.remove('order-card-restored'), 1600);
          return;
        }
      });
    });
  }, [loading, orders]);

  const updateOrderState = async (orderId: number, newState: string, firma?: string | null) => {
    try {
      await api.patch(`/orders/${orderId}/estado`, { estado: newState, ...(firma ? { firma } : {}) });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleStatusChange = (orderId: number, newState: string) => {
    if (newState === 'Completada') {
      setSigPending({ orderId, newState, type: 'sistemas' });
    } else {
      updateOrderState(orderId, newState);
    }
  };

  const handleForwardOrder = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const destination = order.tipo === 'sistemas' ? 'compras' : 'sistemas';
    const destinationLabel = destination === 'sistemas' ? 'Sistemas' : 'Compras';

    if (!window.confirm(`¿Reenviar el vale ${order.folio} a ${destinationLabel}? Conservará su estado actual.`)) return;

    try {
      setForwardingOrderId(order.id);
      await api.patch(`/orders/${order.id}/reenviar`, { tipo: destination });
      // Retirarlo de inmediato de la bandeja actual y después sincronizar totales/paginación.
      setOrders(current => current.filter(item => item.id !== order.id));
      await fetchOrders();
    } catch (error: any) {
      console.error('Error forwarding order:', error);
      alert(error.response?.data?.message || 'No se pudo reenviar el vale');
    } finally {
      setForwardingOrderId(null);
    }
  };

  const handleSignatureConfirm = async (signature: string | null) => {
    if (!sigPending) return;
    if (sigPending.type === 'estacion') {
      try {
        await api.patch(`/orders/${sigPending.orderId}/confirmar`, { firma: signature });
        fetchOrders();
      } catch (error) {
        console.error('Error confirming order:', error);
      }
    } else {
      await updateOrderState(sigPending.orderId, sigPending.newState, signature);
    }
    setSigPending(null);
  };

  const ESTACION_LIKE = ['estacion', 'almacen', 'constructora', 'marketing'];

  const confirmarOrden = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    if (ESTACION_LIKE.includes(user?.rol || '')) {
      setSigPending({ orderId, newState: 'Completada', type: 'estacion' });
    } else {
      try {
        await api.patch(`/orders/${orderId}/confirmar`);
        fetchOrders();
      } catch (error) {
        console.error('Error confirming order:', error);
      }
    }
  };

  const openHistorial = (e: React.MouseEvent, historial: any[]) => {
    e.stopPropagation();
    setSelectedHistorial(historial);
    setHistorialOpen(true);
  };

  // Tab filter (client-side on top of server results)
  const showTabs = user?.rol === 'jefe' || ESTACION_LIKE.includes(user?.rol || '') || user?.rol === 'sistemas';
  let displayedOrders = orders;
  if (showTabs) {
    if (selectedTab === 'sistemas') displayedOrders = orders.filter(o => o.tipo === 'sistemas');
    else if (selectedTab === 'compras') displayedOrders = orders.filter(o => o.tipo === 'compras');
  }

  const sin_iniciar = useMemo(() => displayedOrders.filter(o => o.estado === 'Sin iniciar'), [displayedOrders]);
  const en_proceso  = useMemo(() => displayedOrders.filter(o => o.estado === 'En proceso'),  [displayedOrders]);
  const completadas = useMemo(() => displayedOrders.filter(o => o.estado === 'Completada'),  [displayedOrders]);

  const pendingMyConfirmation = orders.filter(o => {
    if (o.estado !== 'Completada') return false;
    if (ESTACION_LIKE.includes(user?.rol || '')) return o.confirmadoProveedor && !o.confirmadoEstacion;
    if (['sistemas', 'compras', 'jefe'].includes(user?.rol || '')) return o.confirmadoEstacion && !o.confirmadoProveedor;
    return false;
  });

  const canChangeStatus = (order: Order) =>
    (user?.rol === 'sistemas' && order.tipo === 'sistemas') ||
    (user?.rol === 'compras' && order.tipo === 'compras') ||
    user?.rol === 'jefe';

  const canForward = (order: Order) =>
    (user?.rol === 'sistemas' || user?.rol === 'compras') && user.rol === order.tipo;

  const canConfirm = (order: Order) => {
    if (ESTACION_LIKE.includes(user?.rol || '')) return !order.confirmadoEstacion;
    if (canChangeStatus(order)) return !order.confirmadoProveedor;
    return false;
  };

  // Export handlers
  const handleExportExcel = () => exportToExcel(displayedOrders, 'ordenes');
  const handleExportPDF = () => exportToPDF(displayedOrders, 'ordenes');

  const renderOrderCard = (order: Order, colorClass: string) => {
    const displayState = getDisplayState(order);
    const isPorConfirmar = displayState === 'Por confirmar';
    const cardClass = isPorConfirmar ? 'order-card por-confirmar' : `order-card ${colorClass}`;

    return (
      <div key={order.id} data-order-id={order.id} className={cardClass} onClick={() => {
        persistDashboardState(order.id);
        navigate(`/orders/${order.id}`, { state: { fromDashboard: true } });
      }} style={{ cursor: 'pointer' }}>
        <div className="card-header">
          <div>
            <p className="card-folio">{order.folio}</p>
            <p className="card-user"><UserIcon style={{ width: 14, height: 14 }} /> {order.User?.nombre}</p>
          </div>
          <button onClick={(e) => openHistorial(e, order.historialCambios || [])} className="btn-history" title="Ver historial">
            <ClipboardDocumentListIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="card-field"><strong>Para:</strong> {order.tipo === 'sistemas' ? <><Cog6ToothIcon style={{ width: 14, height: 14 }} /> Sistemas</> : <><ShoppingCartIcon style={{ width: 14, height: 14 }} /> Compras</>}</div>
        <div className="card-field"><strong>Estación:</strong> {order.localizacion}</div>
        <div className="card-field"><strong>Prioridad:</strong> {order.prioridad}</div>
        <div className="card-field"><strong>Descripción:</strong> {order.descripcion.substring(0, 80)}{order.descripcion.length > 80 ? '...' : ''}</div>

        {order.estado === 'Completada' && (
          <div className="confirm-status">
            <span className={`confirm-badge ${order.confirmadoProveedor ? 'confirmed' : 'pending'}`}>
              {order.confirmadoProveedor
                ? <CheckCircleIcon style={{ width: 13, height: 13 }} />
                : <MinusCircleIcon style={{ width: 13, height: 13 }} />} Proveedor
            </span>
            <span className={`confirm-badge ${order.confirmadoEstacion ? 'confirmed' : 'pending'}`}>
              {order.confirmadoEstacion
                ? <CheckCircleIcon style={{ width: 13, height: 13 }} />
                : <MinusCircleIcon style={{ width: 13, height: 13 }} />} Estación
            </span>
          </div>
        )}

        {canConfirm(order) && (
          <button className="btn-confirm" onClick={(e) => confirmarOrden(e, order.id)}>
            <HandThumbUpIcon style={{ width: 14, height: 14 }} /> Marcar completado
          </button>
        )}

        {canForward(order) && (
          <button
            className="btn-forward"
            onClick={(e) => handleForwardOrder(e, order)}
            disabled={forwardingOrderId === order.id}
          >
            <PaperAirplaneIcon style={{ width: 14, height: 14 }} />
            {forwardingOrderId === order.id
              ? 'Reenviando...'
              : `Reenviar a ${order.tipo === 'sistemas' ? 'Compras' : 'Sistemas'}`}
          </button>
        )}

        {canChangeStatus(order) && (
          <select
            value={order.estado}
            onChange={(e) => { e.stopPropagation(); handleStatusChange(order.id, e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            className="state-select"
          >
            <option>Sin iniciar</option>
            <option>En proceso</option>
            <option>Completada</option>
          </select>
        )}
      </div>
    );
  };

  if (loading) return (
    <main className="dashboard-main">
      <div className="brand-loading-wrapper">
        <div className="brand-loading-shell">
          <div className="brand-loading-ring" />
          <img src="/logo.png" alt="La Villita" className="brand-loading-logo" />
        </div>
      </div>
    </main>
  );

  return (
    <main className="dashboard-main">
      <NotificationCenter />
      <div className="dashboard-container">
          <div className="dashboard-header">
            <div>
              <h1><ClipboardDocumentListIcon style={{ width: 28, height: 28 }} /> Órdenes de Trabajo</h1>
              <p className="subtitle">Gestiona todas tus órdenes en un solo lugar</p>
            </div>
          </div>

          {/* Stats cards */}
          {stats && (
            <div className="stats-cards">
              <div className="stat-card stat-sin-iniciar" onClick={() => scrollToSection(sinIniciarRef)} style={{ cursor: 'pointer' }}>
                <ExclamationCircleIcon className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-number">{stats.sinIniciar}</span>
                  <span className="stat-label">Sin Iniciar</span>
                </div>
              </div>
              <div className="stat-card stat-en-proceso" onClick={() => scrollToSection(enProcesoRef)} style={{ cursor: 'pointer' }}>
                <ClockIcon className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-number">{stats.enProceso}</span>
                  <span className="stat-label">En Proceso</span>
                </div>
              </div>
              <div className="stat-card stat-completadas" onClick={() => scrollToSection(completadasRef)} style={{ cursor: 'pointer' }}>
                <CheckCircleIcon className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-number">{stats.completadas}</span>
                  <span className="stat-label">Completadas</span>
                </div>
              </div>
              <div className="stat-card stat-total" onClick={() => scrollToSection(sinIniciarRef)} style={{ cursor: 'pointer' }}>
                <QueueListIcon className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-number">{stats.total}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
            </div>
          )}

          {pendingMyConfirmation.length > 0 && (
            <div className="confirmation-reminder">
              <BellAlertIcon style={{ width: 20, height: 20 }} />
              <span>
                Tienes <strong>{pendingMyConfirmation.length}</strong> {pendingMyConfirmation.length === 1 ? 'orden completada pendiente' : 'órdenes completadas pendientes'} de tu confirmación
              </span>
            </div>
          )}

          {/* Search & Filters */}
          <SearchFilters
            filters={filters}
            onChange={handleFiltersChange}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            showTipoFilter={user?.rol === 'jefe'}
            resultCount={total}
          />

          {/* Tabs para Jefe y Estación */}
          {showTabs && (
            <div className="tabs-container">
              <button onClick={() => { setSelectedTab('todos'); setCurrentPage(1); }} className={`tab ${selectedTab === 'todos' ? 'active' : ''}`}>
                <QueueListIcon style={{ width: 16, height: 16 }} /> Todas
              </button>
              <button onClick={() => { setSelectedTab('sistemas'); setCurrentPage(1); }} className={`tab ${selectedTab === 'sistemas' ? 'active' : ''}`}>
                <Cog6ToothIcon style={{ width: 16, height: 16 }} /> Sistemas
              </button>
              <button onClick={() => { setSelectedTab('compras'); setCurrentPage(1); }} className={`tab ${selectedTab === 'compras' ? 'active' : ''}`}>
                <ShoppingCartIcon style={{ width: 16, height: 16 }} /> Compras
              </button>
            </div>
          )}

          {/* Sin iniciar */}
          <div className="orders-section" ref={sinIniciarRef}>
            {sin_iniciar.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><SparklesIcon style={{ width: 32, height: 32 }} /></div>
                <div className="empty-state-text">No hay órdenes sin iniciar</div>
              </div>
            ) : (
              <div className="orders-grid">{sin_iniciar.map(o => renderOrderCard(o, 'sin-iniciar'))}</div>
            )}
          </div>

          {/* En proceso */}
          <div className="orders-section" ref={enProcesoRef}>
            <h2 className="section-title"><ClockIcon style={{ width: 20, height: 20 }} /> En Proceso ({en_proceso.length})</h2>
            {en_proceso.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><PauseCircleIcon style={{ width: 32, height: 32 }} /></div>
                <div className="empty-state-text">No hay órdenes en proceso</div>
              </div>
            ) : (
              <div className="orders-grid">{en_proceso.map(o => renderOrderCard(o, 'en-proceso'))}</div>
            )}
          </div>

          {/* Completadas */}
          <div className="orders-section" ref={completadasRef}>
            <h2 className="section-title"><CheckCircleIcon style={{ width: 20, height: 20 }} /> Completadas ({completadas.length})</h2>
            {completadas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><CheckCircleIcon style={{ width: 32, height: 32 }} /></div>
                <div className="empty-state-text">No hay órdenes completadas</div>
              </div>
            ) : (
              <div className="orders-grid">{completadas.map(o => renderOrderCard(o, 'completada'))}</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >«</button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >‹</button>
              <span className="pagination-info">
                Página {currentPage} de {totalPages}
                <span className="pagination-total"> ({total} órdenes)</span>
              </span>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >›</button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >»</button>
            </div>
          )}
        </div>

      {historialOpen && (
        <OrderHistory historial={selectedHistorial} onClose={() => setHistorialOpen(false)} />
      )}

      {sigPending && (
        <SignatureModal
          title={sigPending.type === 'estacion' ? 'Confirmar recepción de orden' : 'Marcar orden como Completada'}
          onConfirm={handleSignatureConfirm}
          onCancel={() => setSigPending(null)}
        />
      )}
    </main>
  );
};                                 

export default Dashboard;
