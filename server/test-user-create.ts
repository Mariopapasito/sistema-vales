import 'dotenv/config';
import sequelize from './src/config/database';
import User from './src/models/User';
import bcrypt from 'bcrypt';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    
    const hashedPassword = await bcrypt.hash('pass123', 12);
    console.log('Password hashed');
    
    const user = await User.create({
      nombre: 'Test',
      email: `test-${Date.now()}@test.com`,
      password: hashedPassword,
      rol: 'jefe',
      estacion: 'Central'
    });
    
    console.log('User created:', user.id);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

test();
