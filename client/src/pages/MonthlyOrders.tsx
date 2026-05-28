import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import api from '../services/api';
import { PlusIcon, ChevronRightIcon, ArchiveBoxIcon, DocumentTextIcon, SparklesIcon, Squares2X2Icon, HandThumbUpIcon, BellAlertIcon, ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import '../styles/MonthlyOrders.css';

interface MonthlyOrderItem {
  descripcion: string;
  consumibles: boolean;
  intercambiables: boolean;
  existencias: string;
  unidad: string;
  cantidad: number;
}

interface MonthlyOrder {
  id: string;
  folio: string;
  tipo: 'aceites' | 'papeleria' | 'limpieza';
  estacion: string;
  fecha: string;
  items: MonthlyOrderItem[];
  estado: 'borrador' | 'enviado' | 'completado';
  confirmadoCompras: boolean;
  confirmadoEstacion: boolean;
  createdByUser?: { nombre: string };
  createdAt: string;
}

const typeConfig = {
  aceites:   { label: 'Aceites',   badgeClass: 'badge-aceites',   Icon: ArchiveBoxIcon },
  papeleria: { label: 'Papelería', badgeClass: 'badge-papeleria', Icon: DocumentTextIcon },
  limpieza:  { label: 'Limpieza',  badgeClass: 'badge-limpieza',  Icon: SparklesIcon }
};

export default function MonthlyOrders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<MonthlyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'todos' | 'aceites' | 'papeleria' | 'limpieza'>('todos');

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/monthly-orders');
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmarPedido = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    try {
      await api.patch(`/monthly-orders/${orderId}/confirmar`);
      fetchOrders();
    } catch (error) {
      console.error('Error confirming order:', error);
    }
  };

  const downloadAsExcel = () => {
    if (orders.length === 0) {
      alert('No hay pedidos para descargar');
      return;
    }

    const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const headerRows = [
      ['MULTISERVICIO LA VILLITA S.A. DE C.V.'],
      ['Gerencia Operativa'],
      [`Reporte de Pedidos Mensuales — ${fecha}`],
      [],
      ['Folio', 'Tipo', 'Estación', 'Estado', 'Conf. Compras', 'Conf. Estación', 'Creado por', 'Fecha', 'Artículos']
    ];

    const dataRows = orders.map(order => [
      order.folio,
      typeConfig[order.tipo].label,
      order.estacion,
      getDisplayEstado(order).charAt(0).toUpperCase() + getDisplayEstado(order).slice(1),
      order.confirmadoCompras ? 'Sí' : 'No',
      order.confirmadoEstacion ? 'Sí' : 'No',
      order.createdByUser?.nombre || 'N/A',
      new Date(order.createdAt).toLocaleDateString('es-MX'),
      order.items.map(item => `${item.descripcion} (${item.cantidad} ${item.unidad})`).join('; ')
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows]);

    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 15 }, { wch: 16 }, { wch: 12 }, { wch: 50 }
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Mensuales');
    XLSX.writeFile(wb, `Pedidos-Mensuales-${new Date().toLocaleDateString('es-MX')}.xlsx`);
  };

  const downloadOrderAsExcel = (e: React.MouseEvent, order: MonthlyOrder) => {
    e.stopPropagation();

    const tipoLabels: any = {
      aceites:   'PEDIDO ACEITES',
      papeleria: 'PEDIDO PAPELERÍA',
      limpieza:  'PEDIDO LIMPIEZA'
    };

    const fecha = new Date(order.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const headerData = [
      ['MULTISERVICIO LA VILLITA S.A. DE C.V.'],
      ['Gerencia Operativa'],
      [`${tipoLabels[order.tipo]} — ${fecha}`],
      [`Folio: ${order.folio}    Estación: ${order.estacion}`],
      [],
      ['No.', 'Descripción', 'Consumibles', 'Intercambiables', 'Existencias', 'Unidad', 'Cantidad']
    ];

    const itemsData = order.items.map((item, idx) => [
      idx + 1,
      item.descripcion,
      item.consumibles ? 'Sí' : 'No',
      item.intercambiables ? 'Sí' : 'No',
      item.existencias,
      item.unidad,
      item.cantidad > 0 ? item.cantidad : ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headerData, ...itemsData]);
    ws['!cols'] = [
      { wch: 5 }, { wch: 35 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
    XLSX.writeFile(wb, `${tipoLabels[order.tipo].replace(/ /g, '-')}-${order.folio}.xlsx`);
  };

  if (loading) {
    return <span>Cargando pedidos...</span>;
  }

  const filtered = selectedType === 'todos' ? orders : orders.filter(o => o.tipo === selectedType);

  const groups = {
    aceites:   filtered.filter(o => o.tipo === 'aceites'),
    papeleria: filtered.filter(o => o.tipo === 'papeleria'),
    limpieza:  filtered.filter(o => o.tipo === 'limpieza'),
  };

  // Reminder: pedidos where my side hasn't confirmed yet but the other has
  const pendingMyConfirm = orders.filter(o => {
    if (o.estado === 'completado') return false; // both confirmed, nothing to do
    if (user?.rol === 'estacion') return o.confirmadoCompras && !o.confirmadoEstacion;
    if (['compras', 'jefe'].includes(user?.rol || '')) return o.confirmadoEstacion && !o.confirmadoCompras;
    return false;
  });

  const canConfirm = (order: MonthlyOrder) => {
    if (order.estado === 'completado') return false;
    if (user?.rol === 'estacion') return !order.confirmadoEstacion;
    if (['compras', 'jefe'].includes(user?.rol || '')) return !order.confirmadoCompras;
    return false;
  };

  const getDisplayEstado = (order: MonthlyOrder) => {
    if (order.estado === 'completado') return 'completado';
    if (order.confirmadoCompras || order.confirmadoEstacion) return 'por confirmar';
    return order.estado;
  };

  return (
<div className="dashboard-container">
        <div className="monthly-orders-header">
          <div>
            <h1>Pedidos Mensuales</h1>
            <p>Multiservicio La Villita S.A. de C.V. | Gestión de pedidos de aceites, papelería y limpieza</p>
          </div>
        </div>

        {/* Reminder banner */}
        {pendingMyConfirm.length > 0 && (
          <div className="confirmation-reminder">
            <BellAlertIcon style={{ width: 20, height: 20 }} />
            <span>
              Tienes <strong>{pendingMyConfirm.length}</strong> {pendingMyConfirm.length === 1 ? 'pedido' : 'pedidos'} pendiente{pendingMyConfirm.length !== 1 ? 's' : ''} de tu confirmación
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-row">
          {([['todos', 'Todos', Squares2X2Icon], ['aceites', 'Aceites', ArchiveBoxIcon], ['papeleria', 'Papelería', DocumentTextIcon], ['limpieza', 'Limpieza', SparklesIcon]] as any[]).map(([val, lbl, Icon]) => (
            <button
              key={val}
              className={`tab-btn ${selectedType === val ? 'active' : ''}`}
              onClick={() => setSelectedType(val)}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {lbl}
            </button>
          ))}
        </div>

        {/* Create buttons for estacion */}
        {user?.rol === 'estacion' && (
          <div className="new-orders-row">
            {(['aceites', 'papeleria', 'limpieza'] as const).map((tipo) => {
              const cfg = typeConfig[tipo];
              return (
                <button key={tipo} className="btn-new-type" onClick={() => navigate('/create-monthly-order', { state: { tipo } })}>
                  <PlusIcon style={{ width: 16, height: 16 }} />
                  Nuevo Pedido {cfg.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Groups */}
        {Object.entries(groups).map(([tipoKey, items]) => {
          if (selectedType !== 'todos' && tipoKey !== selectedType) return null;
          const cfg = typeConfig[tipoKey as keyof typeof typeConfig];
          const Icon = cfg.Icon;
          return (
            <div key={tipoKey} style={{ marginBottom: '2rem' }}>
              <p className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icon style={{ width: 14, height: 14 }} /> {cfg.label} ({items.length})
              </p>
              {items.length === 0 ? (
                <div className="empty-glass">
                  <Icon style={{ width: 32, height: 32, margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
                  <p>Sin pedidos de {cfg.label.toLowerCase()}</p>
                </div>
              ) : (
                <div className="orders-grid">
                  {items.map(order => {
                    const displayEstado = getDisplayEstado(order);
                    return (
                      <div key={order.id} className={`order-card ${displayEstado === 'por confirmar' ? 'por-confirmar' : ''}`} onClick={() => navigate(`/monthly-order/${order.id}`)}>
                        <div className="order-card-top">
                          <span className={`order-type-badge ${cfg.badgeClass}`}>
                            <Icon style={{ width: 12, height: 12 }} />
                            {cfg.label}
                          </span>
                          <span className={`order-status-badge status-${displayEstado.replace(' ', '-')}`}>
                            {displayEstado.charAt(0).toUpperCase() + displayEstado.slice(1)}
                          </span>
                        </div>
                        <p className="order-card-folio">{order.folio}</p>
                        <div className="order-card-meta">
                          <span>{order.estacion}</span>
                          <span>{new Date(order.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>

                        {/* Confirmation badges */}
                        {(order.confirmadoCompras || order.confirmadoEstacion || order.estado === 'completado') && (
                          <div className="confirm-status" style={{ marginTop: '0.5rem' }}>
                            <span className={`confirm-badge ${order.confirmadoCompras ? 'confirmed' : 'pending'}`}>
                              {order.confirmadoCompras ? '✓' : '○'} Compras
                            </span>
                            <span className={`confirm-badge ${order.confirmadoEstacion ? 'confirmed' : 'pending'}`}>
                              {order.confirmadoEstacion ? '✓' : '○'} Estación
                            </span>
                          </div>
                        )}

                        {/* Confirm button */}
                        {canConfirm(order) && (
                          <button className="btn-confirm" style={{ marginTop: '0.5rem' }} onClick={(e) => confirmarPedido(e, order.id)}>
                            <HandThumbUpIcon style={{ width: 14, height: 14 }} /> Marcar completado
                          </button>
                        )}

                        {/* Download button */}
                        {['compras', 'jefe'].includes(user?.rol || '') && (
                          <button className="btn-download-card" style={{ marginTop: '0.5rem' }} onClick={(e) => downloadOrderAsExcel(e, order)}>
                            <ArrowDownTrayIcon style={{ width: 14, height: 14 }} /> Descargar
                          </button>
                        )}

                        <div className="order-card-arrow">
                          <ChevronRightIcon style={{ width: 18, height: 18 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
  );
}

