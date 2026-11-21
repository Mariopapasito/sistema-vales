import { requireAttendance as check } from './attendance';

export const DOCUMENT_CATEGORIES = ['expediente', 'oficio', 'nomina_firmada', 'acta_administrativa'] as const;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export function validateDocument(file?: { originalname: string; buffer: Buffer; size: number }) {
  check(file && file.size > 0 && file.size <= MAX_DOCUMENT_BYTES, 'Selecciona un PDF de hasta 10 MB.');
  check(/\.pdf$/i.test(file.originalname), 'Solo se permiten archivos PDF.');
  check(file.buffer.subarray(0, 5).toString('ascii') === '%PDF-' && file.buffer.subarray(-2048).includes(Buffer.from('%%EOF')), 'El archivo no tiene una estructura PDF reconocible.');
  // Never use the client name as a filesystem path or an unescaped HTTP header.
  return file.originalname.split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f"<>:|?*]/g, '_').slice(-180);
}
