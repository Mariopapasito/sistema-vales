// SecuGen WebAPI: localhost only. This adapter does not authenticate attendance.
// https://webapi.secugen.com/docs/SECUGEN_WEB_SERVICE_API_DOC.pdf
// Current vendor demo uses 8443; older installations use 8000.
export type SecugenPort = '8443' | '8000';
export interface FingerprintSample {
  template: string;
  model: string;
  quality: number;
  nfiq: number | null;
}
const errors: Record<number, string> = {
  1: 'Revisa la instalación del lector y su controlador.',
  5: 'Falta una biblioteca de SecuGen. Reinstala WebAPI.',
  6: 'No se pudo cargar el controlador del lector.',
  7: 'No se pudo cargar el algoritmo de comparación.',
  52: 'No se pudo inicializar el sensor. Reconecta el lector.',
  53: 'Se perdió la conexión con el sensor.',
  54: 'Se agotó el tiempo. Coloca el dedo y vuelve a capturar.',
  55: 'No se encontró el lector. Revisa el USB y el controlador.',
  56: 'No se pudo cargar el controlador del lector.',
  58: 'El puerto USB no tiene suficiente ancho de banda. Prueba otro puerto.',
  59: 'El lector está ocupado. Cierra otras aplicaciones que lo estén usando.',
  61: 'Este lector no es compatible con la instalación de WebAPI.',
  63: 'El servicio SgiBioSrv no inició. Revisa la instalación.',
  101: 'La huella tiene pocos detalles. Limpia el sensor y repite la captura.',
  102: 'El formato de la huella no coincide. Borra las capturas y repite.',
  103: 'La plantilla de huella no es válida.',
  104: 'La plantilla de huella no es válida.',
  105: 'No se pudieron extraer los detalles de la huella.',
  106: 'El servicio no pudo comparar las huellas.',
  6000: 'Error de certificado de SecuGen. Repara la instalación oficial.',
  10001: 'Licencia WebAPI inválida. Consulta a SecuGen.',
  10002: 'La licencia no autoriza este dominio.',
  10003: 'La licencia o el periodo de prueba expiró.',
  10004: 'WebAPI no recibió el origen. Abre la prueba desde localhost, no como archivo.',
};
const networkMessage = 'No se pudo comunicar con SecuGen. Revisa SgiBioSrv, el puerto 8443/8000, el certificado y el permiso de acceso a la red local del navegador. No desactives la seguridad del navegador.';
function validTemplate(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 16 && value.length <= 32768 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export const TEST_MATCH_THRESHOLD = 100;
export const MIN_CAPTURE_QUALITY = 50;

export function createSecugenClient(port: SecugenPort, license = '', fetcher: typeof fetch = fetch) {
  if (port !== '8443' && port !== '8000') throw new Error('Puerto de SecuGen no permitido.');
  let busy = false;
  const call = async (method: 'SGIFPCapture' | 'SGIMatchScore', values: Record<string, string>, signal?: AbortSignal) => {
    if (busy) throw new Error('Ya hay una operación con el lector en curso.');
    if (signal?.aborted) throw new Error('Operación cancelada.');
    busy = true;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    let timedOut = false;
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    try {
      let response: Response;
      try {
        response = await fetcher(`https://localhost:${port}/${method}`, {
          method: 'POST', body: new URLSearchParams({ ...values, licstr: license, templateFormat: 'ISO' }).toString(),
          // Match the official XMLHttpRequest string-body protocol (no preflight required).
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
        });
      } catch {
        if (timedOut) throw new Error('SecuGen no respondió a tiempo. Revisa el servicio y vuelve a intentar.');
        if (signal?.aborted) throw new Error('Operación cancelada.');
        throw new Error(networkMessage);
      }
      if (!response.ok) throw new Error(`SecuGen respondió HTTP ${response.status}. Revisa el puerto y la instalación.`);
      let data: Record<string, unknown>;
      try { data = await response.json(); } catch { throw new Error('Respuesta inválida de SecuGen.'); }
      if (!data || typeof data !== 'object' || !Number.isInteger(data.ErrorCode)) throw new Error('Respuesta inválida de SecuGen.');
      if (data.ErrorCode !== 0) throw new Error(`SecuGen ${data.ErrorCode}: ${errors[data.ErrorCode as number] || 'No se pudo completar la operación. Consulta el diagnóstico del fabricante.'}`);
      return data;
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', cancel); busy = false;
    }
  };
  return {
    async capture(signal?: AbortSignal): Promise<FingerprintSample> {
      const data = await call('SGIFPCapture', { Timeout: '10000', Quality: String(MIN_CAPTURE_QUALITY), FakeDetection: '0', ImageWSQRate: '0' }, signal);
      if (!validTemplate(data.TemplateBase64)) throw new Error('SecuGen no devolvió una plantilla válida. Repite la captura.');
      if (typeof data.ImageQuality !== 'number' || data.ImageQuality < MIN_CAPTURE_QUALITY || data.ImageQuality > 100) throw new Error('Calidad insuficiente o inválida. Coloca el dedo completo y repite la captura.');
      // Intentionally discard raw/BMP images and device serial. Never log vendor responses.
      return { template: data.TemplateBase64, model: typeof data.Model === 'string' ? data.Model.slice(0, 80) : 'SecuGen', quality: data.ImageQuality,
        nfiq: Number.isInteger(data.NFIQ) && Number(data.NFIQ) >= 1 && Number(data.NFIQ) <= 5 ? Number(data.NFIQ) : null };
    },
    async match(first: FingerprintSample, second: FingerprintSample, signal?: AbortSignal) {
      if (!validTemplate(first.template) || !validTemplate(second.template)) throw new Error('Captura ambas huellas antes de comparar.');
      const data = await call('SGIMatchScore', { template1: first.template, template2: second.template }, signal);
      if (typeof data.MatchingScore !== 'number' || !Number.isInteger(data.MatchingScore) || data.MatchingScore < 0 || data.MatchingScore > 199) throw new Error('SecuGen devolvió un puntaje inválido.');
      return { score: data.MatchingScore, matches: data.MatchingScore >= TEST_MATCH_THRESHOLD };
    },
  };
}
