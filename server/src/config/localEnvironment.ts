import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

export function validateLocalDatabase(env: NodeJS.ProcessEnv): void {
  if (!['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST || '')) {
    throw new Error('Modo local: DB_HOST debe ser una dirección de loopback. No se permiten servidores remotos.');
  }
  if (!/^[a-zA-Z0-9_]+_(local|test)$/.test(env.DB_NAME || '')) {
    throw new Error('Modo local: DB_NAME debe terminar en _local o _test.');
  }
  const port = Number(env.DB_PORT || '3306');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Modo local: DB_PORT inválido.');
}

export function configureLocalEnvironment(): void {
  const localFile = path.resolve(__dirname, '../../.env.local');
  if (!existsSync(localFile)) throw new Error('Falta server/.env.local. Copia .env.local.example y configura exclusivamente tu MySQL local.');
  // dotenv/config in app.ts must never load server/.env (which may contain remote credentials).
  dotenv.config({ path: localFile, override: true });
  process.env.DOTENV_CONFIG_PATH = localFile;
  process.env.VALES_LOCAL_ONLY = '1';
  process.env.NODE_ENV = 'development';
  validateLocalDatabase(process.env);
}
