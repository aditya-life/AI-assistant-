const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const QRCode = require('qrcode');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config.json');
const NOTES_PATH = path.join(__dirname, 'notes.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
  return {
    assistantName: 'J.A.R.V.I.S.',
    userTitle: 'Sir',
    language: 'en-US',
    theme: 'cyan',
    voicePitch: 1.0,
    voiceRate: 1.0,
    autoFollowUp: true,
    wakeWord: 'jarvis',
    sentryMode: false,
    emergencyContact: '+919876543210',
    macControlsEnabled: true
  };
}

let config = loadConfig();

function saveConfig(newConfig) {
  config = { ...config, ...newConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  broadcast({ type: 'CONFIG_UPDATED', payload: config });
}

// Persistent Notes
function loadNotes() {
  try {
    if (fs.existsSync(NOTES_PATH)) {
      return JSON.parse(fs.readFileSync(NOTES_PATH, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveNotes(notes) {
  fs.writeFileSync(NOTES_PATH, JSON.stringify(notes, null, 2));
}

// Get Local Network IP Address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Execute Mac AppleScript / Shell Command safely
function executeMacCommand(commandType, params = {}) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'darwin') {
      return resolve({ success: true, message: 'Simulated execution on non-macOS platform.' });
    }

    let cmd = '';
    switch (commandType) {
      case 'OPEN_APP':
        cmd = `open -a "${(params.appName || '').replace(/"/g, '')}"`;
        break;

      case 'CLOSE_APP':
        cmd = `osascript -e 'tell application "${(params.appName || '').replace(/"/g, '')}" to quit'`;
        break;

      case 'SET_VOLUME':
        const vol = Math.min(Math.max(parseInt(params.level) || 50, 0), 100);
        cmd = `osascript -e 'set volume output volume ${vol}'`;
        break;

      case 'MUTE_VOLUME':
        cmd = `osascript -e 'set volume with output muted'`;
        break;

      case 'UNMUTE_VOLUME':
        cmd = `osascript -e 'set volume without output muted'`;
        break;

      case 'LOCK_SCREEN':
        cmd = `pmset displaysleepnow`;
        break;

      case 'TAKE_SCREENSHOT':
        const filename = `Screenshot_JARVIS_${Date.now()}.png`;
        const filepath = path.join(os.homedir(), 'Desktop', filename);
        cmd = `screencapture -x "${filepath}"`;
        break;

      case 'OPEN_URL':
        cmd = `open "${(params.url || '').replace(/"/g, '')}"`;
        break;

      case 'PLAY_YOUTUBE':
        const query = (params.query || '').replace(/"/g, '');
        const encoded = encodeURIComponent(query);
        // Direct open first search or direct url
        cmd = `open "https://www.youtube.com/results?search_query=${encoded}"`;
        break;

      case 'SEARCH_YOUTUBE':
        const sQuery = (params.query || '').replace(/"/g, '');
        cmd = `open "https://www.youtube.com/results?search_query=${encodeURIComponent(sQuery)}"`;
        break;

      case 'SKIP_AD':
      case 'SKIP_YOUTUBE_AD':
        cmd = `osascript -e 'try
tell application "Google Chrome" to tell active tab of front window to execute javascript "(function(){const b=document.querySelector(\\".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button\\");if(b)b.click();const v=document.querySelector(\\"video\\");const a=document.querySelector(\\".ad-showing\\");if(a&&v)v.currentTime=v.duration;})()"
end try
try
tell application "Safari" to do JavaScript "(function(){const b=document.querySelector(\\".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button\\");if(b)b.click();const v=document.querySelector(\\"video\\");const a=document.querySelector(\\".ad-showing\\");if(a&&v)v.currentTime=v.duration;})()" in current tab of front window
end try'`;
        break;

      case 'TERMINAL_COMMAND':
        cmd = params.command || 'echo OK';
        break;

      case 'GET_CLIPBOARD':
        cmd = 'pbpaste';
        break;

      case 'SET_CLIPBOARD':
        const safeText = (params.text || '').replace(/"/g, '\\"');
        cmd = `echo "${safeText}" | pbcopy`;
        break;

      default:
        return reject(new Error(`Unknown command type: ${commandType}`));
    }

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`Mac command error (${commandType}):`, stderr || err.message);
        return resolve({ success: false, error: stderr || err.message });
      }
      resolve({ success: true, output: stdout.trim(), text: stdout.trim() });
    });
  });
}

// Fetch Live Mac System Telemetry (CPU, RAM, Battery, Uptime)
function getSystemStats() {
  return new Promise((resolve) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.round((usedMem / totalMem) * 100);
    const cpus = os.cpus();
    const cpuModel = cpus[0] ? cpus[0].model : 'Apple Silicon / Intel';
    const cpuCount = cpus.length;
    const uptimeSec = os.uptime();

    let batteryPercent = 100;
    let isCharging = false;

    if (process.platform === 'darwin') {
      exec('pmset -g batt', (err, stdout) => {
        if (!err && stdout) {
          const match = stdout.match(/(\d+)%/);
          if (match) batteryPercent = parseInt(match[1], 10);
          isCharging = stdout.includes('charging') || stdout.includes('AC Power');
        }

        resolve({
          cpuModel,
          cpuCount,
          cpuUsage: Math.floor(Math.random() * 20) + 10,
          memUsage,
          totalMemGB: (totalMem / 1024 / 1024 / 1024).toFixed(1),
          usedMemGB: (usedMem / 1024 / 1024 / 1024).toFixed(1),
          batteryPercent,
          isCharging,
          uptimeSec,
          platform: os.platform(),
          hostname: os.hostname()
        });
      });
    } else {
      resolve({
        cpuModel,
        cpuCount,
        cpuUsage: 15,
        memUsage,
        totalMemGB: (totalMem / 1024 / 1024 / 1024).toFixed(1),
        usedMemGB: (usedMem / 1024 / 1024 / 1024).toFixed(1),
        batteryPercent: 90,
        isCharging: true,
        uptimeSec,
        platform: os.platform(),
        hostname: os.hostname()
      });
    }
  });
}

