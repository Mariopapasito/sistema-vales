import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Sidebar from './Sidebar';
import BrandLoader from './BrandLoader';
import { Bars3Icon } from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';

export default function AppLayout() {
  const { accessToken, initialized } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!initialized) {
    return (
      <BrandLoader variant="page" label="Preparando el sistema..." />
    );
  }

  if (!accessToken) return <Navigate to="/login" />;

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
