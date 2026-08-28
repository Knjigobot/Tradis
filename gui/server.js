// Zero-dependency HTTP Server & Cordis Dual-Channel Live Sync Engine
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 8088;
const BASE_DIR = __dirname;

let currentVersion = Date.now();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const sseClients = new Set();

function broadcastLiveUpdate(changedFile) {
  currentVersion = Date.now();
  const payload = JSON.stringify({ type: 'hot_reload', file: changedFile, version: currentVersion });
  
  sseClients.forEach(res => {
    try {
      res.write(`event: hot_reload\ndata: ${payload}\n\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (_) {
      sseClients.delete(res);
    }
  });
}

// Watch directory for changes
let debounceTimer = null;
fs.watch(BASE_DIR, { recursive: true }, (eventType, filename) => {
  if (filename && !filename.includes('.git') && !filename.includes('node_modules')) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`[CORDIS LIVE SYNC] File modified: ${filename} -> Broadcasting live reload.`);
      broadcastLiveUpdate(filename);
    }, 100);
  }
});

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // 1. Version Heartbeat Endpoint (Guaranteed Fallback)
  if (reqPath === '/_cordis_version') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify({ version: currentVersion }));
    return;
  }

  // 2. SSE Live-Sync Endpoint
  if (reqPath === '/_cordis_live') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', version: currentVersion })}\n\n`);
    sseClients.add(res);

    // Keep-alive heartbeat ping every 10s
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) { clearInterval(keepAlive); }
    }, 10000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
    return;
  }

  // 3. Static File Serving
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(BASE_DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType, 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`======================================================`);
  console.log(` TRADIS COMMODITIES DESKTOP PLATFORM (CORDIS RUNTIME)`);
  console.log(` Live Server: ${url}`);
  console.log(` Cordis Real-Time Live Sync: ACTIVE (Dual-Channel)`);
  console.log(`======================================================`);
});