import 'dotenv/config';
import MonthlyOrder from './models/MonthlyOrder';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { connectDB } from './config/database';
import { runSchemaMigrations } from './config/schemaMigrations';

import authRoutes from './routes/auth';
import orderRoutes from './routes/orders';
import usersRoutes from './routes/users';
import calendarRoutes from './routes/calendar';
import materialsRoutes from './routes/materials';
import workReportsRoutes from './routes/workReports';
import reportPhotosRoutes from './routes/reportPhotos';
import { pushRoutes } from './routes/push';
import monthlyOrdersRoutes from './routes/monthlyOrders';
import User from './models/User';
import Order from './models/Order';
import CalendarEvent from './models/CalendarEvent';
import WorkReport from './models/WorkReport';
import ReportPhoto from './models/ReportPhoto';
import Material from './models/Material';
import MaterialUsage from './models/MaterialUsage';
import Notification from './models/Notification';
import OrderComment from './models/OrderComment';
import MonthlyOrderComment from './models/MonthlyOrderComment';
import monthlyOrderCommentRoutes from './routes/monthlyOrderComments';
import notificationRoutes from './routes/notifications';
import orderCommentRoutes from './routes/orderComments';
import activityLogsRoutes from './routes/activityLogs';
import messagesRoutes from './routes/messages';
import bitacoraRoutes from './routes/bitacoras';
import Bitacora from './models/Bitacora';

const app = express();

// Catch all unhandled errors at process level
process.on('uncaughtException', (err) => {
  console.error('[FATAL ERROR]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins: (string | RegExp)[] = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  /^\/\/192\.168\.\d+\.\d+:\d+$/,
  /^\/\/10\.\d+\.\d+\.\d+:\d+$/,
];

if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',').forEach(o => allowedOrigins.push(o.trim()));
}

app.use(cors({
  origin: isProd ? true : allowedOrigins,
  credentials: true,
}));

// Middleware para permitir CORS en archivos estáticos - DEBE estar DESPUÉS de helmet
app.use((req, res, next) => {
  if (req.path.startsWith('/reports') || req.path === '/logo.png') {
    res.removeHeader('Cross-Origin-Resource-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Las respuestas autenticadas cambian por usuario y deben venir siempre del servidor.
// Evita contadores/listas antiguos y que un caché compartido mezcle bandejas entre roles.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});

app.use(express.static('public', {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
})); // Servir archivos estáticos

// Configurar asociaciones
User.hasMany(Order, { foreignKey: 'usuarioId' });
Order.belongsTo(User, { foreignKey: 'usuarioId' });

User.hasMany(CalendarEvent, { foreignKey: 'createdBy', as: 'events' });
CalendarEvent.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// WorkReport Associations
Order.hasOne(WorkReport, { foreignKey: 'orderId', as: 'workReport' });
WorkReport.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

User.hasMany(WorkReport, { foreignKey: 'createdById', as: 'createdReports' });
WorkReport.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

User.hasMany(WorkReport, { foreignKey: 'assignedToId', as: 'assignedReports' });
WorkReport.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' });

WorkReport.hasMany(MaterialUsage, { foreignKey: 'workReportId', as: 'materials' });
MaterialUsage.belongsTo(WorkReport, { foreignKey: 'workReportId', as: 'workReport' });

Material.hasMany(MaterialUsage, { foreignKey: 'materialId', as: 'usage' });
MaterialUsage.belongsTo(Material, { foreignKey: 'materialId', as: 'material' });

// ReportPhoto Associations
User.hasMany(ReportPhoto, { foreignKey: 'userId', as: 'reportPhotos' });
ReportPhoto.belongsTo(User, { foreignKey: 'userId' });

// Bitacora Associations
User.hasMany(Bitacora, { foreignKey: 'userId', as: 'bitacoras' });
Bitacora.belongsTo(User, { foreignKey: 'userId' });

// MonthlyOrder Associations
User.hasMany(MonthlyOrder, { foreignKey: 'createdBy', as: 'monthlyOrders' });
MonthlyOrder.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser' });

// Notification Associations
User.hasMany(Notification, { foreignKey: 'usuarioId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'usuarioId' });

// OrderComment Associations
Order.hasMany(OrderComment, { foreignKey: 'orderId', as: 'comments' });
OrderComment.belongsTo(Order, { foreignKey: 'orderId' });
OrderComment.belongsTo(User, { foreignKey: 'usuarioId', as: 'author' });
User.hasMany(OrderComment, { foreignKey: 'usuarioId' });

// MonthlyOrderComment Associations
MonthlyOrder.hasMany(MonthlyOrderComment, { foreignKey: 'monthlyOrderId', as: 'comments' });
MonthlyOrderComment.belongsTo(MonthlyOrder, { foreignKey: 'monthlyOrderId' });
MonthlyOrderComment.belongsTo(User, { foreignKey: 'usuarioId', as: 'author' });
User.hasMany(MonthlyOrderComment, { foreignKey: 'usuarioId' });

if (isProd) {
  const clientBuild = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuild));
}

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/monthly-orders', monthlyOrdersRoutes);
app.use('/api/work-reports', workReportsRoutes);
app.use('/api/reports', reportPhotosRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderCommentRoutes);
app.use('/api/monthly-orders', monthlyOrderCommentRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/bitacoras', bitacoraRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (isProd) {
  const clientBuild = path.join(__dirname, '../../client/dist');
  app.get('*', (_req: any, res: any) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.use((err: any, req: any, res: any, next: any) => {
  console.error('[ERROR MIDDLEWARE]', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

const httpServer = http.createServer(app);

export const startServer = async (): Promise<void> => {
  await connectDB();
  await runSchemaMigrations();

  httpServer.listen(PORT, '0.0.0.0', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Server on http://0.0.0.0:${PORT}`);
    }
  });
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('[STARTUP] No se pudo iniciar el servidor:', error);
    process.exit(1);
  });
}

export default app;
