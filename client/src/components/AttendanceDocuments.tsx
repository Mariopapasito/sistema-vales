import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import BrandLoader from './BrandLoader';
import { AttendanceEmployee, AttendanceStation, attendanceApi, errorMessage } from '../services/attendance';

const categories: Record<string, string> = { expediente: 'Expediente', oficio: 'Oficio', nomina_firmada: 'Nómina firmada', acta_administrativa: 'Acta administrativa' };
type Document = { id: number; stationId: number; category: string; title: string; filename: string; size: number; createdAt: string };
type Queued = { file: File; state: 'pending' | 'saved' | 'error'; error?: string };
export default function AttendanceDocuments({ stationId, stations, employees, role }: { stationId: number; stations: AttendanceStation[]; employees: AttendanceEmployee[]; role: string }) {
  const station = role === 'estacion';
  const [filterStation, setFilterStation] = useState(stationId ? String(stationId) : '');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [page, setPage] = useState(1); const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ documents: Document[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [queue, setQueue] = useState<Queued[]>([]); const [uploadCategory, setUploadCategory] = useState('expediente');
  const [employeeId, setEmployeeId] = useState(''); const [busy, setBusy] = useState(false); const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => () => uploadController.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setResult(null);
    api.get(`${attendanceApi}/documents`, { params: { stationId: station ? stationId : filterStation, category, from, to, page }, signal: controller.signal })
      .then(({ data }) => setResult(data)).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [stationId, filterStation, category, from, to, page, revision, station]);
  function select(files: FileList | null) {
    if (!files || busy) return;
    const accepted = Array.from(files).filter(file => {
      if (!/\.pdf$/i.test(file.name) || file.size === 0 || file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: selecciona un PDF de hasta 10 MB.`); return false; }
      return true;
    });
    setQueue(previous => [...previous, ...accepted.map(file => ({ file, state: 'pending' as const }))].slice(0, 10));
    if (input.current) input.current.value = '';
  }
  async function upload() {
    if (busy || !stationId) return;
    setBusy(true); const controller = new AbortController(); uploadController.current = controller;
    for (let index = 0; index < queue.length; index++) {
      if (controller.signal.aborted) break;
      const item = queue[index]; if (item.state === 'saved') continue;
      const body = new FormData(); body.append('file', item.file); body.append('stationId', String(stationId));
      body.append('category', uploadCategory); body.append('title', item.file.name.replace(/\.pdf$/i, '').slice(0, 255));
      if (employeeId) body.append('employeeId', employeeId);
      try {
        await api.post(`${attendanceApi}/documents`, body, { signal: controller.signal });
        setQueue(q => q.map((entry, i) => i === index ? { ...entry, state: 'saved', error: undefined } : entry));
      } catch (e) {
        if (!controller.signal.aborted) setQueue(q => q.map((entry, i) => i === index ? { ...entry, state: 'error', error: errorMessage(e) } : entry));
      }
    }
    if (!controller.signal.aborted) { setBusy(false); setRevision(v => v + 1); }
  }
  async function download(document: Document) {
    try {
      const { data } = await api.get(`${attendanceApi}/documents/${document.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(data); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.filename;
      window.document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { toast.error('No se pudo descargar el documento. Solo RH tiene permiso.'); }
  }
  return <section className="attendance-card">
    <h2>Documentos enviados a RH</h2>
    {station && <div className="attendance-document-upload">
      <div className="attendance-toolbar"><label>Tipo de documento<select aria-label="Tipo de documento" disabled={busy} value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Empleado (opcional)<select disabled={busy} value={employeeId} onChange={e => setEmployeeId(e.target.value)}><option value="">Documento de la estación</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>
      <div className={`attendance-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); select(e.dataTransfer.files); }}>
        <strong>Arrastra tus PDF aquí</strong><span>Hasta 10 archivos por lote · máximo 10 MB por archivo</span>
        <button type="button" className="secondary" disabled={busy} onClick={() => input.current?.click()}>Buscar archivos en mi computadora</button>
        <input ref={input} hidden type="file" accept="application/pdf,.pdf" multiple disabled={busy} onChange={e => select(e.target.files)} />
      </div>
      {queue.length > 0 && <><ul aria-live="polite">{queue.map((item, i) => <li key={`${i}-${item.file.name}`}>{item.file.name} — {item.state === 'saved' ? 'Enviado a RH' : item.state === 'error' ? item.error : 'Pendiente de subir'}{item.state !== 'saved' && !busy && <button className="secondary" onClick={() => setQueue(q => q.filter((_, index) => index !== i))}>Quitar</button>}</li>)}</ul>
        <div className="attendance-actions"><button disabled={busy || queue.every(q => q.state === 'saved')} onClick={upload}>{busy ? 'Enviando…' : 'Enviar documentos a RH'}</button><button className="secondary" disabled={busy} onClick={() => setQueue([])}>Limpiar lista</button></div></>}
    </div>}
    <div className="attendance-toolbar">
      {!station && <label>Filtrar estación<select aria-label="Filtrar estación" value={filterStation} onChange={e => { setFilterStation(e.target.value); setPage(1); }}><option value="">Todas las estaciones</option>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
      <label>Tipo<select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="">Todos los tipos</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Desde<input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></label><label>Hasta<input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></label>
      <button className="secondary" onClick={() => setRevision(v => v + 1)}>Actualizar documentos</button>
    </div>
    {loading ? <BrandLoader label="Cargando documentos…" /> : error ? <p role="alert" className="attendance-error">{error}</p> : result && <>
      {!result.documents.length ? <p>No hay documentos con estos filtros.</p> : <div className="attendance-table-scroll"><table><thead><tr><th>Estación</th><th>Documento</th><th>Tipo</th><th>Enviado</th><th>Archivo</th></tr></thead><tbody>{result.documents.map(doc => <tr key={doc.id}><td>{stations.find(s => s.id === doc.stationId)?.name || 'Mi estación'}</td><td>{doc.title}<small>{doc.filename} · {(doc.size / 1024).toFixed(0)} KB</small></td><td>{categories[doc.category]}</td><td>{new Date(doc.createdAt).toLocaleString('es-MX')}</td><td>{role === 'rh' ? <button onClick={() => download(doc)}>Descargar PDF</button> : 'Descarga exclusiva de RH'}</td></tr>)}</tbody></table></div>}
      <div className="attendance-actions"><button className="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page} · {result.total} documentos</span><button className="secondary" disabled={page * 25 >= result.total} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
    </>}
  </section>;
}
