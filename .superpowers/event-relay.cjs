// Simple HTTP relay — accepts POST /event, writes to brainstorm events file
// Fallback for browsers (Safari mobile) that block local WebSocket on IP addresses

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 49772;
const EVENTS_FILE = process.argv[2]; // passed as argument

if (!EVENTS_FILE) {
  console.error('Usage: node event-relay.cjs <events-file-path>');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        event.timestamp = Date.now();
        const dir = path.dirname(EVENTS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
        console.log('event:' + JSON.stringify(event));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('relay-started:' + PORT);
});
