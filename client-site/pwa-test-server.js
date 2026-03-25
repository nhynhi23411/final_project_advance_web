/**
 * PWA Local Test Server
 * - Serves the production build (dist/notus-angular)
 * - Proxies /api/* requests to the NestJS backend (localhost:3000)
 * - Supports Angular client-side routing (fallback to index.html)
 *
 * Usage:
 *   node pwa-test-server.js
 *   Then open: http://localhost:8080
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DIST_DIR = path.join(__dirname, 'dist', 'notus-angular');
const FRONTEND_PORT = 8080;
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 3000;

// Simple MIME type map
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);

  // ── 1. PROXY: forward /api/* unchanged to NestJS backend ─────────────────
  if (parsedUrl.pathname.startsWith('/api')) {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` },
    };

    const proxy = http.request(options, (backendRes) => {
      // Pass CORS headers through if backend sends them
      res.writeHead(backendRes.statusCode, backendRes.headers);
      backendRes.pipe(res, { end: true });
    });

    proxy.on('error', (err) => {
      console.error('[PROXY ERROR]', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Backend không phản hồi. Kiểm tra NestJS đang chạy ở port 3000.' }));
    });

    req.pipe(proxy, { end: true });
    return;
  }

  // ── 2. STATIC: serve built Angular files ─────────────────────────────────
  let filePath = path.join(DIST_DIR, parsedUrl.pathname);

  // Normalize: if directory, look for index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // If file not found → Angular SPA fallback (return index.html for routing)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  // Service Worker and manifest must NOT be cached by browser
  const noCache = ['.webmanifest', 'ngsw.json', 'ngsw-worker.js'].some(
    (name) => filePath.endsWith(name)
  );

  const headers = {
    'Content-Type': contentType,
    'Cache-Control': noCache ? 'no-cache, no-store, must-revalidate' : 'max-age=3600',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(FRONTEND_PORT, () => {
  console.log('\n========================================');
  console.log('  PWA Test Server đang chạy!');
  console.log('========================================');
  console.log(`  Frontend: http://localhost:${FRONTEND_PORT}`);
  console.log(`  Backend:  http://localhost:${BACKEND_PORT}/api`);
  console.log('  Nhấn Ctrl+C để dừng.\n');
});
