import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = normalize(pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
    if (relativePath.startsWith('..')) throw new Error('Nieprawidłowa ścieżka');

    let filePath = join(ROOT, relativePath);
    const details = await stat(filePath).catch(() => null);
    if (details?.isDirectory()) filePath = join(filePath, 'index.html');

    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Nie znaleziono zasobu.');
  }
}).listen(PORT, () => {
  console.log(`MAPA 101 działa pod adresem http://localhost:${PORT}`);
});