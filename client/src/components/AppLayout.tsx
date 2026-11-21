import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Sidebar from './Sidebar';
import BrandLoader from './BrandLoader';
import { Bars3Icon } from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';

export default function AppLayout() {
  const { accessToken, initialized, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', sidebarOpen);

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('mobile-menu-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [sidebarOpen]);

  if (!initialized) {
    return (
      <BrandLoader variant="page" label="Preparando el sistema..." />
    );
  }

  if (!accessToken) return <Navigate to="/login" />;
  if (user?.rol === 'rh' && !['/attendance', '/profile'].includes(location.pathname)) return <Navigate to="/attendance" replace />;

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="dashboard-main">
        <div className="dashboard-header-mobile">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)} title="Abrir menú">
            <Bars3Icon style={{ width: 24, height: 24 }} />
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
