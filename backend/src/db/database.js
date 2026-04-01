import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

export function getDb() {
  if (!db) {
    const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/astro.db');
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS birth_charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      birth_time TEXT NOT NULL,
      birth_place TEXT NOT NULL,
      birth_lat REAL NOT NULL,
      birth_lng REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_id INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      city_lat REAL NOT NULL,
      city_lng REAL NOT NULL,
      influences TEXT NOT NULL,
      parans TEXT NOT NULL,
      reading_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add themes column if it doesn't exist (migration)
  try { db.exec('ALTER TABLE readings ADD COLUMN themes TEXT'); } catch {}

  // Add is_primary flag to birth_charts (migration)
  try { db.exec('ALTER TABLE birth_charts ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0'); } catch {}

  // Add home city fields to users (migration)
  try { db.exec('ALTER TABLE users ADD COLUMN home_city TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN home_lat REAL'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN home_lng REAL'); } catch {}

  // Partner chart reference (migration)
  try { db.exec('ALTER TABLE readings ADD COLUMN partner_chart_id INTEGER REFERENCES birth_charts(id)'); } catch {}

  // Tier + usage (migration)
  try { db.exec("ALTER TABLE users ADD COLUMN tier TEXT NOT NULL DEFAULT 'free'"); } catch {}

  // Indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_charts_user     ON birth_charts(user_id);
    CREATE INDEX IF NOT EXISTS idx_readings_chart  ON readings(chart_id);
    CREATE INDEX IF NOT EXISTS idx_usage_user_time ON usage_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_weekly_lookup   ON weekly_readings(chart_id, city_name, week_start);
    CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
  `);

  // Usage log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Weekly readings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_id INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      city_lat REAL NOT NULL,
      city_lng REAL NOT NULL,
      week_start TEXT NOT NULL,
      reading TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Transit readings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transit_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_id INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      city_lat REAL NOT NULL,
      city_lng REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      transit_data TEXT NOT NULL,
      reading TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Solar return readings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS solar_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_id INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      city_lat REAL NOT NULL,
      city_lng REAL NOT NULL,
      return_year INTEGER NOT NULL,
      return_date TEXT NOT NULL,
      sr_data TEXT NOT NULL,
      reading TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database ready');
}
