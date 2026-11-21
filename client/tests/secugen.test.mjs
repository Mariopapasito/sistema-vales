import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/services/secugen.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
const { createSecugenClient } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const template = Buffer.from('synthetic-test-template-not-a-real-fingerprint').toString('base64');
const sample = { template, model: 'HU20', quality: 80, nfiq: 1 };
const payload = { ErrorCode: 0, TemplateBase64: template, Model: 'HU20', ImageQuality: 80, NFIQ: 1, BMPBase64: 'not-returned', SerialNumber: 'not-returned' };
const reply = data => async () => new Response(JSON.stringify(data));

test('captura usa HTTPS localhost, sin credenciales, sin caché y formato ISO', async () => {
  let options;
  const client = createSecugenClient('8443', 'license+/=', async (url, init) => {
    assert.equal(url, 'https://localhost:8443/SGIFPCapture'); options = init;
    return new Response(JSON.stringify(payload));
  });
  assert.deepEqual(await client.capture(), sample);
  assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
  assert.equal(options.redirect, 'error'); assert.equal(options.referrerPolicy, 'no-referrer');
  const body = new URLSearchParams(options.body);
  assert.equal(body.get('templateFormat'), 'ISO'); assert.equal(body.get('licstr'), 'license+/=');
  assert.equal(body.get('Timeout'), '10000'); assert.equal(body.get('Quality'), '50');
  assert.equal(body.get('FakeDetection'), '0');
});
test('permite el puerto antiguo pero nunca hosts remotos ni puertos arbitrarios', () => {
  assert.ok(createSecugenClient('8000'));
  assert.throws(() => createSecugenClient('8443/../../remote'), /no permitido/);
  assert.throws(() => createSecugenClient('443'), /no permitido/);
});
test('compara dos plantillas codificadas sin enviarlas a la API del sistema', async () => {
  const client = createSecugenClient('8000', '', async (url, init) => {
    assert.equal(url, 'https://localhost:8000/SGIMatchScore');
    const body = new URLSearchParams(init.body);
    assert.equal(body.get('template1'), template); assert.equal(body.get('template2'), template);
    return new Response(JSON.stringify({ ErrorCode: 0, MatchingScore: 100 }));
  });
  assert.deepEqual(await client.match(sample, sample), { score: 100, matches: true });
  assert.deepEqual(await createSecugenClient('8443', '', reply({ ErrorCode: 0, MatchingScore: 99 })).match(sample, sample), { score: 99, matches: false });
});
for (const [code, expected] of [[54, /tiempo/], [55, /lector/], [59, /ocupado/], [10002, /dominio/], [10003, /expiró/]]) {
  test(`error ${code} nunca se interpreta como captura exitosa`, async () => {
    await assert.rejects(createSecugenClient('8443', '', reply({ ...payload, ErrorCode: code })).capture(), expected);
  });
}
test('rechaza respuestas incompletas, de baja calidad o sin plantilla válida', async () => {
  for (const data of [null, {}, { ...payload, ErrorCode: '0' }, { ...payload, TemplateBase64: '' }, { ...payload, TemplateBase64: 'not valid base64!' }, { ...payload, ImageQuality: 49 }, { ...payload, ImageQuality: 101 }]) {
    await assert.rejects(createSecugenClient('8443', '', reply(data)).capture());
  }
});
test('rechaza puntajes ausentes, fuera de rango o de tipo incorrecto', async () => {
  for (const MatchingScore of [undefined, -1, 200, '150', 100.5]) {
    await assert.rejects(createSecugenClient('8443', '', reply({ ErrorCode: 0, MatchingScore })).match(sample, sample), /puntaje/);
  }
});
test('rechaza comparar sin dos plantillas y no llama al servicio', async () => {
  await assert.rejects(createSecugenClient('8443', '', () => assert.fail('No debe conectar')).match({ ...sample, template: '' }, sample), /ambas huellas/);
});
test('errores de red no incluyen plantillas, seriales o respuestas completas', async () => {
  await assert.rejects(createSecugenClient('8443', '', async () => { throw new Error(template); }).capture(), e => /SgiBioSrv/.test(e.message) && !e.message.includes(template));
});
test('rechaza HTML y HTTP de error', async () => {
  await assert.rejects(createSecugenClient('8443', '', async () => new Response('<html>')).capture(), /inválida/);
  await assert.rejects(createSecugenClient('8443', '', async () => new Response('', { status: 500 })).capture(), /HTTP 500/);
});
test('cancelar aborta la llamada y bloquea capturas simultáneas', async () => {
  const controller = new AbortController();
  const client = createSecugenClient('8443', '', async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('abort')))));
  const pending = client.capture(controller.signal);
  await assert.rejects(client.capture(), /en curso/);
  controller.abort(); await assert.rejects(pending, /cancelada/);
  await assert.rejects(client.capture(controller.signal), /cancelada/);
});
test('límite de espera aborta una llamada bloqueada', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const client = createSecugenClient('8443', '', async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('timeout')))));
  const pending = client.capture();
  t.mock.timers.tick(20000);
  await assert.rejects(pending, /no respondió a tiempo/);
});
