import ActivityLog from '../models/ActivityLog';
import { Request } from 'express';

interface LogOptions {
  req?: Request;
  usuarioId?: number | null;
  usuarioNombre?: string;
  usuarioRol?: string;
  accion: string;
  entidad: string;
  entidadId?: number | null;
  detalle?: string;
}

/**
 * Fire-and-forget activity logger — never throws, never blocks the caller.
 */
export async function logActivity(opts: LogOptions): Promise<void> {
  try {
    const ip =
      (opts.req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      opts.req?.socket?.remoteAddress ||
      '-';

    await ActivityLog.create({
      usuarioId: opts.usuarioId ?? null,
      usuarioNombre: opts.usuarioNombre ?? 'Sistema',
      usuarioRol: opts.usuarioRol ?? '-',
      accion: opts.accion,
      entidad: opts.entidad,
      entidadId: opts.entidadId ?? null,
      detalle: opts.detalle ?? '',
      ip,
    } as any);
  } catch (_) {
    // Silently ignore — logs should never crash the app
  }
}
