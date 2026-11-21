import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { lazy, Suspense, useEffect } from 'react';
import { RootState, AppDispatch } from './store';
import Login from './pages/Login';
import { restoreSession } from './store/slices/authSlice';
import { scheduleTokenRefresh } from './services/tokenService';
import { registerServiceWorker, subscribeToPushNotifications } from './services/pushService';
import OfflineBanner from './components/OfflineBanner';
import GlobalChat from './components/GlobalChat';
import AppLayout from './components/AppLayout';
import BrandLoader from './components/BrandLoader';
import RoleRoute from './components/RoleRoute';
import './App.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateOrder = lazy(() => import('./pages/CreateOrder'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));
const MonthlyOrders = lazy(() => import('./pages/MonthlyOrders'));
const CreateMonthlyOrder = lazy(() => import('./pages/CreateMonthlyOrder'));
const MonthlyOrderDetail = lazy(() => import('./pages/MonthlyOrderDetail'));
const Reports = lazy(() => import('./pages/Reports').then((module) => ({ default: module.Reports })));
const Bitacoras = lazy(() => import('./pages/Bitacoras'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const Attendance = lazy(() => import('./pages/Attendance'));
const AttendanceClock = lazy(() => import('./pages/AttendanceClock'));

export default function App() {
  const { accessToken, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const home = user?.rol === 'rh' ? '/attendance' : '/dashboard';
  const dispatch = useDispatch<AppDispatch>();

  // Restore session and register service worker once on mount
  useEffect(() => {
    dispatch(restoreSession());
    const token = localStorage.getItem('accessToken');
    if (token) {
      scheduleTokenRefresh(token);
    }
    registerServiceWorker();
  }, [dispatch]);

  // Re-subscribe to push every time the user logs in (accessToken appears)
  useEffect(() => {
    if (accessToken && user && user.rol !== 'rh') {
      subscribeToPushNotifications();
    }
  }, [accessToken, user?.rol]);

  return (
    <>
      <Suspense fallback={<BrandLoader variant="page" label="Cargando pantalla..." />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={accessToken ? <Navigate to={home} /> : <Navigate to="/login" />} />
        <Route path="/attendance/clock" element={<AttendanceClock />} />

        {/* Todas las rutas protegidas comparten el mismo AppLayout (Sidebar persiste) */}
        <Route element={<AppLayout />}>
          <Route path="/attendance" element={<RoleRoute roles={['rh', 'estacion', 'jefe']}><Attendance /></RoleRoute>} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-order" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/calendar" element={<RoleRoute roles={['jefe', 'sistemas']}><Calendar /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute roles={['jefe', 'sistemas']}><Users /></RoleRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/monthly-orders" element={<RoleRoute roles={['jefe', 'compras', 'estacion', 'almacen', 'constructora', 'sistemas']}><MonthlyOrders /></RoleRoute>} />
          <Route path="/create-monthly-order" element={<RoleRoute roles={['jefe', 'compras', 'estacion', 'almacen', 'constructora', 'sistemas']}><CreateMonthlyOrder /></RoleRoute>} />
          <Route path="/monthly-order/:id" element={<RoleRoute roles={['jefe', 'compras', 'estacion', 'almacen', 'constructora', 'sistemas']}><MonthlyOrderDetail /></RoleRoute>} />
          <Route path="/reports" element={<RoleRoute roles={['jefe', 'sistemas', 'compras']}><Reports /></RoleRoute>} />
          <Route path="/bitacoras" element={<RoleRoute roles={['jefe', 'estacion']}><Bitacoras /></RoleRoute>} />
          <Route path="/activity-logs" element={<RoleRoute roles={['jefe', 'sistemas']}><ActivityLogs /></RoleRoute>} />
        </Route>

        <Route path="*" element={accessToken ? <Navigate to={home} /> : <Navigate to="/login" />} />
      </Routes>
      </Suspense>
      <OfflineBanner />
      {user?.rol !== 'rh' && location.pathname !== '/attendance/clock' && <GlobalChat />}
    </>
  );
}
