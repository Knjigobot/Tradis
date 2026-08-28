// Zero-dependency HTTP Server & Cordis Real-Time Live Sync Engine
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 8088;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Connected browser clients for Cordis Live-Sync
const sseClients = new Set();

function broadcastLiveUpdate(changedFile) {
  const msg = JSON.stringify({ type: 'hot_reload', file: changedFile, timestamp: Date.now() });
  sseClients.forEach(res => {
    try {
      res.write(`data: ${msg}\n\n`);
    } catch (_) {
      sseClients.delete(res);
    }
  });
}

// Watch directory for changes with debouncing
let debounceTimer = null;
fs.watch(BASE_DIR, { recursive: true }, (eventType, filename) => {
  if (filename && !filename.includes('.git') && !filename.includes('node_modules')) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`[CORDIS LIVE SYNC] Detected edit in: ${filename} -> Broadcasting update to browser.`);
      broadcastLiveUpdate(filename);
    }, 150);
  }
});

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // 1. Cordis SSE Live-Sync Endpoint
  if (reqPath === '/_cordis_live') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('data: {"type":"connected","status":"ready"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. Static File Serving
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
        'Cache-Control': 'no-cache, no-store, must-revalidate' 
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(` TRADIS COMMODITIES DESKTOP PLATFORM (CORDIS RUNTIME)`);
  console.log(` Live Server: ${url}`);
  console.log(` Cordis Real-Time Live Sync: ENABLED (Zero-Refresh)`);
  console.log(`======================================================\n`);

  const startCmd = process.platform === 'win32' ? `start ${url}` : `open ${url}`;
  exec(startCmd);
});