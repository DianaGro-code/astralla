/**
 * Lifetime usage limit enforcement.
 *
 * Free users get FREE_LIMIT AI-generated readings total (all-time).
 * Cache hits never count — the limit is only checked before a Claude call.
 * Pro users are never blocked.
 */

import { getDb } from '../db/database.js';

export const FREE_LIMIT = 10;

/** How many AI readings the user has generated in total */
export async function getUsage(userId) {
  const { rows } = await getDb().query(
    'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = $1',
    [userId]
  );
  const count = parseInt(rows[0].count, 10);
  return { used: count, limit: FREE_LIMIT };
}

/**
 * Check if the user is allowed to generate another reading.
 * Returns { allowed: true } for pro users.
 * Returns { allowed, used, limit } for free users.
 */
export async function checkLimit(user) {
  if (user.tier === 'pro') return { allowed: true };
  const usage = await getUsage(user.id);
  return { allowed: usage.used < usage.limit, ...usage };
}

/**
 * Atomically check the limit AND reserve a slot in a single transaction.
 * This closes the race condition where two concurrent requests both pass checkLimit
 * before either logs usage.
 *
 * Returns { allowed: true } for pro users.
 * Returns { allowed, used, limit } for free users.
 * If allowed, usage is already recorded — do NOT call logUsage separately.
 */
export async function reserveUsage(user, feature) {
  if (user.tier === 'pro') return { allowed: true };
  const pool = getDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = $1',
      [user.id]
    );
    const count = parseInt(rows[0].count, 10);
    if (count >= FREE_LIMIT) {
      await client.query('ROLLBACK');
      return { allowed: false, used: count, limit: FREE_LIMIT };
    }
    await client.query(
      'INSERT INTO usage_logs (user_id, feature) VALUES ($1, $2)',
      [user.id, feature]
    );
    await client.query('COMMIT');
    return { allowed: true, used: count + 1, limit: FREE_LIMIT };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Record one AI generation for the user */
export async function logUsage(userId, feature) {
  await getDb().query(
    'INSERT INTO usage_logs (user_id, feature) VALUES ($1, $2)',
    [userId, feature]
  );
}
