import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, '.local-data/secugen-windows');
await mkdir(output, { recursive: true });
for (const name of ['INICIAR-PRUEBA.cmd', 'iniciar.cjs']) await cp(path.join(root, 'tools/secugen-windows', name), path.join(output, name));
const launcher = await readFile(path.join(output, 'INICIAR-PRUEBA.cmd'), 'utf8');
await writeFile(path.join(output, 'INICIAR-PRUEBA.cmd'), launcher.replace(/\r?\n/g, '\r\n'));
await cp(path.join(root, 'docs/SECUGEN-WINDOWS.md'), path.join(output, 'LEEME.md'));
const files = ['INICIAR-PRUEBA.cmd', 'iniciar.cjs', 'LEEME.md', 'web/index.html', ...(await readdir(path.join(output, 'web/assets'))).map(name => `web/assets/${name}`)];
const checksums = await Promise.all(files.map(async name => `${createHash('sha256').update(await readFile(path.join(output, name))).digest('hex')}  ${name}`));
await writeFile(path.join(output, 'SHA256SUMS.txt'), `${checksums.join('\n')}\n`);
console.log(`Paquete generado en: ${output}\nNo contiene .env, base de datos, huellas ni dependencias del servidor.`);
