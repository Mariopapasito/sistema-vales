import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import './GlobalChat.css';

interface UserOption {
  id: number;
  nombre: string;
  rol: string;
  estacion?: string;
  foto?: string;
}

interface Conversation {
  partnerId: number;
  partnerNombre: string;
  partnerRol: string;
  partnerFoto?: string;
  lastMessage: { texto: string; fromMe: boolean; createdAt: string };
  unread: number;
}

interface Message {
  id: number;
  fromUserId: number;
  toUserId: number;
  texto: string;
  leido: boolean;
  createdAt: string;
  from: { id: number; nombre: string; rol: string; foto?: string };
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

const rolColor: Record<string, string> = {
  jefe: '#6366f1',
  sistemas: '#8b5cf6',
  estacion: '#06b6d4',
  compras: '#10b981',
  almacen: '#f59e0b',
  constructora: '#ec4899',
};

const avatarBg = (nombre: string) => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) % colors.length;
  return colors[h];
};

const initials = (nombre: string) => nombre.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

type View = 'list' | 'new' | 'chat';

const GlobalChat: React.FC = () => {
  const { accessToken, user } = useSelector((state: RootState) => state.auth);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  const [partner, setPartner] = useState<UserOption | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConvs(true);
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch { /* silent */ } finally { setLoadingConvs(false); }
  }, []);

  const fetchMessages = useCallback(async (partnerId: number) => {
    try {
      setLoadingMsgs(true);
      const res = await api.get(`/messages/${partnerId}`);
      setMessages(res.data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { /* silent */ } finally { setLoadingMsgs(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/messages/users');
      setUsers(res.data);
    } catch { /* silent */ } finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => {
    if (open && view === 'list') fetchConversations();
  }, [open, view, fetchConversations]);

  useEffect(() => {
    if (view === 'new') fetchUsers();
  }, [view, fetchUsers]);

  // Poll new messages when chat is open
  useEffect(() => {
    if (view !== 'chat' || !partner) return;
    const interval = setInterval(() => fetchMessages(partner.id), 5000);
    return () => clearInterval(interval);
  }, [view, partner, fetchMessages]);

  const openChat = (p: UserOption) => {
    setPartner(p);
    setMessages([]);
    setView('chat');
    fetchMessages(p.id);
  };

  const goBack = () => {
    setPartner(null);
    setUserSearch('');
    setView('list');
    fetchConversations();
  };

  const sendMessage = async () => {
    if (!text.trim() || !partner || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/messages/${partner.id}`, { texto: text.trim() });
      setMessages(prev => [...prev, res.data]);
      setText('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { /* silent */ } finally { setSending(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const filteredUsers = users.filter(u =>
    u.nombre.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.rol.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!accessToken || !user) return null;

  return (
    <div className="global-chat-bubble">
      {open && (
        <div className="global-chat-panel">

          {view === 'chat' && partner ? (
            <div className="global-chat-inner">
              <div className="global-chat-inner-header">
                <button className="global-chat-back" onClick={goBack}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="gc-partner-avatar" style={{ background: avatarBg(partner.nombre) }}>
                  {partner.foto
                    ? <img src={partner.foto} alt={partner.nombre} />
                    : initials(partner.nombre)}
                </div>
                <div className="gc-partner-info">
                  <span className="gc-partner-name">{partner.nombre}</span>
                  <span className="gc-partner-rol" style={{ color: rolColor[partner.rol] || '#64748b' }}>{partner.rol}</span>
                </div>
                <button className="global-chat-close" onClick={() => setOpen(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className="gc-messages-body">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="global-chat-loading"><div className="global-chat-spinner" /></div>
                ) : messages.length === 0 ? (
                  <div className="gc-messages-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Inicia la conversación
                  </div>
                ) : (
                  messages.map(m => {
                    const mine = m.fromUserId === user.id;
                    return (
                      <div key={m.id} className={`gc-msg-row ${mine ? 'gc-msg-mine' : 'gc-msg-theirs'}`}>
                        {!mine && (
                          <div className="gc-msg-avatar" style={{ background: avatarBg(m.from.nombre) }}>
                            {initials(m.from.nombre)}
                          </div>
                        )}
                        <div className="gc-msg-bubble">
                          <p>{m.texto}</p>
                          <span className="gc-msg-time">{timeAgo(m.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="gc-input-row">
                <textarea
                  className="gc-input"
                  placeholder="Escribe un mensaje..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                />
                <button className="gc-send-btn" onClick={sendMessage} disabled={!text.trim() || sending}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22 11 13 2 9l20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

          ) : view === 'new' ? (
            <div className="global-chat-inner">
              <div className="global-chat-inner-header">
                <button className="global-chat-back" onClick={goBack}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h4>Nuevo mensaje</h4>
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
                  placeholder="Buscar usuario..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="global-chat-list">
                {loadingUsers ? (
                  <div className="global-chat-loading"><div className="global-chat-spinner" /></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="global-chat-empty">No se encontraron usuarios</div>
                ) : filteredUsers.map(u => (
                  <div key={u.id} className="global-chat-conv-item" onClick={() => openChat(u)}>
                    <div className="gc-conv-avatar-wrap">
                      <div className="global-chat-conv-avatar" style={{ background: avatarBg(u.nombre) }}>
                        {u.foto ? <img src={u.foto} alt={u.nombre} /> : initials(u.nombre)}
                      </div>
                    </div>
                    <div className="global-chat-conv-info">
                      <div className="global-chat-conv-folio">{u.nombre}</div>
                      <div className="global-chat-conv-preview" style={{ color: rolColor[u.rol] || '#64748b' }}>
                        {u.rol}{u.estacion ? ` · ${u.estacion}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            <>
              <div className="global-chat-panel-header">
                <h3>💬 Mensajes</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="global-chat-new-btn" onClick={() => setView('new')} title="Nuevo mensaje">
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
                {loadingConvs ? (
                  <div className="global-chat-loading"><div className="global-chat-spinner" /></div>
                ) : conversations.length === 0 ? (
                  <div className="global-chat-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    No hay mensajes aún
                    <button className="global-chat-new-empty-btn" onClick={() => setView('new')}>
                      Iniciar conversación
                    </button>
                  </div>
                ) : conversations.map(conv => (
                  <div
                    key={conv.partnerId}
                    className="global-chat-conv-item"
                    onClick={() => openChat({ id: conv.partnerId, nombre: conv.partnerNombre, rol: conv.partnerRol, foto: conv.partnerFoto })}
                  >
                    <div className="gc-conv-avatar-wrap">
                      <div className="global-chat-conv-avatar" style={{ background: avatarBg(conv.partnerNombre) }}>
                        {conv.partnerFoto ? <img src={conv.partnerFoto} alt={conv.partnerNombre} /> : initials(conv.partnerNombre)}
                      </div>
                      {conv.unread > 0 && <span className="gc-unread-badge">{conv.unread}</span>}
                    </div>
                    <div className="global-chat-conv-info">
                      <div className="global-chat-conv-folio" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{conv.partnerNombre}</span>
                        <span style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}>{timeAgo(conv.lastMessage.createdAt)}</span>
                      </div>
                      <div className="global-chat-conv-preview">
                        {conv.lastMessage.fromMe ? <b>Tú: </b> : null}
                        {conv.lastMessage.texto.substring(0, 50)}{conv.lastMessage.texto.length > 50 ? '…' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <button
        className="global-chat-btn"
        onClick={() => {
          setOpen(v => !v);
          if (!open) { setView('list'); setPartner(null); }
        }}
        aria-label="Abrir mensajes"
      >
        {totalUnread > 0 && !open && <span className="global-chat-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
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
