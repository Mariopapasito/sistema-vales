// Attendance uses explicit civil dates in the station's time zone, never the browser clock.
export const ATTENDANCE_TIME_ZONE = 'America/Mexico_City';
export const TOLERANCE_MINUTES = 15;
export interface Shift {
  employeeId: number;
  date: string;
  rest: boolean;
  start: string;
  end: string;
}

export class AttendanceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function requireAttendance(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new AttendanceError(message, status);
}

export function dateOnly(value: unknown): string {
  requireAttendance(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Fecha inválida. Usa AAAA-MM-DD.');
  const date = new Date(`${value}T12:00:00Z`);
  requireAttendance(!isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value, 'Fecha inexistente.');
  return value;
}

export function addDays(date: string, count: number): string {
  const value = new Date(`${dateOnly(date)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

export function monday(value: unknown): string {
  const date = dateOnly(value);
  requireAttendance(new Date(`${date}T12:00:00Z`).getUTCDay() === 1, 'La semana debe comenzar en lunes.');
  return date;
}

function civilParts(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function civilToInstant(date: string, time: string, zone = ATTENDANCE_TIME_ZONE): Date {
  dateOnly(date);
  requireAttendance(typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time), 'Hora inválida. Usa HH:mm.');
  const target = `${date}T${time}`;
  const wall = Date.parse(`${target}:00Z`);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const actual = Date.parse(`${civilParts(new Date(guess), zone)}:00Z`);
    guess += wall - actual;
  }
  const result = new Date(guess);
  requireAttendance(civilParts(result, zone) === target, 'La hora no existe en la zona de la estación.');
  return result;
}

export function shiftBounds(shift: Shift, zone = ATTENDANCE_TIME_ZONE) {
  requireAttendance(!shift.rest, 'El día está marcado como descanso.');
  const start = civilToInstant(shift.date, shift.start, zone);
  const end = civilToInstant(shift.end <= shift.start ? addDays(shift.date, 1) : shift.date, shift.end, zone);
  const hours = (end.getTime() - start.getTime()) / 3600000;
  requireAttendance(hours > 0 && hours <= 16, 'El turno debe durar entre 1 minuto y 16 horas; revisa entrada y salida.');
  return { start, end };
}

export function normalizePlan(input: unknown, weekStart: string, employeeIds: number[]): Shift[] {
  monday(weekStart);
  requireAttendance(Array.isArray(input) && input.length > 0 && input.length <= 3500, 'Agrega los turnos o descansos de la semana (máximo 3500 filas).');
  const seen = new Set<string>();
  const plan = input.map((row: any): Shift => {
    requireAttendance(row && Number.isInteger(row.employeeId) && employeeIds.includes(row.employeeId), 'El empleado no pertenece a esta estación o está inactivo.');
    const date = dateOnly(row.date);
    requireAttendance(date >= weekStart && date <= addDays(weekStart, 6), 'El turno está fuera de la semana.');
    requireAttendance(typeof row.rest === 'boolean', 'Indica si es turno o descanso.');
    const key = `${row.employeeId}:${date}`;
    requireAttendance(!seen.has(key), 'Solo se admite un turno o descanso por empleado y día.');
    seen.add(key);
    const shift = { employeeId: row.employeeId, date, rest: row.rest, start: row.rest ? '' : row.start, end: row.rest ? '' : row.end };
    if (!shift.rest) shiftBounds(shift);
    return shift;
  });
  // Require explicit coverage: a blank day is not silently interpreted as a rest day.
  for (const employeeId of employeeIds) {
    for (let day = 0; day < 7; day++) {
      requireAttendance(seen.has(`${employeeId}:${addDays(weekStart, day)}`), 'Cada empleado activo debe tener turno o descanso los siete días.');
    }
  }
  assertNoOverlap(plan);
  return plan.sort((a, b) => a.date.localeCompare(b.date) || a.employeeId - b.employeeId);
}

export function assertNoOverlap(plan: Shift[]) {
  const turns = plan.filter(s => !s.rest).map(s => ({ ...s, ...shiftBounds(s) }))
    .sort((a, b) => a.employeeId - b.employeeId || a.start.getTime() - b.start.getTime());
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].employeeId === turns[i - 1].employeeId) {
      requireAttendance(turns[i].start >= turns[i - 1].end, 'Hay turnos superpuestos, revisa también el turno nocturno anterior.');
    }
  }
}

export function requireDraftEditable(status: string, weekStart: string, now = new Date()) {
  requireAttendance(status === 'draft', 'La programación está bloqueada; solicita un cambio a RH.', 409);
  requireAttendance(now < civilToInstant(weekStart, '00:00'), 'La semana ya comenzó. Solo RH puede autorizar una excepción.', 409);
}

export function requireVersion(actual: number, supplied: unknown) {
  requireAttendance(Number.isInteger(supplied) && actual === supplied, 'La información cambió. Recarga antes de guardar para no sobrescribir a otro usuario.', 409);
}

export function lateness(start: Date, actual: Date, tolerance = TOLERANCE_MINUTES) {
  const seconds = Math.max(0, Math.floor((actual.getTime() - start.getTime()) / 1000));
  return {
    lateMinutes: Math.ceil(seconds / 60),
    beyondToleranceMinutes: Math.ceil(Math.max(0, seconds - tolerance * 60) / 60),
    status: seconds === 0 ? 'A tiempo' : seconds <= tolerance * 60 ? 'Dentro de tolerancia' : 'Retardo',
  };
}

export function requireStationAccess(role: string, assignedStationId: number | null, stationId: number) {
  requireAttendance(['rh', 'jefe'].includes(role) || (role === 'estacion' && assignedStationId === stationId), 'No tienes acceso a esta estación.', 403);
}

export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
