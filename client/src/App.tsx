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
import { restoreSession } from './store/slices/authSlice';
import { scheduleTokenRefresh } from './services/tokenService';
import { registerServiceWorker, subscribeToPushNotifications } from './services/pushService';
import { registerSW } from 'virtual:pwa-register';
import OfflineBanner from './components/OfflineBanner';
import './App.css';

// Register PWA service worker
registerSW({ immediate: true });

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { accessToken } = useSelector((state: RootState) => state.auth);

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
    registerServiceWorker();
    subscribeToPushNotifications();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      dispatch(restoreSession());
      scheduleTokenRefresh(token);
      subscribeToPushNotifications();
    }
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
      <Route path="*" element={accessToken ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
      <OfflineBanner />
    </>
  );
}
