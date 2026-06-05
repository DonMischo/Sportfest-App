"use strict";

/**
 * Starts the embedded PostgreSQL instance for dev mode.
 * Stays alive until killed (Ctrl+C).  Used by dev.bat.
 */

const path = require("path");
const fs   = require("fs");
const os   = require("os");
const { spawn } = require("child_process");
const { Client } = require("pg");

const PG_PORT = parseInt(process.env.SPORTFEST_PG_PORT || "5433", 10);
const PG_USER = process.env.SPORTFEST_PG_USER || "sportfest";
const PG_PASS = process.env.SPORTFEST_PG_PASS || "sportfest";
const PG_DB   = process.env.SPORTFEST_PG_DB   || "sportfest";

const pgDataDir = path.join(os.homedir(), ".sportfest-dev", "pgdata");

// ── Resolve embedded-postgres binaries ───────────────────────────────────────

const pkgName = process.platform === "win32" ? "windows-x64"
              : process.platform === "darwin"
                  ? (process.arch === "arm64" ? "darwin-arm64" : "darwin-x64")
                  : (process.arch === "arm64" ? "linux-arm64" : "linux-x64");
const ext = process.platform === "win32" ? ".exe" : "";
const binDir = path.join(
  __dirname, "..", "node_modules",
  "@embedded-postgres", pkgName, "native", "bin"
);

const initdbBin   = path.join(binDir, `initdb${ext}`);
const postgresBin = path.join(binDir, `postgres${ext}`);

function log(msg) { console.log(`[dev-pg] ${msg}`); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(bin, args, env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { env: { ...process.env, ...env } });
    proc.stdout?.on("data", d => log(d.toString().trim()));
    proc.stderr?.on("data", d => log(d.toString().trim()));
    proc.on("exit", code => code === 0 ? resolve() : reject(new Error(`${bin} exited ${code}`)));
    proc.on("error", err => reject(err));
  });
}

function startPostgres() {
  return new Promise((resolve, reject) => {
    let ready = false;
    const proc = spawn(postgresBin, ["-D", pgDataDir, "-p", String(PG_PORT)], {
      env: { ...process.env, LC_MESSAGES: "en_US.UTF-8" },
    });
    proc.stderr?.on("data", chunk => {
      const msg = chunk.toString();
      log(msg.trim());
      if (!ready && msg.includes("database system is ready to accept connections")) {
        ready = true;
        resolve(proc);
      }
    });
    proc.stdout?.on("data", d => log(d.toString().trim()));
    proc.on("close", code => { if (!ready) reject(new Error(`postgres exited early (${code})`)); });
    proc.on("error", err => reject(err));
  });
}

async function createDatabase() {
  const client = new Client({
    host: "127.0.0.1", port: PG_PORT,
    user: PG_USER, password: PG_PASS,
    database: "postgres",
  });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${PG_DB}"`);
    log(`Database "${PG_DB}" created.`);
  } catch (e) {
    if (!e.message.includes("already exists")) throw e;
  } finally {
    await client.end();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const isNew = !fs.existsSync(pgDataDir);

  if (isNew) {
    log("First run — initialising PostgreSQL cluster…");
    fs.mkdirSync(pgDataDir, { recursive: true });

    const pwFile = path.join(os.tmpdir(), `pg-pass-${Date.now()}`);
    fs.writeFileSync(pwFile, PG_PASS + "\n");

    await run(initdbBin, [
      `--pgdata=${pgDataDir}`,
      "--auth=password",
      `--username=${PG_USER}`,
      `--pwfile=${pwFile}`,
      "--lc-messages=en_US.UTF-8",
    ], { LC_MESSAGES: "en_US.UTF-8" });

    fs.unlinkSync(pwFile);
  }

  log(`Starting PostgreSQL on port ${PG_PORT}…`);
  const pgProc = await startPostgres();
  log("PostgreSQL ready.");

  if (isNew) await createDatabase();

  // Keep running until Ctrl+C
  process.on("SIGINT",  () => { pgProc.kill(); process.exit(0); });
  process.on("SIGTERM", () => { pgProc.kill(); process.exit(0); });
})().catch(err => { console.error(err.message); process.exit(1); });
