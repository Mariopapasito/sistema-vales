import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import BrandLoader from '../components/BrandLoader';
import SecugenTest from '../components/SecugenTest';
import { AttendanceEmployee, AttendanceWeek, Bootstrap, attendanceApi, errorMessage, addDays, weekMonday } from '../services/attendance';
import '../styles/Attendance.css';

export default function AttendanceClock() {
  const { user, accessToken, initialized } = useSelector((s: RootState) => s.auth);
  const [now, setNow] = useState(new Date());
  const [data, setData] = useState<Bootstrap | null>(null);
  const [stationId, setStationId] = useState('');
  const [weekStart, setWeekStart] = useState(addDays(weekMonday(), 7));
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [week, setWeek] = useState<AttendanceWeek | null>(null);
  const [demo, setDemo] = useState(false);
  const [readerTest, setReaderTest] = useState(false);
  const [selection, setSelection] = useState('');
  const [actualDate, setActualDate] = useState(weekStart);
  const [time, setTime] = useState('08:20');
  const [kind, setKind] = useState('entry');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('root')?.scrollTo(0, 0);
  }, []);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (user?.rol !== 'estacion') return;
    let cancelled = false;
    api.get(`${attendanceApi}/bootstrap`).then(({ data }) => { if (!cancelled) { setData(data); setStationId(String(data.stations[0]?.id || '')); } })
      .catch(e => { if (!cancelled) setError(errorMessage(e)); });
    return () => { cancelled = true; };
  }, [user?.id, user?.rol]);
  useEffect(() => {
    setWeek(null); setEmployees([]); setSelection(''); setResult(null);
    if (!stationId || !demo) return;
    let cancelled = false; setBusy(true); setError('');
    Promise.all([api.get(`${attendanceApi}/employees`, { params: { stationId } }), api.get(`${attendanceApi}/weeks`, { params: { stationId, weekStart } })])
      .then(([people, schedule]) => { if (!cancelled) { setEmployees(people.data); setWeek(schedule.data.week); } })
      .catch(e => { if (!cancelled) setError(errorMessage(e)); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [stationId, weekStart, demo]);
  useEffect(() => { if (!result) return; const timer = setTimeout(() => setResult(null), 10000); return () => clearTimeout(timer); }, [result]);
  if (!initialized) return <BrandLoader variant="page" label="Preparando reloj..." />;
  if (!accessToken) return <Navigate to="/login" replace />;
  if (!user || !['rh', 'estacion', 'jefe'].includes(user.rol)) return <Navigate to="/dashboard" replace />;
  if (user.rol !== 'estacion') return <Navigate to="/attendance" replace />;
  const shifts = week?.plan.filter(s => !s.rest) || [];
  const shift = shifts.find(s => `${s.employeeId}:${s.date}` === selection);
  async function preview(event: FormEvent) {
    event.preventDefault(); if (!shift || !week || busy) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const { data } = await api.post(`${attendanceApi}/preview`, { weekId: week.id, employeeId: shift.employeeId, date: shift.date, actualDate, time, kind });
      setResult({ ...data, employee: employees.find(e => e.id === shift.employeeId) });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <main className="attendance-page attendance-clock">
    <header className="attendance-heading"><img className="attendance-clock-logo" src="/LOGO BLANCO.PNG" alt="La Villita" /><Link className="attendance-link" to="/attendance">Volver a programación</Link></header>
    <section className="attendance-clock-face"><span className="attendance-eyebrow">RELOJ CHECADOR · PREPARACIÓN</span><h1>{data?.stations.find(s => String(s.id) === stationId)?.name || 'Estación pendiente de vincular'}</h1>
      <time>{now.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour12: false })}</time><p>{now.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full' })}</p><small>Hora de referencia del equipo · no se utiliza para guardar asistencia</small>
      <div className="attendance-reader-icon" aria-hidden="true">◎</div><h2>SecuGen Hamster Pro 20</h2><p>Pruebas del lector disponibles en Windows. Checadas biométricas aún no habilitadas.</p>
      <button onClick={() => { setReaderTest(!readerTest); setDemo(false); setResult(null); }}>{readerTest ? 'Cerrar prueba del lector' : 'Probar lector de huella'}</button>{' '}
      <button className="secondary" onClick={() => { setDemo(!demo); setReaderTest(false); setResult(null); setError(''); }}>{demo ? 'Cerrar simulador' : 'Probar interfaz sin guardar checadas'}</button>
    </section>
    {readerTest && <SecugenTest key={user.id} />}
    {error && <p className="attendance-error" role="alert">{error}</p>}
    {demo && <section className="attendance-card"><div className="attendance-notice"><strong>SIMULACIÓN · NO ES ASISTENCIA</strong><span>No lee huellas, no guarda registros ni aparece en reportes. Requiere conexión al servidor.</span></div>
      <form onSubmit={preview}><div className="attendance-form-grid">
        <label>Estación<select value={stationId} onChange={e => setStationId(e.target.value)}>{data?.stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Semana<input type="date" value={weekStart} onChange={e => e.target.value && setWeekStart(weekMonday(e.target.value))} /></label>
        <label>Empleado / turno<select required disabled={busy} value={selection} onChange={e => { setSelection(e.target.value); setActualDate(e.target.value.split(':')[1]); setResult(null); }}><option value="">Selecciona un turno guardado</option>{shifts.map(s => <option key={`${s.employeeId}:${s.date}`} value={`${s.employeeId}:${s.date}`}>{employees.find(e => e.id === s.employeeId)?.name} · {s.date} · {s.start}–{s.end}</option>)}</select></label>
        <label>Movimiento<select value={kind} onChange={e => setKind(e.target.value)}><option value="entry">Entrada</option><option value="exit">Salida</option></select></label>
        <label>Fecha simulada<input required type="date" value={actualDate} onChange={e => setActualDate(e.target.value)} /></label>
        <label>Hora simulada<input required type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
      </div><button disabled={busy || !shift}>Simular {kind === 'entry' ? 'entrada' : 'salida'}</button></form>
      {!busy && !shifts.length && <p>Guarda una programación con turnos en la semana seleccionada para probar el cálculo.</p>}
      {busy && <BrandLoader label="Calculando vista previa..." />}
      {result && <div className={`attendance-result ${result.status === 'Retardo' ? 'late' : ''}`} role="status">
        {result.employee?.photo ? <img src={result.employee.photo} alt="" /> : <span className="attendance-avatar">{result.employee?.name?.charAt(0)}</span>}
        <div><small>VISTA PREVIA · NO GUARDADO</small><h2>{result.employee?.name}</h2><p>{data?.stations.find(s => String(s.id) === stationId)?.name}</p><h3>{result.status}</h3>
          {result.kind === 'entry' ? <p>{result.lateMinutes} min desde el inicio · {result.beyondToleranceMinutes} min fuera de tolerancia</p> : <p>Salida anticipada: {result.earlyMinutes} min</p>}</div>
      </div>}
    </section>}
  </main>;
}
