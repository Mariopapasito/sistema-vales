import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import React, { useState, useEffect, useRef } from 'react';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  CalendarDaysIcon,
  UsersIcon,
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon,
  DocumentChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import '../styles/Sidebar.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth > 768
  );
  const [pillStyle, setPillStyle] = useState<{ top: number; height: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updatePill = () => {
      if (activeRef.current && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const elRect = activeRef.current.getBoundingClientRect();
        setPillStyle({
          top: elRect.top - navRect.top + navRef.current.scrollTop,
          height: activeRef.current.offsetHeight,
        });
      }
    };
    // Small timeout so DOM has fully painted refs
    const t = setTimeout(updatePill, 10);
    return () => clearTimeout(t);
  }, [location.pathname, user?.rol]);

  const shouldBeOpen = isDesktop || isOpen;

  const handleLogout = () => {
    dispatch(logout() as any);
    navigate('/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (onClose && !isDesktop) onClose();
  };

  const handleClose = () => { if (onClose) onClose(); };

  const isActive = (path: string) => location.pathname === path;
  const navClass = (path: string) => `nav-item${isActive(path) ? ' nav-item--active' : ''}`;
  const refIfActive = (path: string): React.RefObject<HTMLButtonElement> | undefined => isActive(path) ? activeRef : undefined;

  return (
    <>
      <div 
        className={`sidebar-overlay ${!isDesktop && isOpen ? 'active' : ''}`}
        onClick={handleClose}
        style={{ display: !isDesktop && isOpen ? 'block' : 'none' }}
      />
      
      <aside className={`sidebar ${shouldBeOpen ? 'open' : 'closed'}`}>
        {/* Botón de cerrar - solo en mobile */}
        <div className="sidebar-close-btn">
          <button onClick={handleClose} className="close-icon" title="Cerrar menú">
            <XMarkIcon style={{ width: 24, height: 24 }} />
          </button>
        </div>

        {/* Logo */}
        <div className="sidebar-logo-top">
          <img src="/sidebar-logo.png" alt="La Villita" className="sidebar-logo-img" />
        </div>

        {/* Info del usuario */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.foto ? (
              <img src={user.foto} alt={user.nombre} />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-info">
            <p className="user-name">{user?.nombre || 'Usuario'}</p>
            <p className="user-role">{user?.rol === 'jefe' ? 'Jefe' : user?.rol === 'sistemas' ? 'Sistemas' : user?.rol === 'estacion' ? 'Estación' : user?.rol === 'almacen' ? 'Almacén' : user?.rol === 'constructora' ? 'Constructora' : 'Compras'}</p>
            <p className="user-station">{user?.estacion || 'N/A'}</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav" ref={navRef}>
          {/* Glass pill slider */}
          {pillStyle && (
            <div
              className="nav-pill"
              style={{ top: pillStyle.top, height: pillStyle.height }}
            />
          )}

          {/* Dashboard - Todos */}
          <button ref={refIfActive('/dashboard')} onClick={() => handleNavClick('/dashboard')} className={navClass('/dashboard')}>
            <ClipboardDocumentListIcon className="nav-icon" />
            <span className="nav-text">Vales</span>
          </button>

          {/* Create Order - Estacion + roles similares */}
          {['estacion', 'almacen', 'constructora'].includes(user?.rol || '') && (
            <button ref={refIfActive('/create-order')} onClick={() => handleNavClick('/create-order')} className={navClass('/create-order')}>
              <PlusCircleIcon className="nav-icon" />
              <span className="nav-text">Crear Vale</span>
            </button>
          )}

          {/* Monthly Orders - Jefe, Compras & Estacion */}
          {(user?.rol === 'jefe' || user?.rol === 'compras' || user?.rol === 'estacion') && (
            <button ref={refIfActive('/monthly-orders')} onClick={() => handleNavClick('/monthly-orders')} className={navClass('/monthly-orders')}>
              <ArchiveBoxIcon className="nav-icon" />
              <span className="nav-text">Pedidos Mensuales</span>
            </button>
          )}

          {/* Calendar - Jefe & Sistemas */}
          {(user?.rol === 'jefe' || user?.rol === 'sistemas') && (
            <button ref={refIfActive('/calendar')} onClick={() => handleNavClick('/calendar')} className={navClass('/calendar')}>
              <CalendarDaysIcon className="nav-icon" />
              <span className="nav-text">Calendario</span>
            </button>
          )}

          {/* Reports - Jefe & Sistemas */}
          {(user?.rol === 'jefe' || user?.rol === 'sistemas') && (
            <button ref={refIfActive('/reports')} onClick={() => handleNavClick('/reports')} className={navClass('/reports')}>
              <DocumentChartBarIcon className="nav-icon" />
              <span className="nav-text">Reportes</span>
            </button>
          )}

          {/* Users - Jefe & Sistemas */}
          {(user?.rol === 'jefe' || user?.rol === 'sistemas') && (
            <button ref={refIfActive('/users')} onClick={() => handleNavClick('/users')} className={navClass('/users')}>
              <UsersIcon className="nav-icon" />
              <span className="nav-text">Usuarios</span>
            </button>
          )}

          {/* Activity Logs - Jefe & Sistemas */}
          {(user?.rol === 'jefe' || user?.rol === 'sistemas') && (
            <button ref={refIfActive('/activity-logs')} onClick={() => handleNavClick('/activity-logs')} className={navClass('/activity-logs')}>
              <ClipboardDocumentListIcon className="nav-icon" />
              <span className="nav-text">Logs</span>
            </button>
          )}

          {/* Profile - Todos */}
          <button ref={refIfActive('/profile')} onClick={() => handleNavClick('/profile')} className={navClass('/profile')}>
            <WrenchScrewdriverIcon className="nav-icon" />
            <span className="nav-text">Mi Perfil</span>
          </button>
        </nav>

        {/* Botón de salir */}
        <button onClick={handleLogout} className="btn-logout">
          <ArrowRightOnRectangleIcon style={{ width: 20, height: 20 }} />
          Salir
        </button>
      </aside>
    </>
  );
}
