#!/usr/bin/env node
// Local dev server — serves static files and patches scenes.json via PATCH /api/scene/:id
// Usage: node server.js   →  http://localhost:3000
// Edit a scene: http://localhost:3000/viewer.html?id=<scene-id>&edit=1

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT   = 3000;
const ROOT   = __dirname;
const SCENES = path.join(ROOT, 'scenes.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  // PATCH /api/scene/:id  — merge fields into the matching scene in scenes.json
  if (req.method === 'PATCH' && pathname.startsWith('/api/scene/')) {
    const id = decodeURIComponent(pathname.slice('/api/scene/'.length));
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const data    = JSON.parse(fs.readFileSync(SCENES, 'utf8'));
        const scene   = data.scenes.find(s => s.id === id);
        if (!scene) {
          res.writeHead(404, { 'Content-Type': 'application/json', ...CORS });
          return res.end(JSON.stringify({ error: `Scene "${id}" not found` }));
        }
        Object.assign(scene, updates);
        fs.writeFileSync(SCENES, JSON.stringify(data, null, 2));
        console.log(`[saved] ${id}: ${Object.keys(updates).join(', ')}`);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('[error]', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static file serving
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', ...CORS });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`\nFamiliAR dev server running at:\n`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://localhost:${PORT}/viewer.html?id=chihuli-green&edit=1\n`);
  console.log('Ctrl+C to stop.\n');
});
