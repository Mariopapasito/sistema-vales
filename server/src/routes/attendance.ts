import { Router, Response, NextFunction } from 'express';
import { Op, Transaction, UniqueConstraintError } from 'sequelize';
import sequelize from '../config/database';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import documentRoutes from './attendanceDocuments';
import { AttendanceStation as Station, AttendanceStationUser as StationUser, AttendanceEmployee as Employee,
  AttendanceWeek as Week, AttendanceChange as Change, AttendancePunch as Punch,
  AttendanceCorrection as Correction, AttendanceAudit as Audit } from '../models/Attendance';
import { AttendanceError, requireAttendance as check, monday, normalizePlan, civilToInstant, shiftBounds,
  requireDraftEditable, requireVersion, requireStationAccess, lateness, csvCell, assertNoOverlap, addDays,
  ATTENDANCE_TIME_ZONE, TOLERANCE_MINUTES, Shift } from '../domain/attendance';

const router = Router();
router.use(protect, authorize('rh', 'estacion', 'jefe'));
// Defense in depth: Jefe can consult/export and run the non-persistent preview, never write.
router.use((req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user!.rol === 'jefe' && req.method !== 'GET' && !(req.method === 'POST' && req.path === '/preview')) {
    res.status(403).json({ message: 'El acceso de Jefe a asistencia es de solo lectura. Solo RH puede autorizar o corregir.' });
    return;
  }
  next();
});
const rh = authorize('rh');
const readers = authorize('rh', 'jefe');
router.use('/documents', documentRoutes);
type Handler = (req: AuthRequest, res: Response) => Promise<unknown>;
const route = (handler: Handler) => (req: AuthRequest, res: Response, next: NextFunction) => {
  Promise.resolve(handler(req, res)).catch(error => {
    if (error instanceof AttendanceError) return res.status(error.status).json({ message: error.message });
    if (error instanceof UniqueConstraintError) return res.status(409).json({ message: 'El registro ya existe. Recarga la pantalla.' });
    next(error);
  });
};
const positiveId = (input: unknown) => {
  const value = Number(input);
  check(Number.isSafeInteger(value) && value > 0, 'Identificador inválido.');
  return value;
};
const string = (value: unknown, name: string, max = 255) => {
  check(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, `${name}: valor requerido (máximo ${max} caracteres).`);
  return value.trim();
};
const reason = (value: unknown) => {
  const text = string(value, 'Motivo', 2000);
  check(text.length >= 10, 'Explica el motivo con al menos 10 caracteres.');
  return text;
};
async function scope(req: AuthRequest, stationId: number, transaction?: Transaction) {
  const link = req.user!.rol === 'estacion' ? await StationUser.findByPk(req.user!.id, { transaction }) : null;
  requireStationAccess(req.user!.rol, link?.stationId ?? null, stationId);
  const station = await Station.findByPk(stationId, { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
  check(station, 'Estación no encontrada.', 404);
  return station;
}
async function audit(req: AuthRequest, transaction: Transaction, action: string, entity: string, entityId: number,
  before: unknown, after: unknown, why: string) {
  await Audit.create({ actorId: req.user!.id, actorName: req.user!.nombre, action, entity, entityId,
    before: before ?? null, after: after ?? null, reason: why }, { transaction });
}
async function lockedWeek(req: AuthRequest, transaction: Transaction) {
  const found = await Week.findByPk(positiveId(req.params.id), { transaction });
  check(found, 'Programación no encontrada.', 404);
  // Serialize adjacent-week approvals for the same station, not just edits to the same week.
  await scope(req, found.stationId, transaction);
  const week = (await Week.findByPk(found.id, { transaction, lock: transaction.LOCK.UPDATE }))!;
  requireVersion(week.version, req.body.version);
  return week;
}
async function planFor(stationId: number, input: unknown, weekStart: string, transaction: Transaction, historicalPlan?: Shift[]) {
  const employees = await Employee.findAll({ where: { stationId, ...(historicalPlan ? {} : { active: true }) }, transaction });
  if (historicalPlan) {
    // Preserve the roster of an approved week, including employees subsequently made inactive.
    const ids = [...new Set(historicalPlan.map(s => s.employeeId))];
    check(ids.every(id => employees.some(e => e.id === id)), 'La plantilla histórica contiene un empleado ajeno a la estación.');
    return normalizePlan(input, weekStart, ids);
  }
  return normalizePlan(input, weekStart, employees.map(e => e.id));
}
async function preventAdjacentOverlap(week: Week, plan: Shift[], transaction: Transaction) {
  const adjacent = await Week.findAll({ where: { stationId: week.stationId, status: 'approved',
    weekStart: { [Op.in]: [addDays(week.weekStart, -7), addDays(week.weekStart, 7)] } }, transaction });
  assertNoOverlap([...plan, ...adjacent.flatMap(w => w.plan)]);
}

router.get('/bootstrap', route(async (req, res) => {
  const link = await StationUser.findByPk(req.user!.id);
  const canSeeAll = ['rh', 'jefe'].includes(req.user!.rol);
  const stations = await Station.findAll({ where: canSeeAll ? {} : { id: link?.stationId ?? -1 }, order: [['name', 'ASC']] });
  const accounts = canSeeAll ? await User.findAll({ where: { rol: 'estacion', activo: true }, attributes: ['id', 'nombre', 'estacion'] }) : [];
  const assignments = canSeeAll ? await StationUser.findAll() : [];
  res.json({ role: req.user!.rol, stations, accounts, assignments, toleranceMinutes: TOLERANCE_MINUTES, timeZone: ATTENDANCE_TIME_ZONE,
    reader: { connected: false, status: 'not_integrated' }, simulation: 'preview_only', serverNow: new Date().toISOString() });
}));

router.get('/pending', readers, route(async (_req, res) => {
  const weeks = await Week.findAll({ where: { status: 'submitted' }, attributes: ['id', 'stationId', 'weekStart', 'version'], order: [['weekStart', 'ASC']] });
  const changes = await Change.findAll({ where: { status: 'pending' }, order: [['id', 'ASC']] });
  const changeWeeks = changes.length ? await Week.findAll({ where: { id: { [Op.in]: changes.map(c => c.weekId) } }, attributes: ['id', 'stationId', 'weekStart', 'version'] }) : [];
  res.json({ weeks, changes: changes.map(c => ({ id: c.id, reason: c.reason, baseVersion: c.baseVersion, week: changeWeeks.find(w => w.id === c.weekId) })) });
}));

router.post('/stations', rh, route(async (req, res) => {
  const name = string(req.body.name, 'Nombre de estación');
  const result = await sequelize.transaction(async transaction => {
    const station = await Station.create({ name, timeZone: ATTENDANCE_TIME_ZONE }, { transaction });
    await audit(req, transaction, 'create', 'station', station.id, null, station.toJSON(), 'Alta de estación');
    return station;
  });
  res.status(201).json(result);
}));

router.put('/stations/:id/account', rh, route(async (req, res) => {
  const stationId = positiveId(req.params.id);
  const userId = positiveId(req.body.userId);
  const why = reason(req.body.reason);
  await sequelize.transaction(async transaction => {
    await scope(req, stationId, transaction);
    const account = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    check(account?.activo && account.rol === 'estacion', 'Selecciona una cuenta activa de estación.');
    const before = await StationUser.findByPk(userId, { transaction });
    await StationUser.upsert({ userId, stationId }, { transaction });
    await audit(req, transaction, 'assign_account', 'station', stationId, before?.toJSON(), { userId, stationId }, why);
  });
  res.json({ message: 'Cuenta vinculada. El nombre del perfil no cambia esta autorización.' });
}));

router.get('/employees', route(async (req, res) => {
  const stationId = positiveId(req.query.stationId);
  await scope(req, stationId);
  res.json(await Employee.findAll({ where: { stationId }, order: [['name', 'ASC']] }));
}));

function employeeData(body: any) {
  const photo = body.photo || null;
  check(photo === null || (typeof photo === 'string' && photo.length <= 1400000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)), 'Usa una foto JPG, PNG o WebP de máximo 1 MB.');
  return { number: string(body.number, 'Número de empleado', 40), name: string(body.name, 'Nombre'), photo };
}
router.post('/employees', authorize('rh', 'estacion'), route(async (req, res) => {
  const stationId = positiveId(req.body.stationId);
  const data = employeeData(req.body);
  const employee = await sequelize.transaction(async transaction => {
    await scope(req, stationId, transaction);
    const employee = await Employee.create({ ...data, stationId, active: true }, { transaction });
    await audit(req, transaction, 'create', 'employee', employee.id, null, { ...data, photo: !!data.photo, stationId }, 'Alta de empleado');
    return employee;
  });
  res.status(201).json(employee);
}));

router.put('/employees/:id', rh, route(async (req, res) => {
  const data = employeeData(req.body);
  const why = reason(req.body.reason);
  check(typeof req.body.active === 'boolean', 'Estado inválido.');
  const result = await sequelize.transaction(async transaction => {
    const employee = await Employee.findByPk(positiveId(req.params.id), { transaction, lock: transaction.LOCK.UPDATE });
    check(employee, 'Empleado no encontrado.', 404);
    requireVersion(employee.version, req.body.version);
    const before = { ...employee.toJSON(), photo: !!employee.photo };
    await employee.update({ ...data, active: req.body.active, version: employee.version + 1 }, { transaction });
    const after = { ...employee.toJSON<Record<string, unknown>>(), photo: !!employee.photo };
    await audit(req, transaction, 'update', 'employee', employee.id, before, after, why);
    return employee;
  });
  res.json(result);
}));

router.get('/weeks', route(async (req, res) => {
  const stationId = positiveId(req.query.stationId);
  const weekStart = monday(req.query.weekStart);
  await scope(req, stationId);
  const week = await Week.findOne({ where: { stationId, weekStart } });
  const changes = week ? await Change.findAll({ where: { weekId: week.id }, order: [['id', 'DESC']] }) : [];
  res.json({ week, changes });
}));

router.post('/weeks', route(async (req, res) => {
  const stationId = positiveId(req.body.stationId);
  const weekStart = monday(req.body.weekStart);
  requireDraftEditable('draft', weekStart);
  const week = await sequelize.transaction(async transaction => {
    await scope(req, stationId, transaction);
    const plan = await planFor(stationId, req.body.plan, weekStart, transaction);
    const direct = req.user!.rol === 'rh';
    const week = await Week.create({ stationId, weekStart, plan, ...(direct ? { status: 'approved', approvedBy: req.user!.id, approvedAt: new Date() } : {}) }, { transaction });
    if (direct) await preventAdjacentOverlap(week, plan, transaction);
    await audit(req, transaction, direct ? 'rh_publish' : 'create_draft', 'week', week.id, null, week.toJSON(), direct ? 'Programación publicada directamente por RH' : 'Programación semanal');
    return week;
  });
  res.status(201).json(week);
}));

router.put('/weeks/:id', route(async (req, res) => {
  const result = await sequelize.transaction(async transaction => {
    const week = await lockedWeek(req, transaction);
    if (req.user!.rol === 'rh') {
      const why = reason(req.body.reason);
      if (week.status !== 'approved') requireDraftEditable('draft', week.weekStart);
      const plan = await planFor(week.stationId, req.body.plan, week.weekStart, transaction, week.status === 'approved' ? week.plan : undefined);
      await preventAdjacentOverlap(week, plan, transaction);
      const before = week.toJSON();
      await week.update({ plan, status: 'approved', version: week.version + 1, approvedBy: req.user!.id, approvedAt: new Date() }, { transaction });
      await audit(req, transaction, 'rh_adjust', 'week', week.id, before, week.toJSON(), why);
      return week;
    }
    requireDraftEditable(week.status, week.weekStart);
    const plan = await planFor(week.stationId, req.body.plan, week.weekStart, transaction);
    const before = week.toJSON();
    await week.update({ plan, version: week.version + 1 }, { transaction });
    await audit(req, transaction, 'edit_draft', 'week', week.id, before, week.toJSON(), 'Edición del borrador');
    return week;
  });
  res.json(result);
}));

router.post('/weeks/:id/submit', route(async (req, res) => {
  check(req.user!.rol === 'estacion', 'RH publica directamente: usa Guardar y publicar.', 403);
  const result = await sequelize.transaction(async transaction => {
    const week = await lockedWeek(req, transaction);
    requireDraftEditable(week.status, week.weekStart);
    await planFor(week.stationId, week.plan, week.weekStart, transaction);
    const before = week.toJSON();
    await week.update({ status: 'submitted', version: week.version + 1 }, { transaction });
    await audit(req, transaction, 'submit', 'week', week.id, before, week.toJSON(), 'Enviado a RH');
    return week;
  });
  res.json(result);
}));

router.post('/weeks/:id/decision', rh, route(async (req, res) => {
  const approve = req.body.approve;
  check(typeof approve === 'boolean', 'Decisión inválida.');
  const why = reason(req.body.reason);
  const result = await sequelize.transaction(async transaction => {
    const week = await lockedWeek(req, transaction);
    check(week.status === 'submitted', 'La semana no está pendiente de aprobación.', 409);
    // No late publication: use a future week, never retroactively make an unapproved shift official.
    check(new Date() < civilToInstant(week.weekStart, '00:00'), 'La semana ya comenzó y no puede publicarse retroactivamente.', 409);
    if (approve) {
      await planFor(week.stationId, week.plan, week.weekStart, transaction);
      await preventAdjacentOverlap(week, week.plan, transaction);
    }
    const before = week.toJSON();
    await week.update({ status: approve ? 'approved' : 'draft', version: week.version + 1,
      approvedBy: approve ? req.user!.id : null, approvedAt: approve ? new Date() : null }, { transaction });
    await audit(req, transaction, approve ? 'approve' : 'return_draft', 'week', week.id, before, week.toJSON(), why);
    return week;
  });
  res.json(result);
}));

router.post('/weeks/:id/changes', route(async (req, res) => {
  check(req.user!.rol === 'estacion', 'RH ajusta directamente: usa Guardar cambios. No requiere otra autorización.', 403);
  const why = reason(req.body.reason);
  const change = await sequelize.transaction(async transaction => {
    const week = await lockedWeek(req, transaction);
    check(week.status === 'approved', 'Solo una semana aprobada admite solicitudes de cambio.', 409);
    const plan = await planFor(week.stationId, req.body.plan, week.weekStart, transaction, week.plan);
    const change = await Change.create({ weekId: week.id, baseVersion: week.version, proposedPlan: plan,
      requestedBy: req.user!.id, reason: why }, { transaction });
    await audit(req, transaction, 'request_change', 'week', week.id, week.toJSON(), change.toJSON(), why);
    return change;
  });
  res.status(201).json(change);
}));

router.post('/weeks/:id/changes/:changeId/decision', rh, route(async (req, res) => {
  const why = reason(req.body.reason);
  check(typeof req.body.approve === 'boolean', 'Decisión inválida.');
  const result = await sequelize.transaction(async transaction => {
    const week = await lockedWeek(req, transaction);
    const change = await Change.findByPk(positiveId(req.params.changeId), { transaction, lock: transaction.LOCK.UPDATE });
    check(change && change.weekId === week.id, 'Solicitud no encontrada.', 404);
    check(change.status === 'pending' && week.status === 'approved', 'Solicitud cerrada o semana no aprobada.', 409);
    // RH can also resolve legacy requests created by RH before direct publication existed.
    const before = week.toJSON();
    if (req.body.approve) {
      requireVersion(week.version, change.baseVersion);
      const plan = await planFor(week.stationId, change.proposedPlan, week.weekStart, transaction, week.plan);
      await preventAdjacentOverlap(week, plan, transaction);
      await week.update({ plan, version: week.version + 1 }, { transaction });
    }
    await change.update({ status: req.body.approve ? 'approved' : 'rejected', decidedBy: req.user!.id, decisionReason: why }, { transaction });
    await audit(req, transaction, req.body.approve ? 'approve_change' : 'reject_change', 'week', week.id, before,
      { week: week.toJSON(), change: change.toJSON() }, why);
    return week;
  });
  res.json(result);
}));

// A preview never writes a punch, is never called "biometric", and is not queued offline.
router.post('/preview', route(async (req, res) => {
  const week = await Week.findByPk(positiveId(req.body.weekId));
  check(week, 'Guarda primero una programación para probarla.', 404);
  await scope(req, week.stationId);
  const shift = week.plan.find(s => s.employeeId === positiveId(req.body.employeeId) && s.date === req.body.date);
  check(shift && !shift.rest, 'Selecciona un turno, no un descanso.');
  const actual = civilToInstant(req.body.actualDate, req.body.time);
  const bounds = shiftBounds(shift);
  check(req.body.kind === 'entry' || req.body.kind === 'exit', 'Movimiento inválido.');
  res.json({ simulated: true, saved: false, occurredAt: actual.toISOString(), kind: req.body.kind,
    ...(req.body.kind === 'entry' ? lateness(bounds.start, actual, week.toleranceMinutes) : {
      status: actual < bounds.end ? 'Salida anticipada' : 'Salida',
      earlyMinutes: Math.ceil(Math.max(0, bounds.end.getTime() - actual.getTime()) / 60000),
    }) });
}));

router.post('/punches', rh, route(async (req, res) => {
  const why = reason(req.body.reason);
  const weekId = positiveId(req.body.weekId);
  const employeeId = positiveId(req.body.employeeId);
  const requestId = string(req.body.requestId, 'Identificador de solicitud', 64);
  check(/^[a-zA-Z0-9-]{16,64}$/.test(requestId), 'Identificador de solicitud inválido.');
  check(req.body.kind === 'entry' || req.body.kind === 'exit', 'Movimiento inválido.');
  const occurredAt = civilToInstant(req.body.actualDate, req.body.time);
  check(occurredAt <= new Date(), 'No se pueden registrar checadas futuras.');
  const punch = await sequelize.transaction(async transaction => {
    const week = await Week.findByPk(weekId, { transaction, lock: transaction.LOCK.UPDATE });
    check(week?.status === 'approved', 'Se requiere programación aprobada.');
    const shift = week.plan.find(s => s.employeeId === employeeId && s.date === req.body.date);
    check(shift && !shift.rest, 'El empleado no tiene turno en esa fecha.');
    validatePunchTime(shift, occurredAt);
    const previous = await Punch.findOne({ where: { requestId }, transaction });
    if (previous) {
      check(previous.createdBy === req.user!.id && previous.weekId === weekId && previous.employeeId === employeeId &&
        previous.kind === req.body.kind && previous.date === shift.date && previous.occurredAt.getTime() === occurredAt.getTime() && previous.reason === why,
        'Identificador ya utilizado con otros datos.', 409);
      return previous;
    }
    await checkPair(weekId, employeeId, shift.date, req.body.kind, occurredAt, transaction);
    const punch = await Punch.create({ weekId, employeeId, date: shift.date, kind: req.body.kind, occurredAt,
      requestId, reason: why, source: 'manual_rh', createdBy: req.user!.id, shiftSnapshot: shift, scheduleVersion: week.version }, { transaction });
    await audit(req, transaction, 'manual_punch', 'week', weekId, null, punch.toJSON(), why);
    return punch;
  });
  res.status(201).json(punch);
}));

function validatePunchTime(shift: Shift, occurredAt: Date) {
  const { start, end } = shiftBounds(shift);
  check(occurredAt.getTime() >= start.getTime() - 6 * 3600000 && occurredAt.getTime() <= end.getTime() + 6 * 3600000,
    'La hora está fuera de la ventana del turno (máximo 6 horas antes/después).');
}
async function effectiveTime(punch: Punch, transaction?: Transaction) {
  const correction = await Correction.findOne({ where: { punchId: punch.id }, order: [['id', 'DESC']], transaction });
  return correction ? correction.occurredAt : punch.occurredAt;
}
async function checkPair(weekId: number, employeeId: number, date: string, kind: string, occurredAt: Date, transaction: Transaction) {
  const other = await Punch.findOne({ where: { weekId, employeeId, date, kind: kind === 'entry' ? 'exit' : 'entry' }, transaction });
  if (!other) return;
  const time = await effectiveTime(other, transaction);
  if (!time) return;
  check(kind === 'entry' ? occurredAt < time : occurredAt > time, 'La salida debe ser posterior a la entrada.');
}

router.post('/punches/:id/corrections', rh, route(async (req, res) => {
  const why = reason(req.body.reason);
  check(typeof req.body.void === 'boolean', 'Indica si deseas anular el registro.');
  const occurredAt = req.body.void ? null : civilToInstant(req.body.actualDate, req.body.time);
  check(occurredAt === null || occurredAt <= new Date(), 'No se pueden registrar checadas futuras.');
  await sequelize.transaction(async transaction => {
    const found = await Punch.findByPk(positiveId(req.params.id), { transaction });
    check(found, 'Checada no encontrada.', 404);
    // Same lock order as insertion: serialize all changes to a week's punch pairs.
    await Week.findByPk(found.weekId, { transaction, lock: transaction.LOCK.UPDATE });
    const latest = await Correction.findOne({ where: { punchId: found.id }, order: [['id', 'DESC']], transaction });
    requireVersion(latest?.id ?? 0, req.body.correctionVersion);
    if (occurredAt) {
      validatePunchTime(found.shiftSnapshot, occurredAt);
      await checkPair(found.weekId, found.employeeId, found.date, found.kind, occurredAt, transaction);
    }
    const correction = await Correction.create({ punchId: found.id, occurredAt, reason: why, createdBy: req.user!.id }, { transaction });
    await audit(req, transaction, 'correct_punch', 'week', found.weekId,
      { original: found.toJSON(), previousCorrection: latest?.toJSON() ?? null }, correction.toJSON(), why);
  });
  res.status(201).json({ message: 'Corrección registrada; la checada original se conserva.' });
}));

router.get('/reports', readers, route(async (req, res) => {
  const stationId = positiveId(req.query.stationId);
  const weekStart = monday(req.query.weekStart);
  // Take one consistent snapshot: concurrent RH corrections must not mix versions in a report.
  const { station, week, employees, punches, corrections } = await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
      const station = await Station.findByPk(stationId, { transaction });
      check(station, 'Estación no encontrada.', 404);
      const week = await Week.findOne({ where: { stationId, weekStart, status: 'approved' }, transaction });
      check(week, 'No hay programación aprobada para esta semana.', 404);
      const employees = await Employee.findAll({ where: { stationId }, attributes: ['id', 'number', 'name'], transaction });
      const punches = await Punch.findAll({ where: { weekId: week.id }, transaction });
      const corrections = punches.length ? await Correction.findAll({ where: { punchId: { [Op.in]: punches.map(p => p.id) } }, order: [['id', 'ASC']], transaction }) : [];
      return { station, week, employees, punches, corrections };
    });
  const latest = new Map<number, Correction>();
  corrections.forEach(c => latest.set(c.punchId, c));
  const details = punches.map(p => ({ ...p.toJSON(), effectiveAt: latest.has(p.id) ? latest.get(p.id)!.occurredAt : p.occurredAt,
    correctionVersion: latest.get(p.id)?.id ?? 0 }));
  const rows = week.plan.map(shift => {
    const employee = employees.find(e => e.id === shift.employeeId);
    const marks = details.filter(p => p.employeeId === shift.employeeId && p.date === shift.date);
    const entry = marks.find(p => p.kind === 'entry')?.effectiveAt;
    const exit = marks.find(p => p.kind === 'exit')?.effectiveAt;
    const bounds = shift.rest ? null : shiftBounds(shift);
    const delay = entry && bounds ? lateness(bounds.start, new Date(entry), week.toleranceMinutes) : null;
    const original = marks.find(p => p.kind === 'entry');
    const originalDelay = original ? lateness(shiftBounds(original.shiftSnapshot).start, new Date(original.occurredAt), week.toleranceMinutes) : null;
    return { employeeId: shift.employeeId, number: employee?.number ?? '', name: employee?.name ?? `Empleado ${shift.employeeId}`,
      date: shift.date, schedule: shift.rest ? 'Descanso' : `${shift.start}–${shift.end}${shift.end <= shift.start ? ' (+1 día)' : ''}`,
      entry: entry ?? null, exit: exit ?? null, lateMinutes: delay?.lateMinutes ?? 0, beyondToleranceMinutes: delay?.beyondToleranceMinutes ?? 0,
      originalLateMinutes: originalDelay?.lateMinutes ?? null,
      workedMinutes: entry && exit ? Math.max(0, Math.floor((new Date(exit).getTime() - new Date(entry).getTime()) / 60000)) : null,
      status: shift.rest ? (marks.length ? 'Descanso con registros: revisar' : 'Descanso') : !entry ? (exit ? 'Falta entrada' : bounds!.end > new Date() ? 'Pendiente' : 'Sin checadas: revisar') : !exit ? 'Falta salida' : delay!.status,
      adjusted: marks.some(p => p.correctionVersion > 0 || p.scheduleVersion !== week.version),
      sources: [...new Set(marks.map(p => p.source))].join(', ') || 'Sin registros',
    };
  }).filter(row => !req.query.employeeId || row.employeeId === positiveId(req.query.employeeId));
  if (req.query.format === 'csv') {
    const headers = ['Número', 'Empleado', 'Fecha', 'Turno', 'Entrada', 'Salida', 'Minutos desde inicio', 'Fuera de tolerancia', 'Minutos originales', 'Minutos registrados', 'Estado', 'Revisado', 'Origen'];
    const formattedTime = (value: any) => value ? new Date(value).toLocaleString('es-MX', { timeZone: station.timeZone }) : '';
    const content = [['PROVISIONAL: sin lector integrado; registros manuales RH'], ['Estación', station.name, 'Semana', weekStart, 'Versión', week.version],
      headers, ...rows.map(r => [r.number, r.name, r.date, r.schedule, formattedTime(r.entry), formattedTime(r.exit), r.lateMinutes,
      r.beyondToleranceMinutes, r.originalLateMinutes, r.workedMinutes, r.status, r.adjusted ? 'Sí' : 'No', r.sources])]
      .map(row => row.map(csvCell).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="asistencia-${weekStart}.csv"`);
    return res.send(`\uFEFF${content}`);
  }
  res.json({ station, weekStart, scheduleVersion: week.version, toleranceMinutes: week.toleranceMinutes,
    generatedAt: new Date().toISOString(), provisional: true, rows, punches: details, corrections });
}));

router.get('/weeks/:id/audit', readers, route(async (req, res) => {
  res.json(await Audit.findAll({ where: { entity: 'week', entityId: positiveId(req.params.id) }, order: [['id', 'DESC']] }));
}));

export default router;
