import { useEffect, useRef, useState } from 'react';
import { createSecugenClient, FingerprintSample, SecugenPort, TEST_MATCH_THRESHOLD } from '../services/secugen';
import '../styles/SecugenTest.css';

export default function SecugenTest() {
  const [port, setPort] = useState<SecugenPort>('8443');
  const [license, setLicense] = useState('');
  const [consent, setConsent] = useState(false);
  const [first, setFirst] = useState<FingerprintSample | null>(null);
  const [second, setSecond] = useState<FingerprintSample | null>(null);
  const [result, setResult] = useState<{ score: number; matches: boolean } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const operation = useRef<AbortController | null>(null);
  const samples = useRef<{ first: FingerprintSample | null; second: FingerprintSample | null }>({ first: null, second: null });
  const clear = () => {
    operation.current?.abort(); operation.current = null;
    samples.current = { first: null, second: null };
    setFirst(null); setSecond(null); setResult(null); setBusy(''); setError('');
  };
  useEffect(() => {
    const hide = () => { clear(); setConsent(false); setLicense(''); setNotice('Capturas borradas al salir de la prueba.'); };
    const visibility = () => { if (document.hidden) hide(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);
    return () => { operation.current?.abort(); samples.current = { first: null, second: null }; document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', hide); };
  }, []);
  useEffect(() => {
    if (!first && !second) return;
    const timeout = setTimeout(() => { clear(); setNotice('Capturas borradas automáticamente después de 5 minutos.'); }, 5 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [first, second]);

  async function run(action: 'first' | 'second' | 'match') {
    if (!consent || operation.current) return;
    const controller = new AbortController(); operation.current = controller;
    setError(''); setResult(null); setNotice('');
    if (action === 'first') { samples.current = { first: null, second: null }; setFirst(null); setSecond(null); }
    if (action === 'second') { samples.current.second = null; setSecond(null); }
    setBusy(action === 'match' ? 'Comparando las dos capturas…' : 'Coloca el dedo en el lector. Esperando hasta 10 segundos…');
    try {
      const client = createSecugenClient(port, license.trim());
      if (action === 'match') {
        if (!samples.current.first || !samples.current.second) throw new Error('Captura ambas huellas antes de comparar.');
        const comparison = await client.match(samples.current.first, samples.current.second, controller.signal);
        if (operation.current === controller) setResult(comparison);
      } else {
        const sample = await client.capture(controller.signal);
        if (operation.current !== controller) return;
        samples.current[action] = sample;
        if (action === 'first') setFirst(sample); else setSecond(sample);
      }
    } catch (e) { if (operation.current === controller) setError(e instanceof Error ? e.message : 'No se pudo completar la prueba.'); }
    finally { if (operation.current === controller) { operation.current = null; setBusy(''); } }
  }
  return <section className="secugen-test" aria-labelledby="secugen-title">
    <header><span className="secugen-eyebrow">PRUEBA LOCAL · SIN CHECADAS</span><h2 id="secugen-title">SecuGen Hamster Pro 20</h2><p>Captura y comparación de dos lecturas. No registra asistencia ni identifica empleados.</p></header>
    <details><summary>Instalación y conexión</summary><ol>
      <li>En Windows 11 Intel/AMD de 64 bits, instala el <a href="https://secugen.com/drivers/" target="_blank" rel="noreferrer">controlador oficial</a> y <a href="https://webapi.secugen.com/" target="_blank" rel="noreferrer">WebAPI Client de 64 bits</a>.</li>
      <li>Conecta el lector y cierra otras aplicaciones de captura. Si el navegador pregunta, permite la conexión local para esta prueba.</li>
      <li>Usa el puerto 8443. Si tu instalación anterior utiliza 8000, selecciónalo abajo. No desactives TLS ni las protecciones del navegador.</li>
    </ol><p>WebAPI requiere licencia por dominio después del periodo de prueba de 60 días. Esta prueba no evalúa detección de dedos falsos.</p></details>
    <div className="secugen-settings"><label>Puerto del servicio<select value={port} disabled={!!busy} onChange={e => { clear(); setPort(e.target.value as SecugenPort); }}><option value="8443">8443 — actual</option><option value="8000">8000 — instalación anterior</option></select></label>
      <label>Licencia WebAPI (opcional para prueba)<input type="password" autoComplete="off" maxLength={2048} value={license} disabled={!!busy} onChange={e => { clear(); setLicense(e.target.value); }} /></label></div>
    <label className="secugen-consent"><input type="checkbox" checked={consent} disabled={!!busy} onChange={e => { setConsent(e.target.checked); if (!e.target.checked) clear(); }} />Acepto capturar mi huella para esta prueba temporal, sin guardarla en el sistema.</label>
    <div className="secugen-samples">{(['first', 'second'] as const).map((key, i) => {
      const sample = key === 'first' ? first : second;
      return <article key={key}><span className="secugen-step">0{i + 1}</span><h3>{i === 0 ? 'Huella de referencia' : 'Segunda lectura'}</h3><p>{sample ? `${sample.model} · Calidad ${sample.quality}/100${sample.nfiq ? ` · NFIQ ${sample.nfiq}` : ''}` : i === 0 ? 'Coloca un dedo y captura la referencia.' : 'Retira el dedo y vuelve a colocarlo.'}</p><button type="button" disabled={!consent || !!busy || (i === 1 && !first)} onClick={() => run(key)}>{i === 0 ? 'Capturar referencia' : 'Capturar segunda lectura'}</button></article>;
    })}</div>
    <div className="secugen-actions"><button type="button" disabled={!consent || !!busy || !first || !second} onClick={() => run('match')}>Comparar huellas</button><button type="button" className="secugen-secondary" onClick={() => { clear(); setNotice('Capturas borradas.'); }}>{busy ? 'Cancelar y borrar' : 'Borrar capturas'}</button></div>
    {busy && <p className="secugen-message" role="status">{busy}</p>}
    {error && <p className="secugen-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {result && <div className={`secugen-result ${result.matches ? 'match' : 'no-match'}`} role="status"><strong>{result.matches ? 'Coincidencia en la prueba' : 'Las lecturas no coinciden'}</strong><p>Puntaje: {result.score}/199 · Umbral de prueba: {TEST_MATCH_THRESHOLD}</p><small>Resultado de diagnóstico; no es una checada ni una autorización.</small></div>}
    <footer>Las plantillas permanecen temporalmente en memoria de esta página y del servicio local de SecuGen. La aplicación no las envía a Railway ni las guarda en archivos, caché o almacenamiento del navegador. Se borran de la página al ocultarla, cerrarla, recargarla o tras 5 minutos sin nuevas capturas.</footer>
  </section>;
}
