import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { RootState, AppDispatch } from './store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateOrder from './pages/CreateOrder';
import OrderDetail from './pages/OrderDetail';
import Calendar from './pages/Calendar';
import Users from './pages/Users';
import Profile from './pages/Profile';
import MonthlyOrders from './pages/MonthlyOrders';
import CreateMonthlyOrder from "./pages/CreateMonthlyOrder";
import MonthlyOrderDetail from "./pages/MonthlyOrderDetail";
import { Reports } from "./pages/Reports";
import ActivityLogs from './pages/ActivityLogs';
import { restoreSession } from './store/slices/authSlice';
import { scheduleTokenRefresh } from './services/tokenService';
import { registerServiceWorker, subscribeToPushNotifications } from './services/pushService';
import OfflineBanner from './components/OfflineBanner';
import './App.css';

// Register PWA service worker

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { accessToken, initialized } = useSelector((state: RootState) => state.auth);

  // While restoring session, show nothing (avoid flash redirect to /login)
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

  return accessToken ? children : <Navigate to="/login" />;
}

export default function App() {
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (accessToken) {

    } else {

    }
  }, [accessToken]);

  useEffect(() => {
    // Always dispatch restoreSession — it handles both valid tokens and refresh token fallback
    dispatch(restoreSession());
    const token = localStorage.getItem('accessToken');
    if (token) {
      scheduleTokenRefresh(token);
    }
    registerServiceWorker();
    subscribeToPushNotifications();
  }, [dispatch]);

  return (
    <>
      <Routes>
          <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-order"
        element={
          <ProtectedRoute>
            <CreateOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={accessToken ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      <Route
        path="/monthly-orders"
        element={
          <ProtectedRoute>
            <MonthlyOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-monthly-order"
        element={
          <ProtectedRoute>
            <CreateMonthlyOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monthly-order/:id"
        element={
          <ProtectedRoute>
            <MonthlyOrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-logs"
        element={
          <ProtectedRoute>
            <ActivityLogs />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={accessToken ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
      <OfflineBanner />
    </>
  );
}
