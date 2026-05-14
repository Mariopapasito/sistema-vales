import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/database';
import auth from './routes/auth';
import orders from './routes/orders';
import users from './routes/users';
import calendar from './routes/calendar';
import User from './models/User';
import Order from './models/Order';
import CalendarEvent from './models/CalendarEvent';
import sequelize from './config/database';

const app = express();

console.log('[DEBUG] Setting up middleware...');

app.use(helmet());
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], 
  credentials: true 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

console.log('[DEBUG] Connecting to DB...');
connectDB().catch(err => {
  console.error('[ERROR] DB connection failed:', err);
  process.exit(1);
});

console.log('[DEBUG] Setting up associations...');
User.hasMany(Order, { foreignKey: 'usuarioId' });
Order.belongsTo(User, { foreignKey: 'usuarioId' });
User.hasMany(CalendarEvent, { foreignKey: 'createdBy', as: 'events' });
CalendarEvent.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

console.log('[DEBUG] Syncing DB...');
(async () => {
  try {
    await sequelize.sync({ force: false, alter: false });
    console.log('[DEBUG] Database synced successfully');
  } catch (error) {
    console.error('[ERROR] Failed to sync database:', error);
  }
})();

console.log('[DEBUG] Loading routes...');
app.use('/api/auth', auth);
app.use('/api/orders', orders);
app.use('/api/users', users);
app.use('/api/calendar', calendar);

app.get('/api/health', (req, res) => {
  console.log('[DEBUG] Health check');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

console.log('[DEBUG] Starting server...');
app.listen(PORT, () => {
  console.log(`[INFO] Server running on port ${PORT}`);
  console.log(`[INFO] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
