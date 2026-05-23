import { Sequelize } from 'sequelize';

const dbUrl = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;

const pool = { max: 5, min: 1, acquire: 60000, idle: 300000 };

const dialectOptions: any = {
  connectTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
};

if (dbUrl) {
  dialectOptions.ssl = { rejectUnauthorized: false };
}

const sequelize = dbUrl
  ? new Sequelize(dbUrl, { dialect: 'mysql', logging: false, pool, dialectOptions })
  : new Sequelize({
      dialect: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sistema_vales',
      logging: false,
      pool,
      dialectOptions,
    });

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false, force: false });
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    throw error;
  }
};

export default sequelize;