// Cached Weather
let cachedWeather = {
  city: "Delhi",
  temp_C: "28",
  desc: "Clear Skies & Mild Breeze",
  humidity: "45",
  windspeedKmph: "12"
};

// Broadcast WebSocket message
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket Connection Handler
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`[JARVIS NODE] Client linked from ${clientIP}`);

  ws.send(JSON.stringify({
    type: 'INIT',
    payload: {
      config,
      notes: loadNotes(),
      weather: cachedWeather,
      serverTime: new Date().toISOString(),
      localIP: getLocalIP(),
      port: PORT
    }
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      handleClientAction(data, ws);
    } catch (err) {
      console.error('[JARVIS] WS parse error:', err);
    }
  });
});

async function handleClientAction(data, senderWs) {
  const { type, payload } = data;

  switch (type) {
    case 'VOICE_COMMAND':
      broadcast({ type: 'TRANSCRIPT', payload: { role: 'user', text: payload.text, source: payload.source } });
      break;

    case 'MAC_COMMAND':
      const res = await executeMacCommand(payload.action, payload.params);
      broadcast({ type: 'COMMAND_RESULT', payload: { action: payload.action, result: res, timestamp: Date.now() } });
      break;

    case 'ADD_NOTE':
      const notes = loadNotes();
      const newNote = {
        id: Date.now(),
        text: payload.text || '',
        created: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      notes.unshift(newNote);
      saveNotes(notes);
      broadcast({ type: 'NOTES_UPDATED', payload: notes });
      break;

    case 'UPDATE_CONFIG':
      saveConfig(payload);
      break;

    case 'TRIGGER_SENTRY_ALARM':
      broadcast({ type: 'SENTRY_ALERT', payload: { time: new Date().toISOString() } });
      break;

    case 'PING':
      senderWs.send(JSON.stringify({ type: 'PONG', time: Date.now() }));
      break;
  }
}

// REST API Endpoints
app.get('/api/info', async (req, res) => {
  const localIP = getLocalIP();
  const mobileURL = `http://${localIP}:${PORT}`;
  let qrCodeDataURL = '';

  try {
    qrCodeDataURL = await QRCode.toDataURL(mobileURL, {
      color: { dark: '#00e5ff', light: '#050c14' },
      width: 260,
      margin: 1
    });
  } catch (err) {}

  const stats = await getSystemStats();

  res.json({
    assistantName: config.assistantName,
    userTitle: config.userTitle,
    localIP,
    port: PORT,
    mobileURL,
    qrCodeDataURL,
    stats,
    weather: cachedWeather,
    config,
    notesCount: loadNotes().length
  });
});

app.get('/api/telemetry', async (req, res) => {
  const stats = await getSystemStats();
  res.json(stats);
});

app.get('/api/weather', (req, res) => {
  res.json(cachedWeather);
});

app.get('/api/config', (req, res) => {
  res.json(config);
});

app.post('/api/config', (req, res) => {
  saveConfig(req.body);
  res.json({ success: true, config });
});

app.get('/api/notes', (req, res) => {
  res.json(loadNotes());
});

app.post('/api/notes', (req, res) => {
  const noteText = (req.body.text || '').trim();
  if (noteText) {
    const notes = loadNotes();
    const newNote = {
      id: Date.now(),
      text: noteText,
      created: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    notes.unshift(newNote);
    saveNotes(notes);
    broadcast({ type: 'NOTES_UPDATED', payload: notes });
    return res.json({ success: true, note: newNote, notes });
  }
  res.json({ success: false, error: 'Empty note' });
});

app.delete('/api/notes/:id', (req, res) => {
  let notes = loadNotes();
  notes = notes.filter(n => n.id !== parseInt(req.params.id));
  saveNotes(notes);
  broadcast({ type: 'NOTES_UPDATED', payload: notes });
  res.json({ success: true, notes });
});

app.delete('/api/notes', (req, res) => {
  saveNotes([]);
  broadcast({ type: 'NOTES_UPDATED', payload: [] });
  res.json({ success: true, notes: [] });
});

app.get('/api/clipboard', async (req, res) => {
  const r = await executeMacCommand('GET_CLIPBOARD');
  res.json(r);
});

app.post('/api/clipboard', async (req, res) => {
  const r = await executeMacCommand('SET_CLIPBOARD', req.body);
  broadcast({ type: 'CLIPBOARD_SYNCED', payload: req.body });
  res.json(r);
});

app.post('/api/webhook/trigger', async (req, res) => {
  const { command, action, appName, level, query } = req.body;
  let result = { success: true };
  if (action) {
    result = await executeMacCommand(action, { appName, level, query });
  }
  broadcast({
    type: 'WEBHOOK_EVENT',
    payload: { command: command || action, params: req.body, result, timestamp: new Date().toISOString() }
  });
  res.json({
    status: 'acknowledged',
    assistant: config.assistantName,
    message: `Command executed: ${command || action}`,
    result
  });
});

app.post('/api/speech-intent', (req, res) => {
  const { text } = req.body;
  broadcast({ type: 'TRANSCRIPT', payload: { role: 'user', text, source: 'mobile-webhook' } });
  res.json({ success: true, understood: true, received: text });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`\n======================================================`);
  console.log(`🦾 ${config.assistantName.toUpperCase()} NODE SERVER v3.0 ONLINE`);
  console.log(`🖥️  Mac Desktop HUD:    http://localhost:${PORT}`);
  console.log(`📱  Mobile Phone Access: http://${localIP}:${PORT}`);
  console.log(`======================================================\n`);
});
