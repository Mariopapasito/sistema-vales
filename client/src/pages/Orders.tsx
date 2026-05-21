import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/Orders.css';

interface Order {
  _id: string;
  folio: string;
  estado: 'sin-iniciar' | 'en-proceso' | 'completada';
  descripcionProblema: string;
  estacion: string;
  createdAt: string;
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/orders');
        setOrders(response.data.orders || response.data);
      } catch (err: any) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const groupedByStatus = {
    'sin-iniciar': orders.filter(o => o.estado === 'sin-iniciar'),
    'en-proceso': orders.filter(o => o.estado === 'en-proceso'),
    'completada': orders.filter(o => o.estado === 'completada')
  };

  const statusInfo = {
    'sin-iniciar': { icon: '🔴', label: 'Sin Iniciar', color: '#ef4444' },
    'en-proceso': { icon: '🟡', label: 'En Proceso', color: '#fbbf24' },
    'completada': { icon: '🟢', label: 'Completada', color: '#22c55e' }
  };

  if (isLoading) {
    return <main className="orders-main">Cargando órdenes...</main>;
  }

  return (
    <main className="orders-main">
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
        📋 Órdenes de Trabajo
      </h1>
      <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1rem' }}>
        Gestiona todas tus órdenes en un solo lugar
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {Object.entries(groupedByStatus).map(([status, statusOrders]) => {
          const info = statusInfo[status as keyof typeof statusInfo];
          return (
            <div key={status}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {info.icon} {info.label} ({statusOrders.length})
              </h2>

              {statusOrders.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '12px' }}>
                  No hay órdenes en este estado
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' }}>
                  {statusOrders.map((order) => (
                    <Link 
                      key={order._id} 
                      to={`/orders/${order._id}`} 
                      style={{ textDecoration: 'none' }}
                    >
                      <div 
                        style={{
                          background: 'white',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          border: `2px solid ${info.color}`,
                          boxShadow: `0 2px 8px ${info.color}33`,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          minHeight: '200px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.boxShadow = `0 12px 24px ${info.color}55`;
                          el.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.boxShadow = `0 2px 8px ${info.color}33`;
                          el.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                          {order.folio}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
                          👤 <span style={{ fontWeight: 600, color: '#0f172a' }}>{order.estacion}</span>
                        </div>
                        <p style={{ color: '#475569', lineHeight: '1.5', marginBottom: '1rem', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                          {order.descripcionProblema}
                        </p>
                        <div style={{ paddingTop: '1rem', borderTop: `1px solid ${info.color}33`, fontSize: '0.85rem', color: '#64748b' }}>
                          <div style={{ marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>Para:</span> Sistemas
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>Fecha:</span> {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default Orders;
