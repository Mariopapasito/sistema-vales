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

const GlobalChat: React.FC = () => {
  const { accessToken, user } = useSelector((state: RootState) => state.auth);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; folio: string } | null>(null);

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

  useEffect(() => {
    if (open && !selectedOrder) {
      fetchConversations();
    }
  }, [open, selectedOrder, fetchConversations]);

  if (!accessToken || !user) return null;

  return (
    <div className="global-chat-bubble">
      {/* Panel */}
      {open && (
        <div className="global-chat-panel">
          {selectedOrder ? (
            /* Inner chat view for a specific order */
            <div className="global-chat-inner">
              <div className="global-chat-inner-header">
                <button className="global-chat-back" onClick={() => setSelectedOrder(null)}>
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
          ) : (
            /* Conversation list */
            <>
              <div className="global-chat-panel-header">
                <h3>💬 Conversaciones</h3>
                <button className="global-chat-close" onClick={() => setOpen(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="global-chat-list">
                {loading ? (
                  <div className="global-chat-loading">
                    <div className="global-chat-spinner" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="global-chat-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    No hay conversaciones aún
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.orderId}
                      className="global-chat-conv-item"
                      onClick={() => setSelectedOrder({ id: conv.orderId, folio: conv.folio })}
                    >
                      <div
                        className="global-chat-conv-avatar"
                        style={{ background: folioColor(conv.folio) }}
                      >
                        {conv.folio.slice(-3)}
                      </div>
                      <div className="global-chat-conv-info">
                        <div className="global-chat-conv-folio">
                          <span
                            className="global-chat-estado-dot"
                            style={{ background: estadoColor[conv.estado] || '#64748b' }}
                          />
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
                        <div className="global-chat-conv-time">
                          {timeAgo(conv.latestComment.createdAt)}
                        </div>
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
          if (!open) setSelectedOrder(null);
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
