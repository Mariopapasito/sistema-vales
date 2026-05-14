import bcrypt from 'bcrypt';
import { connectDB } from '../config/database';
import User from '../models/User';

const seedUsers = async () => {
  try {
    await connectDB();

    const users = [
      {
        nombre: 'Admin',
        email: 'admin@grupolavillita.com',
        password: await bcrypt.hash('Demo123', 12),
        rol: 'jefe' as const,
        estacion: 'Principal',
        activo: true,
      },
      {
        nombre: 'Sistemas',
        email: 'sistemas@grupolavillita.com',
        password: await bcrypt.hash('Demo123', 12),
        rol: 'sistemas' as const,
        estacion: 'Principal',
        activo: true,
      },
      {
        nombre: 'Estacion',
        email: 'estacion@grupolavillita.com',
        password: await bcrypt.hash('Demo123', 12),
        rol: 'estacion' as const,
        estacion: 'Línea 1',
        activo: true,
      },
      {
        nombre: 'Compras',
        email: 'compras@grupolavillita.com',
        password: await bcrypt.hash('Demo123', 12),
        rol: 'compras' as const,
        estacion: 'Principal',
        activo: true,
      },
    ];

    for (const userData of users) {
      await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData,
      });
    }

    console.log('✅ Users seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
