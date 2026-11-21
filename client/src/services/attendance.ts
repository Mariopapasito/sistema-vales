import api from './api';

export interface AttendanceStation { id: number; name: string; timeZone: string }
export interface AttendanceEmployee { id: number; stationId: number; number: string; name: string; photo: string | null; active: boolean; version: number }
export interface AttendanceShift { employeeId: number; date: string; rest: boolean; start: string; end: string }
export interface AttendanceWeek { id: number; stationId: number; weekStart: string; status: 'draft' | 'submitted' | 'approved'; version: number; plan: AttendanceShift[]; toleranceMinutes: number }
export interface AttendanceChange { id: number; requestedBy: number; baseVersion: number; status: string; reason: string; decisionReason: string | null; proposedPlan: AttendanceShift[] }
export interface Bootstrap { stations: AttendanceStation[]; accounts: { id: number; nombre: string; estacion: string }[]; assignments: { userId: number; stationId: number }[]; serverNow: string }
export const attendanceApi = '/attendance';
export function addDays(date: string, n: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + n);
  return value.toISOString().slice(0, 10);
}
export function localToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function weekMonday(date = localToday()) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -(day === 0 ? 6 : day - 1));
}
export function displayTime(value: string | null) {
  return value ? new Date(value).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' }) : '—';
}
export function errorMessage(error: any) { return error.response?.data?.message || 'No se pudo conectar. No se confirmó el guardado; recarga antes de reintentar.'; }
export function attendanceRequestId() {
  // getRandomValues also works on development LAN origins where randomUUID may be unavailable.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Contract boundary: a browser preview is not a fingerprint result and cannot create attendance.
export interface ReaderStatus { connected: boolean; message: string }
export interface AttendanceReaderAdapter { getStatus(): Promise<ReaderStatus> }
export const unavailableReader: AttendanceReaderAdapter = {
  async getStatus() { return { connected: false, message: 'Lector pendiente de integración. No se registran checadas desde esta pantalla.' }; },
};
export async function exportAttendancePDF(report: any) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const title = `Asistencia · ${report.station.name}`;
  doc.setFontSize(14);
  const titleLines = doc.splitTextToSize(title, 250);
  doc.text(titleLines, 12, 14);
  const infoY = 17 + titleLines.length * 6;
  doc.setFontSize(9);
  doc.text(`Semana ${report.weekStart} | Tolerancia: ${report.toleranceMinutes} min | Versión ${report.scheduleVersion}`, 12, infoY);
  doc.text('PROVISIONAL · Sin lector integrado. Registros manuales RH; no acredita verificación biométrica.', 12, infoY + 6);
  autoTable(doc, {
    startY: infoY + 12, margin: { left: 12, right: 12, top: 15, bottom: 15 }, theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [14, 43, 157] }, rowPageBreak: 'avoid', showHead: 'everyPage',
    head: [['Empleado', 'Fecha / turno', 'Entrada', 'Salida', 'Min. inicio / fuera tolerancia', 'Min. registrados', 'Estado / origen']],
    body: report.rows.map((r: any) => [`${r.number} · ${r.name}`, `${r.date}\n${r.schedule}`, displayTime(r.entry), displayTime(r.exit),
      `${r.lateMinutes} / ${r.beyondToleranceMinutes}\nOriginal: ${r.originalLateMinutes ?? '—'}`, r.workedMinutes ?? '—',
      `${r.status}\n${r.sources}${r.adjusted ? '\nCon revisión: consultar historial' : ''}`]),
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8);
    doc.text(`Generado: ${displayTime(report.generatedAt)} · Página ${i} de ${pages}`, 12, doc.internal.pageSize.getHeight() - 6);
  }
  doc.save(`asistencia-${report.weekStart}.pdf`);
}
export async function exportAttendanceCSV(stationId: number, weekStart: string, employeeId: string) {
  const { data } = await api.get(`${attendanceApi}/reports`, { params: { stationId, weekStart, employeeId, format: 'csv' }, responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a'); a.href = url; a.download = `asistencia-${weekStart}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
