import { Sequelize } from 'sequelize';

const dbUrl = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;

const sequelize = dbUrl
  ? new Sequelize(dbUrl, { dialect: 'mysql', logging: false, dialectOptions: { ssl: { rejectUnauthorized: false } } })
  : new Sequelize({
      dialect: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sistema_vales',
      logging: false,
    });

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected successfully');
    await sequelize.sync({ alter: false, force: false });
    console.log('Database synchronized');
  } catch (error) {
    console.error('MySQL connection failed:', error);
    throw error;
  }
};

export default sequelize;
