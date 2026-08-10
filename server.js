// Serveur de production minimal : sert le build statique (dist/) et l'endpoint
// POST /api/integrate. Lance-le après `npm run build` avec :
//   node --env-file=.env server.js
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { handleIntegrateRequest, DEFAULT_MODEL } from './server/integrate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT || 5173;
const apiKey = process.env.FAL_KEY;
const model = process.env.FAL_MODEL || DEFAULT_MODEL;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/integrate' && req.method === 'POST') {
    return handleIntegrateRequest(req, res, { apiKey, model });
  }

  // Fichiers statiques (avec repli SPA vers index.html).
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = normalize(join(DIST, urlPath));
    if (!filePath.startsWith(DIST)) filePath = join(DIST, 'index.html');
    let data;
    try {
      data = await readFile(urlPath === '/' ? join(DIST, 'index.html') : filePath);
    } catch {
      data = await readFile(join(DIST, 'index.html'));
      filePath = 'index.html';
    }
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Trombi 2D sur http://localhost:${PORT}`);
  if (!apiKey) console.warn('⚠️  FAL_KEY non défini : /api/integrate renverra une erreur.');
});
