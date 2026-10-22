// =========================================================================
// SMART HOME ESP32 - CLOUD / VPS RELAY & HTTP SERVER
// Author: Fizt001 (Smart Home IoT System)
// =========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// In-Memory Device State Cache (12 Perangkat)
const devicesState = {
  lobby_light: { id: 'lobby_light', state: 0, brightness: 70, gpio: 16 },
  living_light: { id: 'living_light', state: 0, brightness: 40, gpio: 17 },
  living_fan: { id: 'living_fan', state: 0, speed: 0, gpio: 27 },
  family_light: { id: 'family_light', state: 0, brightness: 80, gpio: 18 },
  family_fan: { id: 'family_fan', state: 0, speed: 0, gpio: 32 },
  bedroom1_light: { id: 'bedroom1_light', state: 0, brightness: 50, gpio: 19 },
  wc1_light: { id: 'wc1_light', state: 0, brightness: 100, gpio: 21 },
  bedroom2_light: { id: 'bedroom2_light', state: 0, brightness: 60, gpio: 22 },
  bedroom3_light: { id: 'bedroom3_light', state: 0, brightness: 60, gpio: 23 },
  kitchen_light: { id: 'kitchen_light', state: 0, brightness: 90, gpio: 25 },
  kitchen_fan: { id: 'kitchen_fan', state: 0, speed: 0, gpio: 33 },
  wc2_light: { id: 'wc2_light', state: 0, brightness: 100, gpio: 26 }
};

let telemetryState = {
  uptimeSec: 0,
  rssi: -58,
  freeHeap: 184500,
  espConnected: false,
  lastSeen: null
};

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

// -------------------------------------------------------------------------
// 1. HTTP STATIC FILE SERVER & REST API
// -------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // REST API Endpoints
  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      espConnected: telemetryState.espConnected,
      telemetry: telemetryState,
      devicesCount: Object.keys(devicesState).length,
      uptimeSec: Math.floor(process.uptime())
    }));
  }

  if (pathname === '/api/devices') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(Object.values(devicesState)));
  }

  // Static File Serving
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(__dirname, pathname);

  // Security check to avoid directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('403 Forbidden');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
      });
      res.end(content);
    }
  });
});

// -------------------------------------------------------------------------
// 2. WEBSOCKET REAL-TIME RELAY BROKER
// -------------------------------------------------------------------------
const wss = new WebSocketServer({ server });

const webClients = new Set();
const espDevices = new Set();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const isDevice = req.url.includes('role=device') || req.headers['x-esp32'] === 'true';

  if (isDevice) {
    espDevices.add(ws);
    telemetryState.espConnected = true;
    telemetryState.lastSeen = new Date().toISOString();
    console.log(`[ESP32] Hardware connected from ${clientIp}`);

    // Request full state sync from ESP32
    ws.send(JSON.stringify({ action: 'getState' }));

    // Notify all web clients that hardware is connected
    broadcastToWeb({
      type: 'esp_status',
      connected: true,
      msg: 'ESP32 Hardware Terhubung ke VPS!'
    });
  } else {
    webClients.add(ws);
    console.log(`[WEB] Browser connected from ${clientIp} (Total: ${webClients.size})`);

    // Send initial snapshot to newly connected web client
    ws.send(JSON.stringify({
      status: 'connected',
      type: 'esp_status',
      espConnected: espDevices.size > 0,
      connected: espDevices.size > 0,
      telemetry: { ...telemetryState, espConnected: espDevices.size > 0 },
      devices: Object.values(devicesState)
    }));
  }

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      // If message is from ESP32
      if (espDevices.has(ws) || data.from === 'esp32' || data.telemetry) {
        if (!espDevices.has(ws)) {
          espDevices.add(ws);
          webClients.delete(ws);
          telemetryState.espConnected = true;
          broadcastToWeb({
            type: 'esp_status',
            connected: true,
            espConnected: true,
            msg: 'ESP32 Hardware Terhubung ke VPS!'
          });
        }
        telemetryState.lastSeen = new Date().toISOString();

        if (data.telemetry) {
          telemetryState = { ...telemetryState, ...data.telemetry, espConnected: true };
        }

        // Update cached state if single or multiple device states sent
        if (data.device) {
          devicesState[data.device] = { ...(devicesState[data.device] || {}), ...data };
        }
        if (Array.isArray(data.devices)) {
          data.devices.forEach(d => {
            if (d.id) devicesState[d.id] = { ...(devicesState[d.id] || {}), ...d };
          });
        }

        // Broadcast to all web browsers
        broadcastToWeb(data);
      } 
      // If message is from Web Client (Control Command)
      else {
        console.log(`[CMD] Control received: ${data.device} -> state: ${data.state}, speed: ${data.speed}`);

        // Update cached state
        if (data.device && devicesState[data.device]) {
          devicesState[data.device].state = data.state;
          if (data.speed !== undefined) devicesState[data.device].speed = data.speed;
          if (data.brightness !== undefined) devicesState[data.device].brightness = data.brightness;
        }

        // 1. Forward command immediately to all connected ESP32 hardware boards
        broadcastToEsp(data);

        // 2. Broadcast to other web clients so all screens stay in sync
        broadcastToWeb(data, ws);
      }
    } catch (e) {
      console.warn('[WS] Non-JSON message received:', message.toString());
    }
  });

  ws.on('close', () => {
    if (espDevices.has(ws)) {
      espDevices.delete(ws);
      console.log(`[ESP32] Hardware disconnected (${clientIp})`);
      if (espDevices.size === 0) {
        telemetryState.espConnected = false;
        broadcastToWeb({
          type: 'esp_status',
          connected: false,
          msg: 'ESP32 Hardware Terputus dari VPS'
        });
      }
    } else {
      webClients.delete(ws);
      console.log(`[WEB] Browser disconnected (${clientIp}, Remaining: ${webClients.size})`);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS ERR] ${clientIp}:`, err.message);
  });
});

function broadcastToWeb(data, exceptWs = null) {
  const payload = JSON.stringify(data);
  for (const client of webClients) {
    if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function broadcastToEsp(data) {
  const payload = JSON.stringify(data);
  for (const esp of espDevices) {
    if (esp.readyState === WebSocket.OPEN) {
      esp.send(payload);
    }
  }
}

// -------------------------------------------------------------------------
// 3. START SERVER
// -------------------------------------------------------------------------
server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`  🏠 SMART HOME ESP32 - CLOUD RELAY SERVER`);
  console.log(`======================================================`);
  console.log(`  Web Dashboard : http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`  WebSocket URL : ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
  console.log(`  ESP32 Endpoint: ws://<IP_VPS>:${PORT}/?role=device`);
  console.log(`======================================================\n`);
});
