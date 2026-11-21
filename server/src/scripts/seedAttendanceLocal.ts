import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { configureLocalEnvironment } from '../config/localEnvironment';

async function main() {
  configureLocalEnvironment();
  await import('../app');
  const { default: sequelize, connectDB } = await import('../config/database');
  const { default: User } = await import('../models/User');
  const { AttendanceStation: Station, AttendanceStationUser: Link, AttendanceEmployee: Employee } = await import('../models/Attendance');
  const credentialsPath = path.resolve(__dirname, '../../local-credentials.json');
  const credentials: Record<string, string> = existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf8')) : {};
  try {
    await connectDB();
    const { runSchemaMigrations } = await import('../config/schemaMigrations');
    await runSchemaMigrations();
    await sequelize.transaction(async transaction => {
      async function account(email: string, nombre: string, rol: string, estacion?: string) {
        const existing = await User.findOne({ where: { email }, transaction });
        if (existing) {
          if (existing.rol !== rol) throw new Error(`La cuenta local ${email} existe con otro rol. No se modificó.`);
          return existing;
        }
        // Persist generated secrets before the transaction commits: reruns can recover from interruption.
        const password = credentials[email] || randomBytes(18).toString('base64url');
        credentials[email] = password;
        writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });
        return User.create({ email, nombre, rol, estacion, activo: true, password: await bcrypt.hash(password, 12) }, { transaction });
      }
      await account('rh.local@villita.test', 'RH · pruebas locales', 'rh');
      await account('jefe.local@villita.test', 'Jefe · pruebas locales', 'jefe');
      await account('sistemas.local@villita.test', 'Sistemas · pruebas locales', 'sistemas');
      for (let i = 1; i <= 8; i++) {
        const number = String(i).padStart(2, '0');
        const name = `DEMO · Estación ${number}`;
        const [station] = await Station.findOrCreate({ where: { name }, defaults: { name, timeZone: 'America/Mexico_City' }, transaction });
        const user = await account(`estacion${number}.local@villita.test`, `Encargado DEMO ${number}`, 'estacion', name);
        const link = await Link.findByPk(user.id, { transaction });
        if (!link) await Link.create({ userId: user.id, stationId: station.id }, { transaction });
        else if (link.stationId !== station.id) throw new Error('Una cuenta DEMO ya tiene otra estación; no se sobrescribió el vínculo.');
        await Employee.findOrCreate({ where: { number: `DEMO-${number}-001` }, defaults: {
          number: `DEMO-${number}-001`, name: `Despachador de prueba ${number}`, stationId: station.id, active: true,
        }, transaction });
      }
    });
    console.log('[LOCAL] RH, Jefe, Sistemas, ocho estaciones y empleados DEMO preparados. Sin checadas ni empleados reales.');
    console.log(`[LOCAL] Credenciales privadas: ${credentialsPath} (archivo excluido de Git).`);
  } finally { await sequelize.close(); }
}
main().catch(error => { console.error('[LOCAL]', error.message); process.exitCode = 1; });
