import 'dotenv/config';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { gzipSync, gunzipSync } from 'zlib';
import path from 'path';
import sequelize, { connectDB } from '../config/database';

interface TableBackup {
  name: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

interface DatabaseBackup {
  format: 'sistema-vales-json-backup';
  version: 1;
  createdAt: string;
  database: string;
  tables: TableBackup[];
}

const safeTableName = (name: string): string => {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error(`Nombre de tabla no válido: ${name}`);
  return name;
};

const jsonReplacer = (_key: string, value: unknown) => {
  if (Buffer.isBuffer(value)) return { __backupType: 'buffer', data: value.toString('base64') };
  if ((value as any)?.type === 'Buffer' && Array.isArray((value as any).data)) {
    return { __backupType: 'buffer', data: Buffer.from((value as any).data).toString('base64') };
  }
  if (typeof value === 'bigint') return { __backupType: 'bigint', data: value.toString() };
  return value;
};

const jsonReviver = (_key: string, value: any) => {
  if (value?.__backupType === 'buffer') return Buffer.from(value.data, 'base64');
  if (value?.__backupType === 'bigint') return value.data;
  return value;
};

const checksum = (buffer: Buffer): string => createHash('sha256').update(buffer).digest('hex');

const loadBackup = (filePath: string): { backup: DatabaseBackup; compressed: Buffer } => {
  if (!existsSync(filePath)) throw new Error(`No existe el respaldo: ${filePath}`);
  const compressed = readFileSync(filePath);
  const expectedChecksumPath = `${filePath}.sha256`;
  if (!existsSync(expectedChecksumPath)) throw new Error('Falta el archivo de integridad .sha256');
  const expected = readFileSync(expectedChecksumPath, 'utf8').trim().split(/\s+/)[0];
  const actual = checksum(compressed);
  if (expected !== actual) throw new Error('El respaldo está dañado: la firma SHA-256 no coincide');

  const backup = JSON.parse(gunzipSync(compressed).toString('utf8'), jsonReviver) as DatabaseBackup;
  if (backup.format !== 'sistema-vales-json-backup' || backup.version !== 1 || !Array.isArray(backup.tables)) {
    throw new Error('Formato de respaldo no reconocido');
  }
  return { backup, compressed };
};

async function createBackup(outputArgument?: string): Promise<void> {
  await connectDB();
  const [databaseRows] = await sequelize.query('SELECT DATABASE() AS databaseName');
  const database = String((databaseRows[0] as any)?.databaseName || 'unknown');
  const [tableRows] = await sequelize.query('SHOW TABLES');
  const tableNames = tableRows.map((entry: any) => safeTableName(String(Object.values(entry)[0])));
  const tables: TableBackup[] = [];

  for (const name of tableNames) {
    const [columnsRows] = await sequelize.query(`SHOW COLUMNS FROM \`${name}\``);
    const [rows] = await sequelize.query(`SELECT * FROM \`${name}\``);
    tables.push({
      name,
      columns: columnsRows.map((column: any) => String(column.Field)),
      rows: rows as Record<string, unknown>[],
    });
  }

  const backup: DatabaseBackup = {
    format: 'sistema-vales-json-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    database,
    tables,
  };
  const outputDir = path.resolve(process.cwd(), 'backups');
  mkdirSync(outputDir, { recursive: true });
  const timestamp = backup.createdAt.replace(/[:.]/g, '-');
  const outputPath = path.resolve(outputArgument || path.join(outputDir, `sistema-vales-${timestamp}.json.gz`));
  const compressed = gzipSync(Buffer.from(JSON.stringify(backup, jsonReplacer)), { level: 9 });
  writeFileSync(outputPath, compressed, { mode: 0o600 });
  writeFileSync(`${outputPath}.sha256`, `${checksum(compressed)}  ${path.basename(outputPath)}\n`, { mode: 0o600 });
  console.log(`[BACKUP] ${tables.length} tablas y ${tables.reduce((sum, table) => sum + table.rows.length, 0)} registros guardados en ${outputPath}`);
}

function verifyBackup(filePath?: string): void {
  if (!filePath) throw new Error('Uso: npm run backup:verify -- /ruta/al/respaldo.json.gz');
  const { backup } = loadBackup(path.resolve(filePath));
  for (const table of backup.tables) {
    safeTableName(table.name);
    if (!Array.isArray(table.columns) || !Array.isArray(table.rows)) throw new Error(`Tabla inválida: ${table.name}`);
    for (const record of table.rows) {
      const unexpected = Object.keys(record).filter((key) => !table.columns.includes(key));
      if (unexpected.length) throw new Error(`Columnas inesperadas en ${table.name}: ${unexpected.join(', ')}`);
    }
  }
  console.log(`[VERIFY] Respaldo válido de ${backup.database}, creado ${backup.createdAt}: ${backup.tables.length} tablas, ${backup.tables.reduce((sum, table) => sum + table.rows.length, 0)} registros`);
}

async function restoreBackup(filePath?: string): Promise<void> {
  if (!filePath || !process.argv.includes('--confirm') || process.env.ALLOW_DATABASE_RESTORE !== 'YES') {
    throw new Error('Restauración bloqueada. Requiere archivo, --confirm y ALLOW_DATABASE_RESTORE=YES');
  }
  const { backup } = loadBackup(path.resolve(filePath));
  await connectDB();
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    for (const table of [...backup.tables].reverse()) {
      const name = safeTableName(table.name);
      await sequelize.query(`DELETE FROM \`${name}\``, { transaction });
    }
    for (const table of backup.tables) {
      const name = safeTableName(table.name);
      for (let index = 0; index < table.rows.length; index += 250) {
        await sequelize.getQueryInterface().bulkInsert(name, table.rows.slice(index, index + 250), { transaction });
      }
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    await transaction.commit();
    console.log(`[RESTORE] Restauración completada: ${backup.tables.length} tablas`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function main() {
  const [command, filePath] = process.argv.slice(2).filter((arg) => arg !== '--confirm');
  if (command === 'create') await createBackup(filePath);
  else if (command === 'verify') verifyBackup(filePath);
  else if (command === 'restore') await restoreBackup(filePath);
  else throw new Error('Comandos disponibles: create, verify, restore');
}

main()
  .catch((error) => {
    console.error('[BACKUP ERROR]', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
