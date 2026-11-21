import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dateOnly, monday, civilToInstant, shiftBounds, normalizePlan, requireDraftEditable,
  requireVersion, requireStationAccess, lateness, csvCell, assertNoOverlap, Shift } from '../domain/attendance';

const week = '2030-01-07';
const plan = (): Shift[] => Array.from({ length: 7 }, (_, day) => ({ employeeId: 1, date: addDays(week, day), rest: true, start: '', end: '' }));
test('attendance: fechas reales y semana que inicia en lunes', () => {
  assert.equal(monday(week), week);
  assert.throws(() => monday('2030-01-08'));
  assert.throws(() => dateOnly('2030-02-30'));
  assert.throws(() => dateOnly('texto'));
});
test('attendance: hora de México independiente del huso del servidor', () => {
  assert.equal(civilToInstant(week, '08:00').toISOString(), '2030-01-07T14:00:00.000Z');
  assert.throws(() => civilToInstant(week, '25:00'));
});
test('attendance: tolerancia exacta, segundos y minutos excedentes', () => {
  const start = new Date('2030-01-07T14:00:00Z');
  assert.equal(lateness(start, new Date('2030-01-07T13:50:00Z')).lateMinutes, 0);
  assert.equal(lateness(start, start).status, 'A tiempo');
  assert.equal(lateness(start, new Date('2030-01-07T14:15:00Z')).status, 'Dentro de tolerancia');
  assert.deepEqual(lateness(start, new Date('2030-01-07T14:20:00Z')), { lateMinutes: 20, beyondToleranceMinutes: 5, status: 'Retardo' });
  assert.equal(lateness(start, new Date('2030-01-07T14:15:01Z')).status, 'Retardo');
});
test('attendance: salida nocturna corresponde al día siguiente', () => {
  const bounds = shiftBounds({ employeeId: 1, date: week, rest: false, start: '22:00', end: '06:00' });
  assert.equal(bounds.end.toISOString(), '2030-01-08T12:00:00.000Z');
  assert.equal((bounds.end.getTime() - bounds.start.getTime()) / 3600000, 8);
});
test('attendance: rechaza jornadas iguales, extensas y descansos como checadas', () => {
  for (const shift of [{ start: '08:00', end: '08:00', rest: false }, { start: '08:00', end: '07:00', rest: false }, { start: '', end: '', rest: true }]) {
    assert.throws(() => shiftBounds({ ...shift, employeeId: 1, date: week }));
  }
});
test('attendance: exige cobertura explícita y empleado de estación', () => {
  assert.equal(normalizePlan(plan(), week, [1]).length, 7);
  assert.throws(() => normalizePlan(plan().slice(0, 6), week, [1]));
  assert.throws(() => normalizePlan(plan(), week, [2]));
  assert.throws(() => normalizePlan([...plan(), plan()[0]], week, [1]));
  assert.throws(() => normalizePlan([{ ...plan()[0], date: addDays(week, 7) }], week, [1]));
});
test('attendance: rechaza turnos superpuestos incluso a través de medianoche', () => {
  const rows = plan();
  rows[0] = { ...rows[0], rest: false, start: '22:00', end: '06:00' };
  rows[1] = { ...rows[1], rest: false, start: '05:00', end: '13:00' };
  assert.throws(() => normalizePlan(rows, week, [1]));
  rows[1].start = '06:00';
  assert.equal(normalizePlan(rows, week, [1]).length, 7);
});
test('attendance: detecta superposición entre semanas', () => {
  assert.throws(() => assertNoOverlap([
    { employeeId: 1, date: '2030-01-06', rest: false, start: '22:00', end: '06:00' },
    { employeeId: 1, date: week, rest: false, start: '05:00', end: '13:00' },
  ]));
});
test('attendance: estaciones no reescriben semanas aprobadas o comenzadas', () => {
  requireDraftEditable('draft', week, new Date('2030-01-06T23:00:00Z'));
  assert.throws(() => requireDraftEditable('approved', week, new Date('2029-01-01')));
  assert.throws(() => requireDraftEditable('submitted', week, new Date('2029-01-01')));
  assert.throws(() => requireDraftEditable('draft', week, new Date('2030-01-07T06:00:00Z')));
});
test('attendance: control de versiones impide sobrescrituras', () => {
  requireVersion(3, 3);
  assert.throws(() => requireVersion(3, 2));
  assert.throws(() => requireVersion(3, '3'));
});
test('attendance: alcance de consulta por vínculo estable; RH y Jefe consultan todas las estaciones', () => {
  requireStationAccess('rh', null, 2);
  requireStationAccess('jefe', null, 2);
  requireStationAccess('estacion', 2, 2);
  for (const [role, assigned] of [['estacion', 1], ['estacion', null], ['sistemas', 2]] as const) {
    assert.throws(() => requireStationAccess(role, assigned, 2));
  }
});
test('attendance: CSV conserva comillas y neutraliza fórmulas', () => {
  assert.equal(csvCell('Una "prueba"'), '"Una ""prueba"""');
  assert.equal(csvCell('=HYPERLINK("url")'), '"\'=HYPERLINK(""url"")"');
  assert.equal(csvCell(' +2'), '"\' +2"');
  assert.equal(csvCell(null), '""');
});
