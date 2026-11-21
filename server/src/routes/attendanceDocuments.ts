import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { createHash } from 'crypto';
import { Op, Transaction } from 'sequelize';
import sequelize from '../config/database';
import { authorize, AuthRequest } from '../middleware/auth';
import { AttendanceDocument as Document, AttendanceStationUser as Link, AttendanceStation as Station, AttendanceEmployee as Employee, AttendanceAudit as Audit } from '../models/Attendance';
import { AttendanceError, requireAttendance as check, requireStationAccess, dateOnly, addDays, civilToInstant } from '../domain/attendance';
import { DOCUMENT_CATEGORIES, MAX_DOCUMENT_BYTES, validateDocument } from '../domain/attendanceDocuments';

const router = Router(); // Mounted only after attendance's protect + role middleware.
const metadata = ['id', 'stationId', 'employeeId', 'category', 'title', 'filename', 'size', 'sha256', 'uploadedBy', 'createdAt'];
const route = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => (req: AuthRequest, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(e => e instanceof AttendanceError ? res.status(e.status).json({ message: e.message }) : next(e));
};
const id = (value: unknown) => { const n = Number(value); check(Number.isSafeInteger(n) && n > 0, 'Identificador inválido.'); return n; };
async function scope(req: AuthRequest, stationId: number, transaction?: Transaction) {
  const link = req.user!.rol === 'estacion' ? await Link.findByPk(req.user!.id, { transaction }) : null;
  requireStationAccess(req.user!.rol, link?.stationId ?? null, stationId);
  check(await Station.findByPk(stationId, { transaction }), 'Estación no encontrada.', 404);
}
const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1, fields: 5, fieldSize: 2000, parts: 6 } }).single('file');
router.get('/', route(async (req, res) => {
  const where: any = {};
  if (req.user!.rol === 'estacion') {
    const link = await Link.findByPk(req.user!.id);
    check(link, 'Tu cuenta no está vinculada a una estación.', 403);
    where.stationId = link.stationId;
    if (req.query.stationId) check(id(req.query.stationId) === link.stationId, 'No puedes consultar otra estación.', 403);
  } else if (req.query.stationId) { where.stationId = id(req.query.stationId); await scope(req, where.stationId); }
  if (req.query.category) { check(DOCUMENT_CATEGORIES.includes(req.query.category as any), 'Categoría inválida.'); where.category = req.query.category; }
  if (req.query.from || req.query.to) {
    where.createdAt = {};
    if (req.query.from) where.createdAt[Op.gte] = civilToInstant(dateOnly(req.query.from), '00:00');
    if (req.query.to) where.createdAt[Op.lt] = civilToInstant(addDays(dateOnly(req.query.to), 1), '00:00');
    if (req.query.from && req.query.to) check(String(req.query.from) <= String(req.query.to), 'Rango de fechas inválido.');
  }
  const page = req.query.page ? id(req.query.page) : 1;
  check(page <= 100000, 'Página inválida.');
  const result = await Document.findAndCountAll({ where, attributes: metadata, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: 25, offset: (page - 1) * 25 });
  res.json({ documents: result.rows, total: result.count, page, pageSize: 25 });
}));
router.post('/', authorize('estacion'), (req, res, next) => receive(req, res, error => {
  if (error) { res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'El PDF supera los 10 MB.' : 'Sube un solo PDF por solicitud; revisa el tamaño y los campos.' }); return; }
  next();
}), route(async (req, res) => {
  const filename = validateDocument(req.file);
  check(DOCUMENT_CATEGORIES.includes(req.body.category), 'Selecciona el tipo de documento.');
  check(typeof req.body.title === 'string' && req.body.title.trim().length > 0 && req.body.title.trim().length <= 255, 'Escribe un título de hasta 255 caracteres.');
  const stationId = id(req.body.stationId);
  const employeeId = req.body.employeeId ? id(req.body.employeeId) : null;
  const result = await sequelize.transaction(async transaction => {
    await scope(req, stationId, transaction);
    if (employeeId) check((await Employee.findByPk(employeeId, { transaction }))?.stationId === stationId, 'El empleado no pertenece a tu estación.', 403);
    const row = await Document.create({ stationId, employeeId, category: req.body.category, title: req.body.title.trim(), filename,
      size: req.file!.size, sha256: createHash('sha256').update(req.file!.buffer).digest('hex'), content: req.file!.buffer, uploadedBy: req.user!.id }, { transaction });
    const data = Object.fromEntries(metadata.map(key => [key, row.get(key)]));
    await Audit.create({ actorId: req.user!.id, actorName: req.user!.nombre, action: 'upload_document', entity: 'document', entityId: row.id,
      before: null, after: data, reason: 'Documento enviado por la estación a RH' }, { transaction });
    return data;
  });
  res.status(201).json(result);
}));
router.get('/:id/download', authorize('rh'), route(async (req, res) => {
  const row = await Document.findByPk(id(req.params.id));
  check(row, 'Documento no encontrado.', 404);
  check(createHash('sha256').update(row.content).digest('hex') === row.sha256, 'No se pudo verificar la integridad del documento.', 409);
  await Audit.create({ actorId: req.user!.id, actorName: req.user!.nombre, action: 'download_document', entity: 'document', entityId: row.id,
    before: null, after: { stationId: row.stationId, filename: row.filename }, reason: 'Descarga de documento por RH' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `attachment; filename="documento-${row.id}.pdf"; filename*=UTF-8''${encodeURIComponent(row.filename).replace(/'/g, '%27')}`);
  res.send(row.content);
}));
export default router;
