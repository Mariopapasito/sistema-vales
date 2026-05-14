import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  CalendarDaysIcon,
  UsersIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
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
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;
  const shouldBeOpen = isDesktop || isOpen;

  const handleLogout = () => {
    dispatch(logout() as any);
    navigate('/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    // Cierra el sidebar inmediatamente
    if (onClose && !isDesktop) {
      onClose();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

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
            <p className="user-role">{user?.rol === 'jefe' ? 'Jefe' : user?.rol === 'sistemas' ? 'Sistemas' : user?.rol === 'estacion' ? 'Estación' : 'Compras'}</p>
            <p className="user-station">{user?.estacion || 'N/A'}</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav">
          {/* Dashboard - Todos */}
          <button onClick={() => handleNavClick('/dashboard')} className="nav-item">
            <ClipboardDocumentListIcon className="nav-icon" />
            <span className="nav-text">Vales</span>
          </button>

          {/* Create Order - Solo Estacion */}
          {user?.rol === 'estacion' && (
            <button onClick={() => handleNavClick('/create-order')} className="nav-item">
              <PlusCircleIcon className="nav-icon" />
              <span className="nav-text">Crear Vale</span>
            </button>
          )}

          {/* Create Monthly Order - Estacion & Jefe */}
          {(user?.rol === 'estacion' || user?.rol === 'jefe') && (
            <button onClick={() => handleNavClick('/create-monthly-order')} className="nav-item">
              <PlusCircleIcon className="nav-icon" />
              <span className="nav-text">Crear Pedido Mensual</span>
            </button>
          )}

          {/* Monthly Orders - Jefe & Compras */}
          {(user?.rol === 'jefe' || user?.rol === 'compras') && (
            <button onClick={() => handleNavClick('/monthly-orders')} className="nav-item">
              <ArchiveBoxIcon className="nav-icon" />
              <span className="nav-text">Pedidos Mensuales</span>
            </button>
          )}

          {/* Calendar - Jefe & Sistemas */}
          {(user?.rol === 'jefe' || user?.rol === 'sistemas') && (
            <button onClick={() => handleNavClick('/calendar')} className="nav-item">
              <CalendarDaysIcon className="nav-icon" />
              <span className="nav-text">Calendario</span>
            </button>
          )}

          {/* Reports - Jefe & Sistemas */}
          {(user?.rol === 'jefe' || user?.rol === 'sistemas') && (
            <button onClick={() => handleNavClick('/reports')} className="nav-item">
              <DocumentChartBarIcon className="nav-icon" />
              <span className="nav-text">Reportes</span>
            </button>
          )}

          {/* Users - Jefe & Sistemas */}
          {(user?.rol === 'jefe' || user?.rol === 'sistemas') && (
            <button onClick={() => handleNavClick('/users')} className="nav-item">
              <UsersIcon className="nav-icon" />
              <span className="nav-text">Usuarios</span>
            </button>
          )}

          {/* Settings - Solo Jefe */}
          {user?.rol === 'jefe' && (
            <button onClick={() => handleNavClick('/profile')} className="nav-item">
              <Cog6ToothIcon className="nav-icon" />
              <span className="nav-text">Ajustes</span>
            </button>
          )}

          {/* Profile - Todos */}
          <button onClick={() => handleNavClick('/profile')} className="nav-item">
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
