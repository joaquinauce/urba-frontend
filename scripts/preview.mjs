import { createServer, request as proxyRequest } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/frontend/browser');
const port = Number(process.argv[2] ?? process.env.PREVIEW_PORT ?? 4202);
const apiPort = Number(process.env.API_PORT ?? 3001);
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
};

createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
  catch { res.writeHead(400).end(); return; }

  if (pathname.startsWith('/api/')) {
    const upstream = proxyRequest({ hostname: '127.0.0.1', port: apiPort, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${apiPort}` } }, incoming => {
      res.writeHead(incoming.statusCode ?? 502, incoming.headers);
      incoming.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Backend no disponible'); });
    req.pipe(upstream);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }

  const requested = resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(root + sep)) { res.writeHead(400).end(); return; }
  let file = requested;
  try {
    if (!(await stat(file)).isFile()) file = join(root, 'index.html');
  } catch {
    if (extname(pathname)) { res.writeHead(404).end(); return; }
    file = join(root, 'index.html');
  }
  res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
  if (file.endsWith('index.html') || file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'HEAD') { res.writeHead(200).end(); return; }
  createReadStream(file).on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); }).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Urba PWA: http://127.0.0.1:${port}`));
