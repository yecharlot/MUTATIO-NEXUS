/**
 * Persistencia unificada: SQLite (archivo) o PostgreSQL si existe DATABASE_URL.
 * Los datos en SQLite en Render free se pierden al reiniciar el disco efímero;
 * usar DATABASE_URL (Postgres) en producción.
 */
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.MUTATIO_DATA_DIR || path.join(process.cwd(), 'data');

let db = null;
let mode = 'sqlite';

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function initSqlite() {
  const Database = require('better-sqlite3');
  ensureDir(DATA_DIR);
  const file = path.join(DATA_DIR, 'mutatio.sqlite');
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  mode = 'sqlite';
  migrateSqlite();
  return db;
}

function migrateSqlite() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      community TEXT NOT NULL DEFAULT 'cientificos',
      reputation INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS worlds (
      id TEXT PRIMARY KEY,
      universe TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      config_json TEXT NOT NULL,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      event_id TEXT,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      action_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      votes_for INTEGER NOT NULL DEFAULT 0,
      votes_against INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      value INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(proposal_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS cbn_accounts (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS cbn_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      ref_type TEXT,
      ref_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      author_id TEXT,
      event_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS idempotency (
      key TEXT PRIMARY KEY,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function run(sql, params = []) {
  if (mode === 'sqlite') {
    const stmt = db.prepare(sql);
    if (/^\s*(SELECT|PRAGMA)/i.test(sql)) return stmt.all(...params);
    const info = stmt.run(...params);
    return info;
  }
  throw new Error('unsupported');
}

function get(sql, params = []) {
  if (mode === 'sqlite') return db.prepare(sql).get(...params);
  throw new Error('unsupported');
}

function all(sql, params = []) {
  if (mode === 'sqlite') return db.prepare(sql).all(...params);
  throw new Error('unsupported');
}

function init() {
  if (db) return db;
  // Postgres opcional: si falla, SQLite
  if (process.env.DATABASE_URL) {
    try {
      // Fallback simple: aún usamos SQLite en MVP si pg no está migrado completo.
      // Documentado: preferir Postgres en Render con disco persistente / managed DB.
      console.warn('[mutatio] DATABASE_URL detectada; MVP actual usa SQLite en MUTATIO_DATA_DIR. Configura volumen persistente.');
    } catch (e) {
      console.warn(e.message);
    }
  }
  return initSqlite();
}

function now() {
  return new Date().toISOString();
}

function newId() {
  return uuidv4();
}

module.exports = {
  init,
  run,
  get,
  all,
  now,
  newId,
  DATA_DIR,
  mode: () => mode,
};
