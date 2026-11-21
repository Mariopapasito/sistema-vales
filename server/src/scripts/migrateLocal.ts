import { configureLocalEnvironment } from '../config/localEnvironment';

async function main() {
  configureLocalEnvironment();
  await import('../app'); // Register the same models as normal startup, without opening the HTTP port.
  const { default: sequelize, connectDB } = await import('../config/database');
  try {
    await connectDB();
    const { runSchemaMigrations } = await import('../config/schemaMigrations');
    await runSchemaMigrations();
    console.log(`[LOCAL] Esquema actualizado en ${process.env.DB_NAME}. No se borraron tablas ni registros.`);
  } finally { await sequelize.close(); }
}
main().catch(error => { console.error('[LOCAL]', error.message); process.exitCode = 1; });
