// API workflow tests with an isolated in-memory persistence double. No production DB is contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import router from '../routes/attendance';
import sequelize from '../config/database';
import User from '../models/User';
import * as models from '../models/Attendance';
import { addDays, Shift } from '../domain/attendance';

type Row = Record<string, any>;
const tables = new Map<any, Row[]>();
const originals: Array<() => void> = [];
function replace(object: any, key: string, value: any) {
  const old = object[key]; object[key] = value; originals.push(() => { object[key] = old; });
}
function instance(data: Row): Row {
  const row: Row = { ...data };
  row.toJSON = () => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== 'function'));
  row.update = async (patch: Row) => { Object.assign(row, patch); return row; };
  return row;
}
function matches(row: Row, where: Row = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object' && Op.in in value) return value[Op.in].includes(row[key]);
    return row[key] === value;
  });
}
function mockModel(model: any, seed: Row[] = []) {
  tables.set(model, seed.map(instance));
  const findAll = async (options: any = {}) => {
    let rows = tables.get(model)!.filter(row => matches(row, options.where));
    for (const [key, direction] of [...(options.order || [])].reverse()) {
      rows = rows.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (direction === 'DESC' ? -1 : 1));
    }
    return rows;
  };
  replace(model, 'findAll', findAll);
  replace(model, 'findByPk', async (id: number) => tables.get(model)!.find(row => (row.id ?? row.userId) === Number(id)) || null);
  replace(model, 'findOne', async (options: any) => (await findAll(options))[0] || null);
  replace(model, 'create', async (data: Row) => {
    const row = instance({ id: tables.get(model)!.length + 1, status: model === models.AttendanceChange ? 'pending' : 'draft',
      version: 1, toleranceMinutes: 15, active: true, createdAt: new Date(), ...data });
    tables.get(model)!.push(row); return row;
  });
  replace(model, 'upsert', async (data: Row) => {
    const row = tables.get(model)!.find(row => row.userId === data.userId);
    if (row) Object.assign(row, data); else tables.get(model)!.push(instance(data));
  });
}
function call(userId: number | null, method: string, path: string, body: Row = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost');
    const req: any = { method, url: path, path: url.pathname, originalUrl: `/api/attendance${path}`, headers: userId ? {
      authorization: `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-super-secret-key')}`,
    } : {}, body, query: Object.fromEntries(url.searchParams), params: {} };
    let status = 200;
    const res: any = { status(code: number) { status = code; return res; }, setHeader() {},
      json(data: any) { resolve({ status, data: JSON.parse(JSON.stringify(data)) }); return res; },
      send(data: any) { resolve({ status, data }); return res; } };
    (router as any).handle(req, res, (error: any) => error ? reject(error) : resolve({ status: 404, data: null }));
  });
}
const weeklyPlan = (date: string): Shift[] => Array.from({ length: 7 }, (_, day) => ({ employeeId: 1, date: addDays(date, day), rest: day > 0, start: day > 0 ? '' : '08:00', end: day > 0 ? '' : '16:00' }));

