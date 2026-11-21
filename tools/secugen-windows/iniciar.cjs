const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const PORT = 8765;

// Static files only; no API, proxy, uploads, credentials or biometric storage.
function createServer(webRoot = path.join(__dirname, 'web')) {
  return http.createServer((req, res) => {
    const headers = {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src https://localhost:8443 https://localhost:8000; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    };
    const send = (code, body, type = 'text/plain; charset=utf-8') => { res.writeHead(code, { ...headers, 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : body); };
    if (![`localhost:${PORT}`, `127.0.0.1:${PORT}`].includes(req.headers.host)) return send(403, 'Host no autorizado.');
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Solo se sirven archivos de la prueba.');
    const pathname = (req.url || '').split('?')[0];
    const filename = pathname === '/' || pathname === '/index.html' ? 'index.html'
      : /^\/assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(pathname) ? pathname.slice(1) : null;
    if (!filename) return send(404, 'Archivo no encontrado.');
    fs.readFile(path.join(webRoot, filename), (err, data) => {
      if (err) return send(404, 'Archivo no encontrado. Extrae el paquete completo.');
      send(200, data, filename.endsWith('.js') ? 'text/javascript; charset=utf-8' : filename.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8');
    });
  });
}
if (require.main === module) {
  const server = createServer();
  server.on('error', err => {
    console.error(err.code === 'EADDRINUSE' ? 'El puerto 8765 esta ocupado. Cierra la otra ventana de prueba y vuelve a intentar.' : 'No se pudo iniciar la prueba local.');
    process.exitCode = 1;
  });
  server.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Prueba SecuGen: ${url}\nDeja esta ventana abierta. Ctrl+C para cerrar.\nNo se conecta a la base de datos ni guarda huellas.`);
    if (process.platform === 'win32') {
      const opener = spawn('explorer.exe', [url], { stdio: 'ignore' });
      opener.on('error', () => console.log(`Abre Edge o Chrome y entra a ${url}`));
    }
  });
}
module.exports = { createServer };
