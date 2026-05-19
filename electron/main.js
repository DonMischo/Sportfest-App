'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const path  = require('path');
const http  = require('http');
const net   = require('net');
const fs    = require('fs');
const { spawn } = require('child_process');

const IS_DEV      = !app.isPackaged;
const DEV_URL     = 'http://localhost:5173';   // Vite dev server
const DEV_API_PORT = 8080;                      // uvicorn dev port

let mainWindow    = null;
let splashWindow  = null;
let backendProcess = null;

// ── Port helpers ─────────────────────────────────────────────────────────────

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const attempt = () => {
      http.get(`http://127.0.0.1:${port}/disciplines`, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (Date.now() > deadline) return reject(new Error(`Backend timeout on port ${port}`));
        setTimeout(attempt, 300);
      });
    };
    attempt();
  });
}

// ── Backend ───────────────────────────────────────────────────────────────────

async function startBackend() {
  if (IS_DEV) return DEV_API_PORT;

  const port   = await findFreePort();
  const dbPath = path.join(app.getPath('userData'), 'sportfest.db');

  const ext    = process.platform === 'win32' ? '.exe' : '';
  const binary = path.join(
    process.resourcesPath, 'api', 'Sportfest-API', `Sportfest-API${ext}`
  );

  if (!fs.existsSync(binary)) {
    throw new Error(`Backend binary not found:\n${binary}`);
  }

  const logPath  = path.join(app.getPath('userData'), 'sportfest.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logStream.write(`\n--- ${new Date().toISOString()} ---\n`);

  backendProcess = spawn(binary, [], {
    env: { ...process.env, SPORTFEST_PORT: String(port), SPORTFEST_DB: dbPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backendProcess.stdout?.pipe(logStream);
  backendProcess.stderr?.pipe(logStream);

  backendProcess.on('exit', (code) => {
    logStream.write(`Backend exited with code ${code}\n`);
    if (code !== 0 && mainWindow) {
      dialog.showErrorBox('Sportfest', `Backend unerwartet beendet (Code ${code}).\nLog: ${logPath}`);
    }
  });

  await waitForPort(port);
  return port;
}

// ── Windows ───────────────────────────────────────────────────────────────────

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 260,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { nodeIntegration: false },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMain(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Sportfest',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const url = IS_DEV ? DEV_URL : `http://127.0.0.1:${port}`;
  mainWindow.loadURL(url);

  // Open external links in the system browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    splashWindow?.close();
    splashWindow = null;
    mainWindow.show();
    if (IS_DEV) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    backendProcess?.kill();
    app.quit();
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createSplash();
  try {
    const port = await startBackend();
    createMain(port);
  } catch (err) {
    splashWindow?.close();
    dialog.showErrorBox('Startfehler', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  backendProcess?.kill();
  app.quit();
});
