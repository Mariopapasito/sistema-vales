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
import GlobalChat from './components/GlobalChat';
import AppLayout from './components/AppLayout';
import './App.css';

export default function App() {
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
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
        <Route path="/" element={accessToken ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

        {/* Todas las rutas protegidas comparten el mismo AppLayout (Sidebar persiste) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-order" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/users" element={<Users />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/monthly-orders" element={<MonthlyOrders />} />
          <Route path="/create-monthly-order" element={<CreateMonthlyOrder />} />
          <Route path="/monthly-order/:id" element={<MonthlyOrderDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/activity-logs" element={<ActivityLogs />} />
        </Route>

        <Route path="*" element={accessToken ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
      <OfflineBanner />
      <GlobalChat />
    </>
  );
}
