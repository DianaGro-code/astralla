import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

let pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function initDb() {
  const pool = getDb();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'free',
      home_city TEXT,
      home_lat REAL,
      home_lng REAL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS birth_charts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      birth_time TEXT NOT NULL,
      birth_place TEXT NOT NULL,
      birth_lat REAL NOT NULL,
      birth_lng REAL NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS readings (
      id SERIAL PRIMARY KEY,
      chart_id INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      city_lat REAL NOT NULL,
      city_lng REAL NOT NULL,
      influences TEXT NOT NULL,
      parans TEXT NOT NULL,
      reading_text TEXT NOT NULL DEFAULT '',
      themes TEXT,
      partner_chart_id INTEGER REFERENCES birth_charts(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS weekly_readings (
      id SERIAL PRIMARY KEY,
      chart_id INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      city_lat REAL NOT NULL,
      city_lng REAL NOT NULL,
      week_start TEXT NOT NULL,
      reading TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transit_readings (
      id SERIAL PRIMARY KEY,
      chart_id INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      city_lat REAL NOT NULL,
      city_lng REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      transit_data TEXT NOT NULL,
      reading TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS solar_returns (
      id SERIAL PRIMARY KEY,
      chart_id INTEGER NOT NULL REFERENCES birth_charts(id) ON DELETE CASCADE,
      city_name TEXT NOT NULL,
      city_lat REAL NOT NULL,
      city_lng REAL NOT NULL,
      return_year INTEGER NOT NULL,
      return_date TEXT NOT NULL,
      sr_data TEXT NOT NULL,
      reading TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_charts_user       ON birth_charts(user_id);
    CREATE INDEX IF NOT EXISTS idx_readings_chart    ON readings(chart_id);
    CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
    CREATE INDEX IF NOT EXISTS idx_usage_user_time   ON usage_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_weekly_lookup     ON weekly_readings(chart_id, city_name, week_start);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
  `);

  console.log('Database ready');
}
