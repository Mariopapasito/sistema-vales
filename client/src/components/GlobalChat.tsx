import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import OrderComments from './OrderComments';
import './GlobalChat.css';

interface Conversation {
  orderId: number;
  folio: string;
  estado: string;
  tipo: string;
  latestComment: { texto: string; autor: string; createdAt: string } | null;
  commentCount: number;
}

interface OrderOption {
  id: number;
  folio: string;
  estado: string;
  descripcion: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const estadoColor: Record<string, string> = {
  'Sin iniciar': '#ef4444',
  'En proceso': '#f59e0b',
  'Completada': '#22c55e',
};

const folioColor = (folio: string) => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];
  const i = folio.charCodeAt(folio.length - 1) % colors.length;
  return colors[i];
};

type View = 'list' | 'new' | 'chat';

const GlobalChat: React.FC = () => {
  const { accessToken, user } = useSelector((state: RootState) => state.auth);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; folio: string } | null>(null);

  // New chat picker state
  const [orderOptions, setOrderOptions] = useState<OrderOption[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/conversations');
      setConversations(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderOptions = useCallback(async (search: string) => {
    try {
      setLoadingOrders(true);
      const res = await api.get('/orders', { params: { limit: 30, folio: search || undefined } });
      const orders = res.data.orders || res.data;
      setOrderOptions(Array.isArray(orders) ? orders.map((o: any) => ({
        id: o.id,
        folio: o.folio,
        estado: o.estado,
        descripcion: o.descripcion || '',
      })) : []);
    } catch {
      setOrderOptions([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (open && view === 'list') fetchConversations();
  }, [open, view, fetchConversations]);

  useEffect(() => {
    if (view === 'new') {
      const t = setTimeout(() => fetchOrderOptions(orderSearch), 300);
      return () => clearTimeout(t);
    }
  }, [view, orderSearch, fetchOrderOptions]);

  const openChat = (id: number, folio: string) => {
    setSelectedOrder({ id, folio });
    setView('chat');
  };

  const goBack = () => {
    setSelectedOrder(null);
    setOrderSearch('');
    setView('list');
    fetchConversations();
  };

  if (!accessToken || !user) return null;

  return (
    <div className="global-chat-bubble">
      {open && (
        <div className="global-chat-panel">
          {view === 'chat' && selectedOrder ? (
            /* Chat view */
            <div className="global-chat-inner">
              <div className="global-chat-inner-header">
                <button className="global-chat-back" onClick={goBack}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h4>{selectedOrder.folio}</h4>
                <button className="global-chat-close" onClick={() => setOpen(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="global-chat-inner-body">
                <OrderComments orderId={selectedOrder.id} />
              </div>
            </div>

          ) : view === 'new' ? (
            /* New chat picker */
            <div className="global-chat-inner">
              <div className="global-chat-inner-header">
                <button className="global-chat-back" onClick={goBack}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h4>Seleccionar orden</h4>
                <button className="global-chat-close" onClick={() => setOpen(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="global-chat-search-wrap">
                <svg className="global-chat-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
                <input
                  className="global-chat-search"
                  placeholder="Buscar por folio..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="global-chat-list">
                {loadingOrders ? (
                  <div className="global-chat-loading"><div className="global-chat-spinner" /></div>
                ) : orderOptions.length === 0 ? (
                  <div className="global-chat-empty">No se encontraron órdenes</div>
                ) : orderOptions.map(o => (
                  <div key={o.id} className="global-chat-conv-item" onClick={() => openChat(o.id, o.folio)}>
                    <div className="global-chat-conv-avatar" style={{ background: folioColor(o.folio) }}>
                      {o.folio.slice(-3)}
                    </div>
                    <div className="global-chat-conv-info">
                      <div className="global-chat-conv-folio">
                        <span className="global-chat-estado-dot" style={{ background: estadoColor[o.estado] || '#64748b' }} />
                        {o.folio}
                      </div>
                      <div className="global-chat-conv-preview">{o.descripcion.substring(0, 55)}{o.descripcion.length > 55 ? '…' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            /* Conversation list */
            <>
              <div className="global-chat-panel-header">
                <h3>💬 Conversaciones</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="global-chat-new-btn" onClick={() => setView('new')} title="Nuevo chat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button className="global-chat-close" onClick={() => setOpen(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="global-chat-list">
                {loading ? (
                  <div className="global-chat-loading"><div className="global-chat-spinner" /></div>
                ) : conversations.length === 0 ? (
                  <div className="global-chat-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    No hay conversaciones aún
                    <button className="global-chat-new-empty-btn" onClick={() => setView('new')}>
                      Iniciar nueva conversación
                    </button>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div key={conv.orderId} className="global-chat-conv-item" onClick={() => openChat(conv.orderId, conv.folio)}>
                      <div className="global-chat-conv-avatar" style={{ background: folioColor(conv.folio) }}>
                        {conv.folio.slice(-3)}
                      </div>
                      <div className="global-chat-conv-info">
                        <div className="global-chat-conv-folio">
                          <span className="global-chat-estado-dot" style={{ background: estadoColor[conv.estado] || '#64748b' }} />
                          {conv.folio}
                        </div>
                        {conv.latestComment && (
                          <div className="global-chat-conv-preview">
                            <b>{conv.latestComment.autor}:</b> {conv.latestComment.texto.substring(0, 50)}
                            {conv.latestComment.texto.length > 50 ? '…' : ''}
                          </div>
                        )}
                      </div>
                      {conv.latestComment && (
                        <div className="global-chat-conv-time">{timeAgo(conv.latestComment.createdAt)}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        className="global-chat-btn"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) { setView('list'); setSelectedOrder(null); setOrderSearch(''); }
        }}
        aria-label="Abrir chat"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  );
};

export default GlobalChat;
