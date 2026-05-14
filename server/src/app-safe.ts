import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/database';
import authRoutes from './routes/auth';
import orderRoutes from './routes/orders';
import usersRoutes from './routes/users';
import calendarRoutes from './routes/calendar';
import User from './models/User';
import Order from './models/Order';
import CalendarEvent from './models/CalendarEvent';
import sequelize from './config/database';

const app = express();

// Catch all unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[FATAL ERROR]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

app.use(helmet());
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], 
  credentials: true 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global error handling middleware - MUST BE FIRST
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[ERROR MIDDLEWARE]', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Configurar asociaciones
User.hasMany(Order, { foreignKey: 'usuarioId' });
Order.belongsTo(User, { foreignKey: 'usuarioId' });

User.hasMany(CalendarEvent, { foreignKey: 'createdBy', as: 'events' });
CalendarEvent.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Sincronizar base de datos
(async () => {
  try {
    await sequelize.sync({ force: false, alter: false });
    console.log('Database synced successfully');
  } catch (error) {
    console.error('Failed to sync database:', error);
  }
})();

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/calendar', calendarRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
