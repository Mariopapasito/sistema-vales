import bcrypt from 'bcrypt';
import User from '../models/User';

const seedUsers = [
  {
    nombre: 'Administrador',
    email: 'admin@grupolavillita.com',
    password: 'Demo123',
    rol: 'jefe' as const,
    estacion: 'Oficina Central',
    activo: true
  },
  {
    nombre: 'Juan Perez',
    email: 'sistemas@grupolavillita.com',
    password: 'Demo123',
    rol: 'sistemas' as const,
    estacion: 'Departamento de Sistemas',
    activo: true
  },
  {
    nombre: 'Maria Garcia',
    email: 'estacion1@grupolavillita.com',
    password: 'Demo123',
    rol: 'estacion' as const,
    estacion: 'Estacion Norte',
    activo: true
  },
  {
    nombre: 'Carlos Rodriguez',
    email: 'estacion2@grupolavillita.com',
    password: 'Demo123',
    rol: 'estacion' as const,
    estacion: 'Estacion Sur',
    activo: true
  },
  {
    nombre: 'Ana Martinez',
    email: 'compras@grupolavillita.com',
    password: 'Demo123',
    rol: 'compras' as const,
    estacion: 'Departamento de Compras',
    activo: true
  }
];

export const seedDatabase = async () => {
  try {
    // Check if users already exist
    const existingCount = await User.count();
    if (existingCount > 0) {
      console.log('Database already seeded. Skipping seed.');
      return;
    }

    console.log('Seeding database with test users...');
    
    for (const user of seedUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      await User.create({
        nombre: user.nombre,
        email: user.email,
        password: hashedPassword,
        rol: user.rol,
        estacion: user.estacion,
        activo: user.activo
      });
      console.log(`✓ Created user: ${user.email} (${user.rol})`);
    }

    console.log('\n=== Seed completed successfully! ===');
    console.log('\nTest credentials:');
    console.log('-------------------');
    console.log('Email: sistemas@grupolavillita.com');
    console.log('Password: Demo123');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// Run seed function when this module is imported
// Use setTimeout to avoid blocking event loop
setTimeout(() => {
  seedDatabase().catch(err => console.error('Seed error:', err));
}, 100);
