import { FormEvent, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RootState } from '../store';
import api from '../services/api';
import BrandLoader from '../components/BrandLoader';
import AttendancePlanner from '../components/AttendancePlanner';
import AttendanceReports from '../components/AttendanceReports';
import AttendanceDocuments from '../components/AttendanceDocuments';
import { updateUser } from '../store/slices/authSlice';
import { AttendanceEmployee, AttendanceWeek, AttendanceChange, Bootstrap, attendanceApi, errorMessage, weekMonday, addDays } from '../services/attendance';
import '../styles/Attendance.css';

export default function Attendance() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user)!;
  const isRH = user.rol === 'rh';
  const readOnly = user.rol === 'jefe';
  const canSeeAll = isRH || readOnly;
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [stationId, setStationId] = useState(0);
  const [weekStart, setWeekStart] = useState(addDays(weekMonday(), 7));
  const [tab, setTab] = useState('turnos');
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [week, setWeek] = useState<AttendanceWeek | null>(null);
  const [changes, setChanges] = useState<AttendanceChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(r => r + 1);

  useEffect(() => {
    let cancelled = false;
    api.get(`${attendanceApi}/bootstrap`).then(({ data }) => {
      if (cancelled) return;
      if (data.role && data.role !== user.rol) dispatch(updateUser({ rol: data.role }));
      setBootstrap(data); setStationId(id => data.stations.some((s: any) => s.id === id) ? id : data.stations[0]?.id || 0);
      setError(''); if (!data.stations.length) setLoading(false);
    }).catch(e => { if (!cancelled) { setError(errorMessage(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [revision, user.rol, dispatch]);

  useEffect(() => {
    if (!stationId) return;
    let cancelled = false;
    setLoading(true); setError(''); setEmployees([]); setWeek(null); setChanges([]);
    Promise.all([
      api.get(`${attendanceApi}/employees`, { params: { stationId } }),
      api.get(`${attendanceApi}/weeks`, { params: { stationId, weekStart } }),
    ]).then(([people, schedule]) => {
      if (cancelled) return;
      setEmployees(people.data); setWeek(schedule.data.week); setChanges(schedule.data.changes);
    }).catch(e => { if (!cancelled) setError(errorMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [stationId, weekStart, revision]);

  return <div className="attendance-page">
    <header className="attendance-heading"><div><span className="attendance-eyebrow">LA VILLITA · ASISTENCIA</span><h1>{canSeeAll ? 'Control de asistencia' : 'Turnos de mi estación'}</h1></div>
      {user.rol === 'estacion' && <Link className="attendance-link" to="/attendance/clock">Abrir reloj checador</Link>}</header>
    {readOnly && <p className="attendance-note">Solo lectura</p>}
    <nav className="attendance-tabs" aria-label="Secciones de asistencia">
      {[['turnos', 'Programación'], ['empleados', 'Empleados'], ['documentos', 'Documentos RH'], ...(canSeeAll ? [['pendientes', 'Pendientes RH'], ['reportes', 'Reportes semanales'], ['configuracion', 'Estaciones y acceso']] : [])].map(([key, label]) =>
        <button key={key} aria-pressed={tab === key} onClick={() => { setTab(key); if (key === 'reportes' && tab !== key) setWeekStart(weekMonday()); }}>{label}</button>)}
    </nav>
    {bootstrap && !['documentos', 'pendientes'].includes(tab) && <div className="attendance-toolbar">
      <label>{canSeeAll ? 'Estación consultada' : 'Mi estación'}<select value={stationId || ''} onChange={e => setStationId(Number(e.target.value))} disabled={!bootstrap.stations.length}>
        {!bootstrap.stations.length && <option value="">Sin estación vinculada</option>}{bootstrap.stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
      <label>Semana (selecciona una fecha)<input type="date" value={weekStart} onChange={e => e.target.value && setWeekStart(weekMonday(e.target.value))} /></label>
      <button className="secondary" onClick={refresh}>Actualizar</button>
    </div>}
    {error && <div className="attendance-error" role="alert">{error}<button onClick={refresh}>Reintentar</button></div>}
    {canSeeAll && tab === 'pendientes' && bootstrap ? <PendingSchedules stations={bootstrap.stations} revision={revision} onOpen={(id, date) => { setStationId(id); setWeekStart(date); setTab('turnos'); }} /> :
      tab === 'documentos' && bootstrap && (canSeeAll || stationId) ? <AttendanceDocuments key={stationId} stationId={stationId} stations={bootstrap.stations} employees={employees} role={user.rol} /> :
      canSeeAll && tab === 'configuracion' && bootstrap ? <StationSetup data={bootstrap} stationId={stationId} refresh={refresh} readOnly={readOnly} /> :
      loading ? <BrandLoader variant="page" label="Cargando asistencia..." /> : !bootstrap?.stations.length ? <section className="attendance-card attendance-empty">
        <h2>{isRH ? 'Configura la primera estación' : readOnly ? 'No hay estaciones registradas' : 'Tu cuenta aún no está vinculada'}</h2><p>{isRH ? 'En Estaciones y acceso, registra cada estación y vincula su cuenta. Después agrega los empleados.' : readOnly ? 'RH debe registrar las estaciones para que puedas consultar su información.' : 'Solicita a RH que vincule esta cuenta a tu estación. No se usa el nombre editable del perfil para autorizar accesos.'}</p>
        {isRH && <button onClick={() => setTab('configuracion')}>Configurar estaciones</button>}
      </section> : !error && <>
        {tab === 'turnos' && <AttendancePlanner stationId={stationId} weekStart={weekStart} week={week} employees={employees} changes={changes} isRH={isRH} readOnly={readOnly} refresh={refresh} />}
        {tab === 'empleados' && <Employees key={stationId} stationId={stationId} employees={employees} refresh={refresh} readOnly={readOnly} canEdit={isRH} />}
        {tab === 'reportes' && canSeeAll && <AttendanceReports key={`${stationId}-${weekStart}`} stationId={stationId} weekStart={weekStart} week={week} employees={employees} readOnly={readOnly} />}
      </>}
  </div>;
}

function PendingSchedules({ stations, revision, onOpen }: { stations: Bootstrap['stations']; revision: number; onOpen: (stationId: number, weekStart: string) => void }) {
  const [data, setData] = useState<any>(null); const [error, setError] = useState(''); const [filter, setFilter] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    api.get(`${attendanceApi}/pending`, { signal: controller.signal }).then(({ data }) => setData(data)).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [revision, reload]);
  const rows = data ? [...data.weeks.map((w: any) => ({ key: `w${w.id}`, week: w, label: 'Programación pendiente de aprobación' })),
    ...data.changes.filter((c: any) => c.week).map((c: any) => ({ key: `c${c.id}`, week: c.week, label: `Solicitud #${c.id}: ${c.reason}` }))].filter(r => !filter || String(r.week.stationId) === filter) : [];
  return <section className="attendance-card"><h2>Pendientes de revisión</h2>
    <div className="attendance-toolbar"><label>Estación<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todas las estaciones</option>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="secondary" onClick={() => setReload(n => n + 1)}>Actualizar pendientes</button></div>
    {error ? <p role="alert" className="attendance-error">{error}</p> : !data ? <BrandLoader label="Cargando pendientes…" /> : !rows.length ? <p>No hay solicitudes pendientes con este filtro.</p> : <div className="attendance-table-scroll"><table><thead><tr><th>Estación</th><th>Semana</th><th>Pendiente</th><th>Revisar</th></tr></thead><tbody>{rows.map(row => <tr key={row.key}><td>{stations.find(s => s.id === row.week.stationId)?.name}</td><td>{row.week.weekStart}</td><td>{row.label}</td><td><button onClick={() => onOpen(row.week.stationId, row.week.weekStart)}>Revisar programación</button></td></tr>)}</tbody></table></div>}
  </section>;
}

function StationSetup({ data, stationId, refresh, readOnly = false }: { data: Bootstrap; stationId: number; refresh: () => void; readOnly?: boolean }) {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await api.post(`${attendanceApi}/stations`, { name }); setName(''); toast.success('Estación creada'); refresh(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  async function assign(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await api.put(`${attendanceApi}/stations/${stationId}/account`, { userId: Number(userId), reason }); toast.success('Acceso vinculado'); setReason(''); refresh(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className="attendance-grid" style={readOnly ? { gridTemplateColumns: '1fr' } : undefined}>
    {!readOnly && <section className="attendance-card"><h2>Registrar estación</h2>
      <form onSubmit={create}><label>Nombre de estación<input required maxLength={255} value={name} onChange={e => setName(e.target.value)} /></label><button disabled={busy}>Crear estación</button></form></section>}
    <section className="attendance-card"><h2>{readOnly ? 'Cuentas vinculadas a estaciones' : 'Vincular cuenta a estación'}</h2>
      {!readOnly && <form onSubmit={assign}><label>Cuenta de estación<select required value={userId} onChange={e => setUserId(e.target.value)}><option value="">Selecciona una cuenta</option>{data.accounts.map(a => <option key={a.id} value={a.id}>{a.nombre} · {a.estacion}</option>)}</select></label>
        <label>Motivo<input required minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={busy || !stationId}>Guardar vinculación</button></form>}
      <ul>{data.assignments.map(a => <li key={a.userId}>{data.accounts.find(u => u.id === a.userId)?.nombre || `Cuenta ${a.userId}`} → {data.stations.find(s => s.id === a.stationId)?.name}</li>)}</ul>
    </section>
  </div>;
}

function Employees({ stationId, employees, refresh, readOnly = false, canEdit = false }: { stationId: number; employees: AttendanceEmployee[]; refresh: () => void; readOnly?: boolean; canEdit?: boolean }) {
  const empty = { name: '', number: '', photo: null as string | null, active: true };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<AttendanceEmployee | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setEditing(null); setForm(empty); setReason(''); }, [stationId]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (readOnly || busy || (editing && !canEdit)) return; setBusy(true);
    try {
      if (editing) await api.put(`${attendanceApi}/employees/${editing.id}`, { ...form, version: editing.version, reason });
      else await api.post(`${attendanceApi}/employees`, { ...form, stationId });
      toast.success(editing ? 'Empleado actualizado con historial' : 'Empleado registrado'); setForm(empty); setEditing(null); setReason(''); refresh();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  async function photo(file?: File) {
    if (!file) return;
    if (file.size > 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Selecciona JPG, PNG o WebP de máximo 1 MB.');
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo: String(reader.result) }));
    reader.onerror = () => toast.error('No se pudo leer la foto.'); reader.readAsDataURL(file);
  }
  return <div className="attendance-grid" style={readOnly ? { gridTemplateColumns: '1fr' } : undefined}>{!readOnly && <section className="attendance-card"><h2>{editing ? 'Editar empleado' : 'Nuevo empleado'}</h2>
    <form onSubmit={submit}>
      <label>Número de empleado<input required maxLength={40} value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} /></label>
      <label>Nombre completo<input required maxLength={255} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Foto (máximo 1 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => photo(e.target.files?.[0])} /></label>
      {form.photo && <div className="attendance-photo-preview"><img src={form.photo} alt="Foto del empleado" /><button type="button" className="secondary" onClick={() => setForm({ ...form, photo: null })}>Quitar foto</button></div>}
      {editing && <><label className="attendance-check"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Empleado activo</label>
        <label>Motivo del cambio<textarea required minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label></>}
      <div className="attendance-actions"><button disabled={busy}>{editing ? 'Guardar cambios' : 'Registrar empleado'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(empty); }}>Cancelar</button>}</div>
    </form></section>}
    <section className="attendance-card"><h2>Personal de la estación</h2>{!employees.length && <p className="attendance-empty">Todavía no hay empleados.</p>}
      <div className="attendance-people">{employees.map(e => <article key={e.id}>
        {e.photo ? <img src={e.photo} alt="" /> : <span className="attendance-avatar">{e.name.charAt(0)}</span>}
        <div><strong>{e.name}</strong><small>{e.number} · {e.active ? 'Activo' : 'Inactivo'}</small><small>Huella pendiente de enrolamiento</small></div>
        {canEdit && !readOnly && <button className="secondary" onClick={() => { setEditing(e); setForm({ name: e.name, number: e.number, photo: e.photo, active: e.active }); setReason(''); }}>Editar</button>}
      </article>)}</div>
    </section></div>;
}
