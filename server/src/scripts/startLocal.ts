import { configureLocalEnvironment } from '../config/localEnvironment';

async function main() {
  configureLocalEnvironment();
  const { startServer } = await import('../app');
  console.log(`[LOCAL] MySQL ${process.env.DB_HOST}:${process.env.DB_PORT || '3306'} / ${process.env.DB_NAME}. Conexiones remotas bloqueadas.`);
  await startServer();
}
main().catch(error => { console.error('[LOCAL]', error.message); process.exitCode = 1; });
