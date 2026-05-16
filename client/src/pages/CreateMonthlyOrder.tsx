import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { ArrowLeftIcon, ArchiveBoxIcon, DocumentTextIcon, SparklesIcon, CheckIcon, XMarkIcon, Bars3Icon, PlusIcon,
} from '@heroicons/react/24/outline';
import '../styles/CreateMonthlyOrder.css';
import '../styles/MonthlyOrders.css';

interface Item {
  descripcion: string;
  consumibles: boolean;
  intercambiables: boolean;
  existencias: string;
  unidad: string;
  cantidad: number;
}

const typeConfig = {
  aceites:   { label: 'PEDIDO ACEITES',   pillClass: 'pill-aceites',   Icon: ArchiveBoxIcon },
  papeleria: { label: 'PEDIDO PAPELERÍA', pillClass: 'pill-papeleria', Icon: DocumentTextIcon },
  limpieza:  { label: 'PEDIDO LIMPIEZA',  pillClass: 'pill-limpieza',  Icon: SparklesIcon },
};

export default function CreateMonthlyOrder() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const tipo = location.state?.tipo as keyof typeof typeConfig | undefined;

  const [items, setItems] = useState<Item[]>(Array(25).fill(null).map(() => ({
    descripcion: '', consumibles: false, intercambiables: false, existencias: '', unidad: '', cantidad: 0
  })));
  const [loading, setLoading] = useState(false);

  const cfg = tipo ? typeConfig[tipo] : typeConfig['aceites'];

  const handleChange = (index: number, field: keyof Item, value: any) => {
    const next = [...items];
    if (field === 'cantidad') {
      next[index][field] = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    } else {
      next[index][field] = value;
    }
    setItems(next);
  };

  const handleSave = async () => {
    const filledItems = items.filter(i => i.descripcion || i.cantidad > 0);
    if (filledItems.length === 0) {
      alert('El pedido no puede estar vacío. Agrega al menos un artículo con descripción o cantidad.');
      return;
    }
    try {
      setLoading(true);
      await api.post('/monthly-orders', {
        tipo,
        estacion: user?.estacion || user?.nombre || 'Sin asignar',
        fecha: new Date().toISOString().split('T')[0],
        items: filledItems,
      });
      navigate('/monthly-orders');
    } catch (error: any) {
      alert('Error al guardar: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Si no hay tipo seleccionado, mostrar selector
  if (!tipo) {
    const selectorCards = [
      {
        tipo: 'aceites' as const,
        label: 'Aceites',
        description: 'Lubricantes, aceites de motor y fluidos para maquinaria',
        Icon: ArchiveBoxIcon,
        gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '#fbbf24',
        iconBg: '#f59e0b',
        color: '#92400e',
      },
      {
        tipo: 'papeleria' as const,
        label: 'Papelería',
        description: 'Papelería, artículos de oficina y suministros administrativos',
        Icon: DocumentTextIcon,
        gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '#93c5fd',
        iconBg: '#3b82f6',
        color: '#1e40af',
      },
      {
        tipo: 'limpieza' as const,
        label: 'Limpieza',
        description: 'Productos de limpieza, desinfectantes y artículos de higiene',
        Icon: SparklesIcon,
        gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '#86efac',
        iconBg: '#22c55e',
        color: '#166534',
      },
    ];

    return (
      <div className="dashboard-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="dashboard-main">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-btn" style={{ padding: '0.6rem 0.8rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', display: 'none' }}>
              <Bars3Icon style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
          <div className="dashboard-container">
            <button className="btn-back" onClick={() => navigate('/monthly-orders')}>
              <ArrowLeftIcon style={{ width: 16, height: 16 }} />
              Regresar
            </button>

            {/* Header oscuro igual que Pedidos Mensuales */}
            <div className="monthly-orders-header">
              <div>
                <h1>Nuevo Pedido Mensual</h1>
                <p>Multiservicio La Villita S.A. de C.V. · Selecciona el tipo de pedido</p>
              </div>
            </div>

            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', maxWidth: '860px', margin: '0 auto' }}>
              {selectorCards.map(({ tipo: t, label, description, Icon, gradient, border, iconBg, color }) => (
                <button
                  key={t}
                  onClick={() => navigate('/create-monthly-order', { state: { tipo: t } })}
                  style={{
                    background: gradient,
                    border: `2px solid ${border}`,
                    borderRadius: '16px',
                    padding: '2rem 1.5rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(0,0,0,0.13)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}
                >
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: '28px', height: '28px', color: 'white' }} />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: '700', color }}>{label}</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.5' }}>{description}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color, fontSize: '0.82rem', fontWeight: '600', marginTop: 'auto' }}>
                    <PlusIcon style={{ width: 16, height: 16 }} />
                    Crear pedido de {label.toLowerCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

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
<div className="dashboard-container">
        <button className="btn-back" onClick={() => navigate('/create-monthly-order')}>
            <ArrowLeftIcon style={{ width: 16, height: 16 }} />
            Regresar
          </button>

          <div className="document-glass">
            {/* Header */}
            <div className="mo-doc-header">
              <div className="mo-doc-header-left">
                <h1>Multiservicio La Villita S.A. de C.V.</h1>
                <p>Gerencia Operativa</p>
              </div>
              <div className="mo-doc-header-right">
                <span className={`doc-type-pill ${cfg.pillClass}`}>
                  <cfg.Icon style={{ width: 16, height: 16 }} />
                  {cfg.label}
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="doc-meta">
              <div className="doc-meta-item">
                <span className="doc-meta-label">Fecha</span>
                <span className="doc-meta-value">{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="doc-meta-item">
                <span className="doc-meta-label">Estación</span>
                <span className="doc-meta-value">{user?.estacion || user?.nombre}</span>
              </div>
              <div className="doc-meta-item">
                <span className="doc-meta-label">Estado</span>
                <span className="status-pill borrador">Borrador</span>
              </div>
            </div>

            {/* Table */}
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th className="center">No.</th>
                    <th>Descripción</th>
                    <th className="center">Consumibles</th>
                    <th className="center">Intercambiables</th>
                    <th>Existencias</th>
                    <th>Unidad</th>
                    <th className="center">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="center row-num">{i + 1}</td>
                      <td>
                        <input type="text" value={item.descripcion} onChange={e => handleChange(i, 'descripcion', e.target.value)} placeholder="Descripción del artículo" />
                      </td>
                      <td className="center">
                        <input type="checkbox" checked={item.consumibles} onChange={e => handleChange(i, 'consumibles', e.target.checked)} />
                      </td>
                      <td className="center">
                        <input type="checkbox" checked={item.intercambiables} onChange={e => handleChange(i, 'intercambiables', e.target.checked)} />
                      </td>
                      <td>
                        <input type="text" value={item.existencias} onChange={e => handleChange(i, 'existencias', e.target.value)} placeholder="—" />
                      </td>
                      <td>
                        <input type="text" value={item.unidad} onChange={e => handleChange(i, 'unidad', e.target.value)} placeholder="pza / lt / kg" />
                      </td>
                      <td className="center">
                        <input type="number" min="0" value={item.cantidad || ''} onChange={e => handleChange(i, 'cantidad', e.target.value)} placeholder="0" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature */}
            <div className="doc-signature">
              <div className="signature-box">
                <span className="sig-name">{user?.nombre}</span>
                <span className="sig-label">Solicita — Gerente de Estación</span>
              </div>
            </div>

            {/* Actions */}
            <div className="doc-actions">
              <button className="btn-glass-cancel" onClick={() => navigate('/create-monthly-order')} disabled={loading}>
                <XMarkIcon style={{ width: 16, height: 16 }} />
                Cancelar
              </button>
              <button className="btn-glass-save" onClick={handleSave} disabled={loading}>
                <CheckIcon style={{ width: 16, height: 16 }} />
                {loading ? 'Guardando...' : 'Guardar Pedido'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
