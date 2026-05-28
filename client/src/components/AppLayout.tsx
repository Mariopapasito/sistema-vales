import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Sidebar from './Sidebar';
import { Bars3Icon } from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';

export default function AppLayout() {
  const { accessToken, initialized } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!initialized) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary, #0f172a)'
      }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
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
