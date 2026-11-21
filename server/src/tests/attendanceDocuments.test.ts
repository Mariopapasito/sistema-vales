import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import jwt from 'jsonwebtoken';
import router from '../routes/attendance';
import sequelize from '../config/database';
import User from '../models/User';
import { AttendanceDocument as Document, AttendanceStation as Station, AttendanceStationUser as Link, AttendanceEmployee as Employee, AttendanceAudit as Audit } from '../models/Attendance';
import { MAX_DOCUMENT_BYTES, validateDocument } from '../domain/attendanceDocuments';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
test('documentos: PDF, tamaño y nombres seguros', () => {
  assert.equal(validateDocument({ originalname: '../../nomina.pdf', buffer: pdf, size: pdf.length }), 'nomina.pdf');
  assert.throws(() => validateDocument());
  assert.throws(() => validateDocument({ originalname: 'x.html', buffer: pdf, size: pdf.length }));
  assert.throws(() => validateDocument({ originalname: 'x.pdf', buffer: Buffer.from('<html>not pdf</html>'), size: 20 }));
  assert.throws(() => validateDocument({ originalname: 'x.pdf', buffer: pdf, size: MAX_DOCUMENT_BYTES + 1 }));
});

test('documentos API: multipart, aislamiento, filtros, contenido privado y descarga solo RH', async t => {
  const originals: Array<() => void> = [];
  const replace = (obj: any, key: string, value: any) => { const old = obj[key]; obj[key] = value; originals.push(() => { obj[key] = old; }); };
  t.after(() => originals.reverse().forEach(fn => fn()));
  const rows: any[] = []; const audits: any[] = [];
  const users: Record<number, any> = { 1: { id: 1, nombre: 'RH', rol: 'rh', activo: true }, 2: { id: 2, nombre: 'Rioja', rol: 'estacion', activo: true }, 3: { id: 3, nombre: 'Otra', rol: 'estacion', activo: true }, 4: { id: 4, nombre: 'Jefe', rol: 'jefe', activo: true }, 5: { id: 5, nombre: 'Sin vínculo', rol: 'estacion', activo: true } };
  replace(User, 'findByPk', async (id: number) => users[id]);
  replace(Link, 'findByPk', async (id: number) => id === 2 ? { stationId: 1 } : id === 3 ? { stationId: 2 } : null);
  replace(Station, 'findByPk', async (id: number) => [1, 2].includes(id) ? { id } : null);
  replace(Employee, 'findByPk', async () => ({ stationId: 2 }));
  replace(sequelize, 'transaction', async (fn: any) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  replace(Document, 'create', async (data: any) => { const row = { id: rows.length + 1, ...data, createdAt: new Date(), get(key: string) { return (this as any)[key]; } }; rows.push(row); return row; });
  replace(Document, 'findByPk', async (id: number) => rows.find(r => r.id === Number(id)) || null);
  replace(Document, 'findAndCountAll', async (options: any) => {
    assert.ok(!options.attributes.includes('content'));
    const found = rows.filter(row => Object.entries(options.where).every(([key, value]) => key === 'createdAt' || row[key] === value));
    return { count: found.length, rows: found.map(row => Object.fromEntries(options.attributes.map((key: string) => [key, row[key]]))) };
  });
  replace(Audit, 'create', async (data: any) => { audits.push(data); return data; });
  async function call(user: number | null, method: string, path: string, fields?: Record<string, string>, file = pdf) {
    const boundary = 'attendance-test-boundary';
    const payload = fields ? Buffer.concat([Buffer.from(Object.entries(fields).map(([key, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`).join('') + `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="nomina.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), file, Buffer.from(`\r\n--${boundary}--\r\n`)]) : Buffer.alloc(0);
    const url = new URL(path, 'http://localhost');
    const req: any = Readable.from([payload]);
    Object.assign(req, { method, url: path, originalUrl: `/api/attendance${path}`, headers: { ...(user ? { authorization: `Bearer ${jwt.sign({ id: user }, process.env.JWT_SECRET || 'your-super-secret-key')}` } : {}), ...(fields ? { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(payload.length) } : {}) }, body: {}, query: Object.fromEntries(url.searchParams), params: {} });
    Object.defineProperty(req, 'path', { get: () => new URL(req.url, 'http://localhost').pathname });
    return new Promise<{ status: number; data: any; headers: Record<string, string> }>((resolve, reject) => {
      let status = 200; const headers: Record<string, string> = {};
      const res: any = { status(value: number) { status = value; return res; }, setHeader(k: string, v: string) { headers[k] = v; }, json(data: any) { resolve({ status, data, headers }); }, send(data: any) { resolve({ status, data, headers }); } };
      (router as any).handle(req, res, (err: any) => err ? reject(err) : resolve({ status: 404, data: null, headers }));
    });
  }
  const body = { stationId: '1', category: 'nomina_firmada', title: 'Nómina semanal' };
  assert.equal((await call(null, 'GET', '/documents')).status, 401);
  assert.equal((await call(1, 'POST', '/documents', body)).status, 403);
  assert.equal((await call(3, 'POST', '/documents', body)).status, 403);
  assert.equal((await call(5, 'POST', '/documents', body)).status, 403);
  assert.equal((await call(2, 'POST', '/documents', { ...body, employeeId: '9' })).status, 403);
  assert.equal((await call(2, 'POST', '/documents', body, Buffer.from('Not PDF'))).status, 400);
  assert.equal((await call(2, 'POST', '/documents', body, Buffer.alloc(MAX_DOCUMENT_BYTES + 1))).status, 400);
  const uploaded = await call(2, 'POST', '/documents', body);
  assert.equal(uploaded.status, 201); assert.equal(uploaded.data.content, undefined); assert.equal(uploaded.data.uploadedBy, 2);
  assert.equal((await call(2, 'GET', '/documents')).data.total, 1);
  assert.equal((await call(3, 'GET', '/documents')).data.total, 0);
  assert.equal((await call(2, 'GET', '/documents?stationId=2')).status, 403);
  assert.equal((await call(1, 'GET', '/documents?stationId=1&category=nomina_firmada')).data.total, 1);
  assert.equal((await call(1, 'GET', '/documents?stationId=2')).data.total, 0);
  assert.equal((await call(1, 'GET', '/documents?category=oficio')).data.total, 0);
  assert.equal((await call(1, 'GET', '/documents?from=2026-10-10&to=2026-10-01')).status, 400);
  assert.equal((await call(4, 'GET', '/documents')).data.documents[0].content, undefined);
  for (const user of [2, 3, 4, 5]) assert.equal((await call(user, 'GET', `/documents/${uploaded.data.id}/download`)).status, 403);
  const downloaded = await call(1, 'GET', `/documents/${uploaded.data.id}/download`);
  assert.equal(downloaded.status, 200); assert.deepEqual(downloaded.data, pdf);
  assert.match(downloaded.headers['Content-Disposition'], /^attachment;/);
  assert.equal(downloaded.headers['Cache-Control'], 'no-store');
  assert.equal(audits.at(-1).action, 'download_document');
  rows[0].content = Buffer.from('tampered');
  assert.equal((await call(1, 'GET', `/documents/${uploaded.data.id}/download`)).status, 409);
});
