import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AttendanceWeek, AttendanceEmployee, AttendanceShift, AttendanceChange, addDays, errorMessage, attendanceApi } from '../services/attendance';

interface Props { stationId: number; weekStart: string; week: AttendanceWeek | null; employees: AttendanceEmployee[];
  changes: AttendanceChange[]; isRH: boolean; readOnly?: boolean; refresh: () => void }

export default function AttendancePlanner({ stationId, weekStart, week, employees, changes, isRH, readOnly = false, refresh }: Props) {
  const [plan, setPlan] = useState<AttendanceShift[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[] | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const listed = employees.filter(e => e.active || week?.plan.some(s => s.employeeId === e.id));
  const editable = !readOnly && (isRH || !week || week.status === 'draft' || requesting);
  const dirty = !!week && JSON.stringify(plan) !== JSON.stringify(week.plan);
  useEffect(() => {
    setPlan(week?.plan ?? employees.filter(e => e.active).flatMap(e => days.map(date => ({ employeeId: e.id, date, rest: true, start: '', end: '' }))));
    setRequesting(false); setReason(''); setHistory(null);
  }, [week, employees, weekStart]);
  const update = (employeeId: number, date: string, patch: Partial<AttendanceShift>) => {
    setPlan(previous => {
      const row = previous.find(s => s.employeeId === employeeId && s.date === date) || { employeeId, date, rest: true, start: '', end: '' };
      return [...previous.filter(s => s !== row), { ...row, ...patch }];
    });
  };
  const run = async (operation: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    try { await operation(); toast.success(message); refresh(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const save = () => run(() => {
    if (requesting && week) return api.post(`${attendanceApi}/weeks/${week.id}/changes`, { version: week.version, plan, reason });
    return week ? api.put(`${attendanceApi}/weeks/${week.id}`, { version: week.version, plan, reason })
      : api.post(`${attendanceApi}/weeks`, { stationId, weekStart, plan });
  }, isRH ? 'Programación publicada por RH; no requiere otra autorización.' : requesting ? 'Solicitud enviada; el horario aprobado no cambió.' : 'Borrador guardado');
  const copyPrevious = async () => {
    setBusy(true);
    try {
      const { data } = await api.get(`${attendanceApi}/weeks`, { params: { stationId, weekStart: addDays(weekStart, -7) } });
      if (!data.week) throw new Error('No existe programación en la semana anterior.');
      setPlan(listed.flatMap(e => days.map((date, i) => {
        const old = data.week.plan.find((s: AttendanceShift) => s.employeeId === e.id && s.date === addDays(weekStart, i - 7));
        return { employeeId: e.id, date, rest: old?.rest ?? true, start: old?.start ?? '', end: old?.end ?? '' };
      })));
      toast.success('Semana copiada al borrador. Revisa y guarda los cambios.');
    } catch (error: any) { toast.error(error.response ? errorMessage(error) : error.message); }
    finally { setBusy(false); }
  };
  const status = week ? { draft: 'Borrador', submitted: 'Pendiente de RH', approved: isRH ? 'Aprobado · RH puede ajustar' : 'Aprobado · bloqueado' }[week.status] : 'Sin programación';
  return <section className="attendance-card">
    <div className="attendance-section-heading"><h2>Programación semanal</h2><span className={`attendance-badge ${week?.status || ''}`}>{status}</span></div>
    {!listed.length ? <p className="attendance-empty">Registra primero el personal en la pestaña Empleados.</p> : <>
      <div className="attendance-table-scroll"><table className="attendance-planner"><caption>Turnos del {weekStart} al {days[6]} · America/Mexico_City</caption>
        <thead><tr><th>Empleado</th>{days.map(date => <th key={date}>{new Date(`${date}T12:00:00Z`).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })}</th>)}</tr></thead>
        <tbody>{listed.map(employee => <tr key={employee.id}><th>{employee.name}<small>{employee.number}{!employee.active && ' · Inactivo'}</small></th>{days.map(date => {
          const shift = plan.find(s => s.employeeId === employee.id && s.date === date);
          return <td key={date}><label className="attendance-check"><input type="checkbox" checked={shift?.rest ?? true} disabled={!editable || busy}
            onChange={e => update(employee.id, date, { rest: e.target.checked, start: e.target.checked ? '' : '08:00', end: e.target.checked ? '' : '16:00' })} />Descanso</label>
            {shift && !shift.rest && <><input aria-label={`Entrada ${employee.name} ${date}`} type="time" value={shift.start} disabled={!editable || busy} onChange={e => update(employee.id, date, { start: e.target.value })} />
              <input aria-label={`Salida ${employee.name} ${date}`} type="time" value={shift.end} disabled={!editable || busy} onChange={e => update(employee.id, date, { end: e.target.value })} />
              {shift.end <= shift.start && <small>Salida al día siguiente</small>}</>}
          </td>;
        })}</tr>)}</tbody></table></div>
      {(requesting || isRH) && <label>{isRH ? 'Motivo del ajuste o decisión (obligatorio al modificar)' : 'Motivo de la solicitud'}<textarea value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} placeholder="Mínimo 10 caracteres" /></label>}
      <div className="attendance-actions">
        {editable && <><button disabled={busy || (isRH && !!week && reason.trim().length < 10)} onClick={save}>{isRH ? week?.status === 'approved' ? 'Guardar cambios de RH' : 'Guardar y publicar' : requesting ? 'Enviar solicitud a RH' : 'Guardar borrador'}</button><button className="secondary" disabled={busy} onClick={copyPrevious}>Copiar semana anterior</button></>}
        {!readOnly && !isRH && week?.status === 'draft' && <button disabled={busy || dirty} onClick={() => run(() => api.post(`${attendanceApi}/weeks/${week.id}/submit`, { version: week.version }), 'Programación enviada a RH')}>Enviar guardado a RH</button>}
        {!readOnly && !isRH && week?.status === 'approved' && <button className="secondary" disabled={busy} onClick={() => { setPlan(week.plan); setRequesting(!requesting); }}>{requesting ? 'Cancelar solicitud' : 'Solicitar cambio de turnos'}</button>}
        {isRH && week?.status === 'submitted' && <>
          <button disabled={busy || dirty || reason.trim().length < 10} onClick={() => run(() => api.post(`${attendanceApi}/weeks/${week.id}/decision`, { version: week.version, approve: true, reason }), 'Semana aprobada y bloqueada')}>Aprobar semana enviada</button>
          <button className="secondary" disabled={busy || reason.trim().length < 10} onClick={() => run(() => api.post(`${attendanceApi}/weeks/${week.id}/decision`, { version: week.version, approve: false, reason }), 'Devuelto a borrador')}>Devolver a estación</button>
        </>}
        {(isRH || readOnly) && week && <button className="secondary" disabled={busy} onClick={async () => { try { setHistory((await api.get(`${attendanceApi}/weeks/${week.id}/audit`)).data); } catch (e) { toast.error(errorMessage(e)); } }}>Ver historial</button>}
      </div>
      {editable && dirty && <p className="attendance-note" role="status">Hay cambios sin guardar.</p>}
    </>}
    {changes.length > 0 && <div className="attendance-changes"><h3>Solicitudes de cambio</h3>{changes.map(change => <details key={change.id}>
      <summary>Solicitud #{change.id} · {change.status === 'pending' ? 'Pendiente' : change.status === 'approved' ? 'Aprobada' : 'Rechazada'} · {change.reason}</summary>
      {change.decisionReason && <p>{change.decisionReason}</p>}
      <ul>{change.proposedPlan.filter(s => JSON.stringify(s) !== JSON.stringify(week?.plan.find(p => p.employeeId === s.employeeId && p.date === s.date))).map(s => {
        const before = week?.plan.find(p => p.employeeId === s.employeeId && p.date === s.date);
        return <li key={`${s.employeeId}-${s.date}`}>{employees.find(e => e.id === s.employeeId)?.name} · {s.date}: {before?.rest ? 'Descanso' : `${before?.start}–${before?.end}`} → {s.rest ? 'Descanso' : `${s.start}–${s.end}`}</li>;
      })}</ul>
      {isRH && change.status === 'pending' && week && <div className="attendance-actions">
        <button disabled={busy || reason.trim().length < 10 || change.baseVersion !== week.version} onClick={() => run(() => api.post(`${attendanceApi}/weeks/${week.id}/changes/${change.id}/decision`, { version: week.version, approve: true, reason }), 'Cambio autorizado con historial')}>Autorizar cambio</button>
        <button className="secondary" disabled={busy || reason.trim().length < 10} onClick={() => run(() => api.post(`${attendanceApi}/weeks/${week.id}/changes/${change.id}/decision`, { version: week.version, approve: false, reason }), 'Solicitud rechazada')}>Rechazar</button>
        {change.baseVersion !== week.version && <small>El horario cambió después de esta solicitud. Recházala y pide una nueva para evitar sobrescribir cambios.</small>}
      </div>}
    </details>)}</div>}
    {history && <div><h3>Historial (cuenta responsable)</h3>{history.map(item => <details key={item.id}><summary>{new Date(item.createdAt).toLocaleString('es-MX')} · {item.actorName} · {item.action}</summary><p>{item.reason}</p><pre>{JSON.stringify({ anterior: item.before, nuevo: item.after }, null, 2)}</pre></details>)}</div>}
  </section>;
}
