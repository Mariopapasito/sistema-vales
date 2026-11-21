import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import BrandLoader from './BrandLoader';
import { AttendanceEmployee, AttendanceWeek, attendanceApi, displayTime, errorMessage, exportAttendanceCSV, exportAttendancePDF, localToday, attendanceRequestId } from '../services/attendance';

export default function AttendanceReports({ stationId, weekStart, week, employees, readOnly = false }: { stationId: number; weekStart: string; week: AttendanceWeek | null; employees: AttendanceEmployee[]; readOnly?: boolean }) {
  const [report, setReport] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ employeeId: '', date: weekStart, actualDate: localToday(), time: '08:00', kind: 'entry', reason: '', void: false });
  const [requestId, setRequestId] = useState(attendanceRequestId);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError(''); setReport(null);
    api.get(`${attendanceApi}/reports`, { params: { stationId, weekStart, employeeId: filter } }).then(({ data }) => { if (!cancelled) setReport(data); })
      .catch(e => { if (!cancelled) setError(errorMessage(e)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [stationId, weekStart, filter, revision]);
  // New content gets a fresh id; a retry after a lost response reuses the same id.
  const update = (patch: Partial<typeof form>) => { setForm({ ...form, ...patch }); setRequestId(attendanceRequestId()); };
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!week || busy || readOnly) return; setBusy(true);
    try {
      if (editing) await api.post(`${attendanceApi}/punches/${editing.id}/corrections`, { ...form, correctionVersion: editing.correctionVersion });
      else await api.post(`${attendanceApi}/punches`, { ...form, weekId: week.id, employeeId: Number(form.employeeId), requestId });
      toast.success(editing ? 'Corrección guardada; el original se conserva.' : 'Captura manual registrada. No es una checada biométrica.');
      setEditing(null); setForm({ ...form, reason: '', void: false }); setRequestId(attendanceRequestId()); setRevision(r => r + 1);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  async function download(type: 'pdf' | 'csv') {
    setBusy(true);
    try { if (type === 'pdf') await exportAttendancePDF(report); else await exportAttendanceCSV(stationId, weekStart, filter); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  const shifts = week?.plan.filter(s => !s.rest && String(s.employeeId) === form.employeeId) || [];
  return <section className="attendance-card">
    <div className="attendance-section-heading"><div><h2>{readOnly ? 'Reporte semanal · solo lectura' : 'Reporte semanal RH'}</h2></div>
      <label>Empleado<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>
    {loading ? <BrandLoader label="Preparando reporte..." /> : error ? <p role="alert" className="attendance-error">{error}</p> : report && <>
      <div className="attendance-actions"><button disabled={busy} onClick={() => download('pdf')}>Descargar PDF</button><button className="secondary" disabled={busy} onClick={() => download('csv')}>Descargar Excel (CSV)</button><button className="secondary" onClick={() => setRevision(r => r + 1)}>Actualizar reporte</button></div>
      <div className="attendance-table-scroll"><table><thead><tr><th>Empleado / fecha</th><th>Turno</th><th>Entrada</th><th>Salida</th><th>Min. desde inicio / fuera tolerancia</th><th>Min. registrados</th><th>Estado</th></tr></thead>
        <tbody>{report.rows.map((r: any) => <tr key={`${r.employeeId}-${r.date}`}><td>{r.name}<small>{r.number} · {r.date}</small></td><td>{r.schedule}</td><td>{displayTime(r.entry)}</td><td>{displayTime(r.exit)}</td><td>{r.lateMinutes} / {r.beyondToleranceMinutes}<small>Original: {r.originalLateMinutes ?? '—'}</small></td><td>{r.workedMinutes ?? '—'}</td><td>{r.status}<small>{r.sources}{r.adjusted ? ' · Con revisión' : ''}</small></td></tr>)}</tbody></table></div>
      <details><summary>Checadas originales y correcciones</summary><div className="attendance-table-scroll"><table><thead><tr><th>Empleado</th><th>Movimiento</th><th>Hora original</th><th>Hora vigente</th><th>Motivo original</th><th>Acción</th></tr></thead><tbody>
        {report.punches.filter((p: any) => !filter || String(p.employeeId) === filter).map((p: any) => <tr key={p.id}><td>{employees.find(e => e.id === p.employeeId)?.name}</td><td>{p.kind === 'entry' ? 'Entrada' : 'Salida'}<small>{p.date} · Manual RH</small></td><td>{displayTime(p.occurredAt)}</td><td>{displayTime(p.effectiveAt)}</td><td>{p.reason}</td><td>{!readOnly && <button className="secondary" disabled={busy} onClick={() => { setEditing(p); setForm({ employeeId: String(p.employeeId), date: p.date, actualDate: p.date, time: '08:00', kind: p.kind, reason: '', void: false }); }}>Corregir</button>}</td></tr>)}
      </tbody></table></div>{report.corrections.map((c: any) => <p key={c.id}>Corrección #{c.id}, checada #{c.punchId}: {displayTime(c.occurredAt)} · {c.reason}</p>)}</details>
    </>}
    {!readOnly && week?.status === 'approved' && <details open={!!editing} className="attendance-manual"><summary>{editing ? `Corregir checada #${editing.id}` : 'Registrar una omisión manualmente (solo RH)'}</summary>
      <form onSubmit={submit}><div className="attendance-form-grid">
        <label>Empleado<select required disabled={!!editing || busy} value={form.employeeId} onChange={e => update({ employeeId: e.target.value, date: '' })}><option value="">Selecciona</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label>Fecha del turno<select required disabled={!!editing || busy} value={form.date} onChange={e => update({ date: e.target.value, actualDate: e.target.value })}><option value="">Selecciona turno</option>{shifts.map(s => <option key={s.date} value={s.date}>{s.date} · {s.start}–{s.end}</option>)}</select></label>
        <label>Movimiento<select disabled={!!editing || busy} value={form.kind} onChange={e => update({ kind: e.target.value })}><option value="entry">Entrada</option><option value="exit">Salida</option></select></label>
        <label>Fecha real<input required type="date" disabled={form.void || busy} value={form.actualDate} onChange={e => update({ actualDate: e.target.value })} /></label>
        <label>Hora real (México)<input required type="time" disabled={form.void || busy} value={form.time} onChange={e => update({ time: e.target.value })} /></label>
      </div>{editing && <label className="attendance-check"><input type="checkbox" checked={form.void} onChange={e => update({ void: e.target.checked })} />Anular sin borrar el original</label>}
        <label>Justificación<textarea required minLength={10} maxLength={2000} disabled={busy} value={form.reason} onChange={e => update({ reason: e.target.value })} /></label>
        <div className="attendance-actions"><button disabled={busy}>{editing ? 'Guardar corrección' : 'Guardar captura manual'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); update({ reason: '', void: false }); }}>Cancelar</button>}</div>
      </form>
    </details>}
  </section>;
}
