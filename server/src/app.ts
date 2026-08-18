import 'dotenv/config';
import MonthlyOrder from './models/MonthlyOrder';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { connectDB } from './config/database';

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
import ActivityLog from './models/ActivityLog';
import DirectMessage from './models/DirectMessage';
import messagesRoutes from './routes/messages';

import sequelize from './config/database';

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
app.use(express.static('public', {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
})); // Servir archivos estáticos

connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
  // Retry once after 5s instead of crashing
  setTimeout(() => {
    connectDB().catch(() => process.exit(1));
  }, 5000);
});

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

// Sincronizar base de datos
(async () => {
  try {
    await sequelize.sync({ force: false, alter: false });
    // Create push_subscriptions table if not exists (not a Sequelize model)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_endpoint (endpoint(255)),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await ActivityLog.sync({ force: false });
    await DirectMessage.sync({ force: false });
    // Ensure users.rol ENUM includes almacen and constructora
    await sequelize.query(`
      ALTER TABLE users MODIFY COLUMN rol ENUM('jefe','sistemas','estacion','compras','almacen','constructora','marketing') NOT NULL DEFAULT 'estacion'
    `).catch(() => { /* already up to date */ });
    // Ensure users.estacion allows NULL (for roles like jefe/sistemas that don't have a station)
    await sequelize.query(`
      ALTER TABLE users MODIFY COLUMN estacion VARCHAR(255) NULL
    `).catch(() => { /* already up to date */ });
    // Ensure report_photos stores the bitácora category for stations and bosses
    const reportPhotoCols = await sequelize.query('SHOW COLUMNS FROM report_photos').catch(() => [] as any[]);
    const hasTipoColumn = Array.isArray(reportPhotoCols[0]) && reportPhotoCols[0].some((col: any) => col.Field === 'tipo');
    if (!hasTipoColumn) {
      await sequelize.query(`
        ALTER TABLE report_photos ADD COLUMN tipo ENUM('estacion','jefe') NOT NULL DEFAULT 'estacion'
      `);
      await sequelize.query(`
        UPDATE report_photos SET tipo = 'estacion' WHERE tipo IS NULL OR tipo = ''
      `);
    }
    // Ensure notifications.tipo ENUM includes COMMENT
    await sequelize.query(`
      ALTER TABLE notifications MODIFY COLUMN tipo ENUM('NEW_ORDER','ORDER_STATUS_CHANGED','CALENDAR_EVENT','SYSTEM','MENTION','COMMENT') NOT NULL
    `).catch(() => { /* already up to date */ });
    // Ensure monthly_orders.tipo ENUM includes toner and imprenta
    await sequelize.query(`
      ALTER TABLE monthly_orders MODIFY COLUMN tipo ENUM('aceites','papeleria','limpieza','toner','imprenta') NOT NULL
    `).catch(() => { /* already up to date */ });
    // keep running — DB already up to date
  } catch (error) {
    console.error('[DB] Failed to sync database:', error);
  }
})();

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

httpServer.listen(PORT, '0.0.0.0', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Server on http://0.0.0.0:${PORT}`);
  }
});

export default app;
