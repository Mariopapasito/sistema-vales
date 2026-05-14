import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import {
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import './OrderComments.css';

interface Author {
  id: number;
  nombre: string;
  rol: string;
  foto?: string;
}

interface Comment {
  id: number;
  orderId: number;
  usuarioId: number;
  texto: string;
  createdAt: string;
  author?: Author;
}

interface OrderCommentsProps {
  orderId: number;
  basePath?: string; // 'orders' | 'monthly-orders', defaults to 'orders'
}

interface MentionUser {
  id: number;
  nombre: string;
  rol: string;
}

const rolLabel: Record<string, string> = {
  jefe: 'Jefe',
  sistemas: 'Sistemas',
  estacion: 'Estación',
  compras: 'Compras',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days !== 1 ? 's' : ''}`;
}

/** Render comment text with highlighted @mentions */
function renderText(texto: string) {
  const parts = texto.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="mention-highlight">{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

const OrderComments: React.FC<OrderCommentsProps> = ({ orderId, basePath = 'orders' }) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [orderUsuarioId, setOrderUsuarioId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAtBottomRef = useRef(true);

  // @mention autocomplete state
  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const canComment =
    currentUser?.rol === 'sistemas' ||
    currentUser?.rol === 'jefe' ||
    currentUser?.rol === 'compras' ||
    (orderUsuarioId !== null && currentUser?.id === orderUsuarioId);

  const fetchComments = useCallback(async (initial = false) => {
    try {
      const res = await api.get(`/${basePath}/${orderId}/comments`);
      const { comments: newComments, orderUsuarioId: ownerId } = res.data;
      if (initial) {
        setOrderUsuarioId(ownerId);
        setComments(newComments);
        setLoading(false);
      } else {
        setComments(prev => {
          // Only update if data actually changed (avoid re-render flicker)
          if (JSON.stringify(prev.map(c => c.id)) === JSON.stringify(newComments.map((c: Comment) => c.id))) return prev;
          return newComments;
        });
      }
    } catch (err) {
      if (initial) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchComments(true);
    // Fetch users for mention autocomplete
    api.get('/users').then(res => {
      const users = res.data?.users ?? res.data;
      setAllUsers(Array.isArray(users) ? users : []);
    }).catch(console.error);

    // Polling every 5 seconds for real-time updates
    pollingRef.current = setInterval(() => fetchComments(false), 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [orderId, fetchComments]);

  // Auto-scroll only if user is near the bottom
  const listRef = useRef<HTMLDivElement>(null);
  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  /** Detect @mention trigger and filter users */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart ?? val.length;
    const beforeCursor = val.slice(0, cursor);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setMentionQuery(query);
      setMentionActive(true);
      setMentionIndex(0);
    } else {
      setMentionActive(false);
    }
  }, []);

  const filteredUsers = mentionActive
    ? allUsers.filter(u =>
        u.nombre.toLowerCase().includes(mentionQuery) &&
        u.id !== currentUser?.id
      ).slice(0, 5)
    : [];

  /** Insert selected user into text */
  const selectMention = (user: MentionUser) => {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const beforeCursor = text.slice(0, cursor);
    const afterCursor = text.slice(cursor);
    const newBefore = beforeCursor.replace(/@(\w*)$/, `@${user.nombre.split(' ')[0]} `);
    setText(newBefore + afterCursor);
    setMentionActive(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionActive && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, filteredUsers.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(filteredUsers[mentionIndex]); return; }
      if (e.key === 'Escape')    { setMentionActive(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !mentionActive) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/${basePath}/${orderId}/comments`, { texto: text.trim() });
      setComments(prev => [...prev, res.data]);
      setText('');
    } catch (err) {
      console.error('Error sending comment:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    setDeletingId(commentId);
    try {
      await api.delete(`/${basePath}/${orderId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (comment: Comment) =>
    comment.usuarioId === currentUser?.id ||
    ['jefe', 'sistemas'].includes(currentUser?.rol || '');

  return (
    <div className="order-comments">
      <div className="comments-header">
        <ChatBubbleLeftIcon className="comments-header-icon" />
        <h3>Notas y Comentarios</h3>
        <span className="comments-count">{comments.length}</span>
        <span className="comments-live-dot" title="Actualización en tiempo real" />
      </div>

      <div className="comments-list" ref={listRef} onScroll={handleScroll}>
        {loading ? (
          <div className="comments-loading">Cargando comentarios...</div>
        ) : comments.length === 0 ? (
          <div className="comments-empty">
            <ChatBubbleLeftIcon style={{ width: 32, height: 32, color: '#cbd5e1' }} />
            <p>Aún no hay comentarios.</p>
          </div>
        ) : (
          comments.map(comment => {
            const isOwn = comment.usuarioId === currentUser?.id;
            return (
              <div key={comment.id} className={`comment-item ${isOwn ? 'own' : 'other'}`}>
                <div className="comment-avatar">
                  {comment.author?.foto ? (
                    <img src={comment.author.foto} alt={comment.author.nombre} />
                  ) : (
                    <UserCircleIcon style={{ width: 32, height: 32, color: '#94a3b8' }} />
                  )}
                </div>
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-author">{comment.author?.nombre || 'Usuario'}</span>
                    <span className={`comment-rol rol-${comment.author?.rol}`}>
                      {rolLabel[comment.author?.rol || ''] || comment.author?.rol}
                    </span>
                    <span className="comment-time">{timeAgo(comment.createdAt)}</span>
                    {canDelete(comment) && (
                      <button
                        className="comment-delete"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        title="Eliminar comentario"
                      >
                        <TrashIcon style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                  </div>
                  <div className="comment-text">{renderText(comment.texto)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {canComment ? (
        <form className="comment-form" onSubmit={handleSend}>
          <div className="comment-input-wrapper">
            {mentionActive && filteredUsers.length > 0 && (
              <ul className="mention-dropdown">
                {filteredUsers.map((u, i) => (
                  <li
                    key={u.id}
                    className={`mention-option ${i === mentionIndex ? 'active' : ''}`}
                    onMouseDown={() => selectMention(u)}
                  >
                    <UserCircleIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                    <span className="mention-name">{u.nombre}</span>
                    <span className={`comment-rol rol-${u.rol}`}>{rolLabel[u.rol] || u.rol}</span>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              ref={textareaRef}
              className="comment-input"
              placeholder="Escribe un comentario... usa @nombre para mencionar"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={2}
              maxLength={1000}
              disabled={sending}
            />
          </div>
          <div className="comment-form-footer">
            <span className="comment-hint">@ para mencionar · Enter envía · Shift+Enter nueva línea</span>
            <button
              type="submit"
              className="comment-send-btn"
              disabled={!text.trim() || sending}
            >
              <PaperAirplaneIcon style={{ width: 16, height: 16 }} />
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-no-permission">
          Solo puedes mencionar en esta orden usando @nombre en tus propias órdenes.
        </div>
      )}
    </div>
  );
};

export default OrderComments;

