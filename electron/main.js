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

const PG_PORT = 5433;
const PG_USER = 'sportfest';
const PG_PASS = 'sportfest';
const PG_DB   = 'sportfest';

let mainWindow    = null;
let splashWindow  = null;
let backendProcess = null;
let pgInstance    = null;

// ── Logging ───────────────────────────────────────────────────────────────────

const logDir  = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'startup.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, line);
  } catch {}
}

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

// ── PostgreSQL (embedded) ─────────────────────────────────────────────────────

/**
 * Manages an embedded PostgreSQL instance.
 * Binary paths are resolved directly from process.resourcesPath/app.asar.unpacked
 * because embedded-postgres uses ESM import.meta.url which doesn't work inside
 * a packaged Electron ASAR.
 */
class LocalPgManager {
  constructor({ databaseDir, user, password, port }) {
    const pkgName = process.platform === 'win32' ? 'windows-x64'
                  : process.platform === 'darwin'
                      ? (process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64')
                      : (process.arch === 'arm64' ? 'linux-arm64' : 'linux-x64');
    const ext = process.platform === 'win32' ? '.exe' : '';
    const binDir = path.join(
      process.resourcesPath, 'app.asar.unpacked', 'node_modules',
      '@embedded-postgres', pkgName, 'native', 'bin'
    );

    this.initdbBin   = path.join(binDir, `initdb${ext}`);
    this.postgresBin = path.join(binDir, `postgres${ext}`);
    this.databaseDir = databaseDir;
    this.user        = user;
    this.password    = password;
    this.port        = port;
    this.process     = null;
  }

  async initialise() {
    if (process.platform !== 'win32') {
      for (const bin of [this.initdbBin, this.postgresBin]) {
        try { await fs.promises.chmod(bin, 0o755); } catch {}
      }
    }

    const passwordFile = path.join(app.getPath('temp'), `pg-pass-${Date.now()}`);
    await fs.promises.writeFile(passwordFile, this.password + '\n');

    await new Promise((resolve, reject) => {
      const proc = spawn(this.initdbBin, [
        `--pgdata=${this.databaseDir}`,
        '--auth=password',
        `--username=${this.user}`,
        `--pwfile=${passwordFile}`,
        '--lc-messages=en_US.UTF-8',
      ], { env: { ...process.env, LC_MESSAGES: 'en_US.UTF-8' } });

      proc.stdout?.on('data', d => log(`[initdb] ${d.toString().trim()}`));
      proc.stderr?.on('data', d => log(`[initdb] ${d.toString().trim()}`));
      proc.on('exit', code => {
        code === 0 ? resolve() : reject(new Error(`initdb exited with code ${code}`));
      });
      proc.on('error', err =>
        reject(new Error(`initdb spawn failed: ${err.message} — path: ${this.initdbBin}`))
      );
    });

    await fs.promises.unlink(passwordFile).catch(() => {});
  }

  async start() {
    await new Promise((resolve, reject) => {
      let resolved = false;

      this.process = spawn(this.postgresBin, [
        '-D', this.databaseDir,
        '-p', String(this.port),
      ], { env: { ...process.env, LC_MESSAGES: 'en_US.UTF-8' } });

      this.process.stderr?.on('data', chunk => {
        const msg = chunk.toString('utf-8');
        log(`[postgres] ${msg.trim()}`);
        if (!resolved && msg.includes('database system is ready to accept connections')) {
          resolved = true;
          resolve();
        }
      });
      this.process.stdout?.on('data', chunk => log(`[postgres] ${chunk.toString().trim()}`));
      this.process.on('close', code => {
        if (!resolved) reject(new Error(`postgres exited before ready (code ${code})`));
      });
      this.process.on('error', err => {
        if (!resolved) reject(new Error(`postgres spawn failed: ${err.message} — path: ${this.postgresBin}`));
      });
    });
  }

  async createDatabase(name) {
    const { Client } = require('pg');
    const client = new Client({
      host: '127.0.0.1',
      port: this.port,
      user: this.user,
      password: this.password,
      database: 'postgres',
    });
    await client.connect();
    try {
      await client.query(`CREATE DATABASE "${name}"`);
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    } finally {
      await client.end();
    }
  }

  stop() {
    this.process?.kill();
    this.process = null;
  }
}

async function startPostgres() {
  const pgDataDir = path.join(app.getPath('userData'), 'pgdata');

  pgInstance = new LocalPgManager({
    databaseDir: pgDataDir,
    user: PG_USER,
    password: PG_PASS,
    port: PG_PORT,
  });

  const isNew = !fs.existsSync(pgDataDir);
  if (isNew) {
    log('Initialising PostgreSQL cluster…');
    await pgInstance.initialise();
  }

  log('Starting PostgreSQL…');
  await pgInstance.start();

  if (isNew) {
    log(`Creating database "${PG_DB}"…`);
    await pgInstance.createDatabase(PG_DB);
  }

  log(`PostgreSQL ready on port ${PG_PORT}`);
}

// ── Backend ───────────────────────────────────────────────────────────────────

async function startBackend() {
  if (IS_DEV) return DEV_API_PORT;

  const port = await findFreePort();

  const ext    = process.platform === 'win32' ? '.exe' : '';
  const binary = path.join(
    process.resourcesPath, 'api', 'Sportfest-API', `Sportfest-API${ext}`
  );

  if (!fs.existsSync(binary)) {
    throw new Error(`Backend binary not found:\n${binary}`);
  }

  const logPath   = path.join(app.getPath('userData'), 'sportfest.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logStream.write(`\n--- ${new Date().toISOString()} ---\n`);

  backendProcess = spawn(binary, [], {
    env: {
      ...process.env,
      SPORTFEST_PORT:    String(port),
      SPORTFEST_PG_HOST: '127.0.0.1',
      SPORTFEST_PG_PORT: String(PG_PORT),
      SPORTFEST_PG_USER: PG_USER,
      SPORTFEST_PG_PASS: PG_PASS,
      SPORTFEST_PG_DB:   PG_DB,
    },
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
    pgInstance?.stop();
    app.quit();
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createSplash();
  try {
    if (!IS_DEV) await startPostgres();
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
  pgInstance?.stop();
  app.quit();
});