test('attendance API: permisos, publicación, solicitudes, simulación y correcciones', async t => {
  mockModel(User, [
    { id: 1, rol: 'rh', nombre: 'RH', activo: true }, { id: 2, rol: 'estacion', nombre: 'Estación uno', activo: true, estacion: 'Nombre editable' },
    { id: 3, rol: 'estacion', nombre: 'Estación dos', activo: true }, { id: 4, rol: 'sistemas', nombre: 'Sistemas', activo: true },
    { id: 5, rol: 'rh', nombre: 'RH inactivo', activo: false },
    { id: 6, rol: 'jefe', nombre: 'Jefe', activo: true },
    { id: 7, rol: 'estacion', nombre: 'Sin vínculo', activo: true, estacion: 'Uno' },
  ]);
  mockModel(models.AttendanceStation, [{ id: 1, name: 'Uno', timeZone: 'America/Mexico_City' }, { id: 2, name: 'Dos', timeZone: 'America/Mexico_City' }]);
  mockModel(models.AttendanceStationUser, [{ userId: 2, stationId: 1 }, { userId: 3, stationId: 2 }]);
  mockModel(models.AttendanceEmployee, [{ id: 1, stationId: 1, name: 'Empleado uno', number: '001', active: true }]);
  for (const model of [models.AttendanceWeek, models.AttendanceChange, models.AttendancePunch, models.AttendanceCorrection, models.AttendanceAudit]) mockModel(model);
  replace(sequelize, 'transaction', async (optionsOrCallback: any, suppliedCallback?: any) => {
    const callback = suppliedCallback ?? optionsOrCallback;
    const snapshot = new Map([...tables].map(([model, rows]) => [model, rows.map(row => instance(structuredClone(row.toJSON())))]));
    try { return await callback({ LOCK: { UPDATE: 'UPDATE' } }); }
    catch (error) { snapshot.forEach((rows, model) => tables.set(model, rows)); throw error; }
  });
  t.after(() => { originals.reverse().forEach(restore => restore()); });
  const future = new Date(); future.setUTCDate(future.getUTCDate() + 21);
  const day = future.getUTCDay(); future.setUTCDate(future.getUTCDate() - (day === 0 ? 6 : day - 1));
  const weekStart = future.toISOString().slice(0, 10);
  let weekId = 0;

  await t.test('rechaza acceso sin sesión, inactivos y roles ajenos', async () => {
    assert.equal((await call(null, 'GET', '/bootstrap')).status, 401);
    assert.equal((await call(5, 'GET', '/bootstrap')).status, 401);
    assert.equal((await call(4, 'GET', '/bootstrap')).status, 403);
  });
  await t.test('aísla estaciones y prohíbe exportar o corregir a estación', async () => {
    const bootstrap = await call(2, 'GET', '/bootstrap');
    assert.equal(bootstrap.data.stations.length, 1);
    assert.equal(bootstrap.data.stations[0].id, 1);
    assert.equal((await call(3, 'GET', '/employees?stationId=1')).status, 403);
    for (const [method, path] of [['PUT', '/employees/1'], ['POST', '/punches'], ['POST', '/punches/1/corrections'], ['GET', '/reports?stationId=1&weekStart=2020-01-06'], ['GET', '/weeks/1/audit']]) {
      assert.equal((await call(2, method, path)).status, 403, path);
    }
  });
  await t.test('Jefe consulta todas las estaciones pero no puede modificar ninguna entidad', async () => {
    assert.equal((await call(6, 'GET', '/bootstrap')).data.stations.length, 2);
    assert.equal((await call(6, 'GET', '/employees?stationId=1')).status, 200);
    assert.equal((await call(6, 'GET', '/employees?stationId=2')).status, 200);
    for (const [method, path] of [['POST', '/stations'], ['PUT', '/stations/1/account'], ['POST', '/employees'],
      ['PUT', '/employees/1'], ['POST', '/weeks'], ['PUT', '/weeks/1'], ['POST', '/weeks/1/submit'],
      ['POST', '/weeks/1/decision'], ['POST', '/weeks/1/changes'], ['POST', '/weeks/1/changes/1/decision'],
      ['POST', '/punches'], ['POST', '/punches/1/corrections'], ['DELETE', '/weeks/1']]) {
      assert.equal((await call(6, method, path)).status, 403, `${method} ${path}`);
    }
    assert.equal(tables.get(models.AttendanceAudit)!.length, 0);
  });
  await t.test('guarda, detecta versión antigua y envía a RH', async () => {
    const created = await call(2, 'POST', '/weeks', { stationId: 1, weekStart, plan: weeklyPlan(weekStart) });
    assert.equal(created.status, 201); weekId = created.data.id;
    assert.equal((await call(2, 'PUT', `/weeks/${weekId}`, { version: 0, plan: weeklyPlan(weekStart) })).status, 409);
    assert.equal((await call(2, 'POST', `/weeks/${weekId}/submit`, { version: 1 })).status, 200);
    assert.equal((await call(1, 'GET', '/pending')).data.weeks[0].id, weekId);
    assert.equal((await call(2, 'GET', '/pending')).status, 403);
    assert.equal((await call(2, 'POST', `/weeks/${weekId}/decision`, { version: 2, approve: true, reason: 'Programación correcta' })).status, 403);
    assert.equal((await call(1, 'POST', `/weeks/${weekId}/decision`, { version: 2, approve: true, reason: 'Programación correcta' })).status, 200);
    assert.equal((await call(2, 'PUT', `/weeks/${weekId}`, { version: 3, plan: weeklyPlan(weekStart) })).status, 409);
  });
  await t.test('la simulación calcula sin crear ninguna asistencia', async () => {
    const response = await call(2, 'POST', '/preview', { weekId, employeeId: 1, date: weekStart, actualDate: weekStart, time: '08:20', kind: 'entry' });
    assert.equal(response.status, 200); assert.equal(response.data.saved, false);
    assert.equal(response.data.beyondToleranceMinutes, 5);
    assert.equal(tables.get(models.AttendancePunch)!.length, 0);
    assert.equal((await call(3, 'POST', '/preview', { weekId, employeeId: 1, date: weekStart, actualDate: weekStart, time: '08:20', kind: 'entry' })).status, 403);
    assert.equal((await call(6, 'POST', '/preview', { weekId, employeeId: 1, date: weekStart, actualDate: weekStart, time: '08:20', kind: 'entry' })).data.saved, false);
  });
  await t.test('solicitudes de estación conservan auditoría y RH no se envía solicitudes nuevas', async () => {
    const proposedPlan = weeklyPlan(weekStart); proposedPlan[0].start = '09:00';
    const request = await call(2, 'POST', `/weeks/${weekId}/changes`, { version: 3, plan: proposedPlan, reason: 'Cobertura solicitada por operación' });
    assert.equal(request.status, 201);
    assert.equal((await call(1, 'GET', '/pending')).data.changes[0].week.id, weekId);
    assert.equal(tables.get(models.AttendanceWeek)![0].plan[0].start, '08:00');
    assert.equal((await call(1, 'POST', `/weeks/${weekId}/changes/${request.data.id}/decision`, { version: 3, approve: true, reason: 'Cobertura autorizada por RH' })).status, 200);
    assert.equal(tables.get(models.AttendanceWeek)![0].plan[0].start, '09:00');
    assert.ok(tables.get(models.AttendanceAudit)!.some(a => a.action === 'approve_change' && a.before.plan[0].start === '08:00'));
    const own = await call(1, 'POST', `/weeks/${weekId}/changes`, { version: 4, plan: proposedPlan, reason: 'Otra solicitud de cambio' });
    assert.equal(own.status, 403);
    // Old RH requests must remain resolvable after upgrading, even by their author.
    const legacy = await models.AttendanceChange.create({ weekId, baseVersion: 4, proposedPlan, requestedBy: 1, reason: 'Solicitud antigua de RH' });
    assert.equal((await call(1, 'POST', `/weeks/${weekId}/changes/${legacy.id}/decision`, { version: 4, approve: true, reason: 'Resolver solicitud antigua RH' })).status, 200);
  });
  await t.test('RH publica y modifica directamente; no crea pendientes y conserva bloqueo/versiones', async () => {
    const date = addDays(weekStart, 7);
    const created = await call(1, 'POST', '/weeks', { stationId: 1, weekStart: date, plan: weeklyPlan(date) });
    assert.equal(created.status, 201);
    assert.equal(created.data.status, 'approved');
    assert.equal(created.data.approvedBy, 1);
    assert.equal((await call(1, 'GET', '/pending')).data.weeks.length, 0);
    assert.equal((await call(1, 'POST', `/weeks/${created.data.id}/submit`, { version: 1 })).status, 403);
    const plan = weeklyPlan(date); plan[0].start = '09:00';
    assert.equal((await call(1, 'PUT', `/weeks/${created.data.id}`, { version: 1, plan })).status, 400);
    const edited = await call(1, 'PUT', `/weeks/${created.data.id}`, { version: 1, plan, reason: 'Ajuste directo autorizado por RH' });
    assert.equal(edited.status, 200);
    assert.equal(edited.data.status, 'approved');
    assert.equal(edited.data.version, 2);
    assert.equal((await call(1, 'PUT', `/weeks/${created.data.id}`, { version: 1, plan, reason: 'Intento de sobrescritura' })).status, 409);
    assert.equal((await call(2, 'PUT', `/weeks/${created.data.id}`, { version: 2, plan })).status, 409);
    assert.ok(tables.get(models.AttendanceAudit)!.some(a => a.action === 'rh_adjust' && a.before.plan[0].start === '08:00' && a.after.plan[0].start === '09:00'));
  });
  await t.test('captura manual idempotente, cronología, corrección sin sobrescritura y reportes', async () => {
    const past = '2020-01-06';
    const historical = instance({ id: 99, stationId: 1, weekStart: past, status: 'approved', version: 1, toleranceMinutes: 15, plan: weeklyPlan(past) });
    tables.get(models.AttendanceWeek)!.push(historical);
    const body = { weekId: 99, employeeId: 1, date: past, actualDate: past, time: '08:20', kind: 'entry', reason: 'Registro omitido y validado por RH', requestId: 'request-manual-000001' };
    const created = await call(1, 'POST', '/punches', body);
    assert.equal(created.status, 201); assert.equal(created.data.source, 'manual_rh');
    assert.equal((await call(1, 'POST', '/punches', body)).data.id, created.data.id);
    assert.equal(tables.get(models.AttendancePunch)!.length, 1);
    assert.equal((await call(1, 'POST', '/punches', { ...body, time: '08:30' })).status, 409);
    assert.equal((await call(1, 'POST', '/punches', { ...body, requestId: 'request-manual-000002', kind: 'exit', time: '08:10' })).status, 400);
    assert.equal((await call(1, 'POST', '/punches', { ...body, requestId: 'request-manual-000002', kind: 'exit', time: '16:00' })).status, 201);
    const correction = await call(1, 'POST', `/punches/${created.data.id}/corrections`, { actualDate: past, time: '08:05', void: false, correctionVersion: 0, reason: 'Se validó la hora contra registro firmado' });
    assert.equal(correction.status, 201);
    const report = await call(1, 'GET', `/reports?stationId=1&weekStart=${past}`);
    assert.equal(report.status, 200);
    assert.equal(report.data.rows[0].lateMinutes, 5);
    assert.equal(report.data.rows[0].originalLateMinutes, 20);
    assert.equal(report.data.rows[0].workedMinutes, 475);
    assert.equal(report.data.punches[0].occurredAt, '2020-01-06T14:20:00.000Z');
    assert.equal(report.data.corrections.length, 1);
    const csv = await call(1, 'GET', `/reports?stationId=1&weekStart=${past}&format=csv`);
    assert.ok(csv.data.includes('manual_rh'));
    assert.equal((await call(6, 'GET', `/reports?stationId=1&weekStart=${past}`)).status, 200);
    assert.equal((await call(6, 'GET', `/reports?stationId=1&weekStart=${past}&format=csv`)).status, 200);
    assert.equal((await call(6, 'GET', '/weeks/99/audit')).status, 200);
  });
  await t.test('estación da de alta solo a su personal, con auditoría y sin crear cuentas ni alterar horarios', async () => {
    const body = { stationId: 1, name: 'Nuevo despachador', number: '002', photo: null,
      rol: 'rh', active: false, version: 99 };
    const count = tables.get(models.AttendanceEmployee)!.length;
    const accountCount = tables.get(User)!.length;
    const weeksBefore = JSON.stringify(tables.get(models.AttendanceWeek)!.map(w => w.toJSON()));
    const auditCount = tables.get(models.AttendanceAudit)!.length;
    assert.equal((await call(3, 'POST', '/employees', body)).status, 403);
    assert.equal((await call(7, 'POST', '/employees', body)).status, 403);
    assert.equal((await call(6, 'POST', '/employees', body)).status, 403);
    assert.equal((await call(2, 'POST', '/employees', { ...body, stationId: 2 })).status, 403);
    assert.equal((await call(2, 'POST', '/employees', { ...body, name: ' ' })).status, 400);
    assert.equal(tables.get(models.AttendanceEmployee)!.length, count);
    assert.equal(tables.get(models.AttendanceAudit)!.length, auditCount);
    const created = await call(2, 'POST', '/employees', body);
    assert.equal(created.status, 201);
    assert.equal(created.data.stationId, 1);
    assert.equal(created.data.active, true);
    assert.equal(created.data.version, 1);
    assert.equal(created.data.rol, undefined);
    assert.equal(tables.get(User)!.length, accountCount);
    const record = tables.get(models.AttendanceAudit)!.at(-1)!;
    assert.equal(record.actorId, 2);
    assert.equal(record.entity, 'employee');
    assert.equal(record.after.stationId, 1);
    assert.ok((await call(1, 'GET', '/employees?stationId=1')).data.some((e: Row) => e.id === created.data.id));
    assert.ok((await call(6, 'GET', '/employees?stationId=1')).data.some((e: Row) => e.id === created.data.id));
    assert.equal((await call(3, 'GET', '/employees?stationId=2')).data.length, 0);
    assert.equal((await call(2, 'PUT', `/employees/${created.data.id}`, { ...body, version: 1, reason: 'Intento de editar empleado' })).status, 403);
    assert.equal(JSON.stringify(tables.get(models.AttendanceWeek)!.map(w => w.toJSON())), weeksBefore);
    assert.equal((await call(1, 'POST', '/employees', { ...body, number: '003', stationId: 2 })).status, 201);
  });
});
