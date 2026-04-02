/**
 * Weekly usage limit enforcement.
 *
 * Free users get FREE_LIMIT AI-generated readings per calendar week
 * (Sunday 00:00 UTC → Saturday 23:59 UTC).
 * Cache hits never count — the limit is only checked before a Claude call.
 * Pro users are never blocked.
 */

import { getDb } from '../db/database.js';

export const FREE_LIMIT = 5;

/** ISO string for Sunday 00:00 UTC of the current week */
function thisWeekStart() {
  const now = new Date();
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - now.getUTCDay(), // rewind to Sunday
  ));
  return start.toISOString();
}

/** YYYY-MM-DD of next Sunday (= start of next week = reset day) */
function nextSundayDate() {
  const now  = new Date();
  const days = now.getUTCDay() === 0 ? 7 : 7 - now.getUTCDay();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + days,
  ));
  return next.toISOString().slice(0, 10);
}

/** How many AI readings the user has generated this week */
export function getUsage(userId) {
  const db = getDb();
  const { count } = db.prepare(
    `SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at >= ?`,
  ).get(userId, thisWeekStart());
  return { used: count, limit: FREE_LIMIT, resetsOn: nextSundayDate() };
}

/**
 * Check if the user is allowed to generate another reading.
 * Returns { allowed: true } for pro users.
 * Returns { allowed, used, limit, resetsOn } for free users.
 */
export function checkLimit(user) {
  if (user.tier === 'pro') return { allowed: true };
  const usage = getUsage(user.id);
  return { allowed: usage.used < usage.limit, ...usage };
}

/**
 * Atomically check the limit AND reserve a slot in a single SQLite transaction.
 * This closes the race condition where two concurrent requests both pass checkLimit
 * before either logs usage.
 *
 * Returns { allowed: true } for pro users.
 * Returns { allowed, used, limit, resetsOn } for free users.
 * If allowed, usage is already recorded — do NOT call logUsage separately.
 */
export function reserveUsage(user, feature) {
  if (user.tier === 'pro') return { allowed: true };
  const db = getDb();
  let result;
  const weekStart = thisWeekStart();
  const reserve = db.transaction(() => {
    const { count } = db.prepare(
      'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at >= ?'
    ).get(user.id, weekStart);
    if (count >= FREE_LIMIT) {
      result = { allowed: false, used: count, limit: FREE_LIMIT, resetsOn: nextSundayDate() };
      return;
    }
    db.prepare('INSERT INTO usage_logs (user_id, feature) VALUES (?, ?)').run(user.id, feature);
    result = { allowed: true, used: count + 1, limit: FREE_LIMIT, resetsOn: nextSundayDate() };
  });
  reserve();
  return result;
}

/** Record one AI generation for the user */
export function logUsage(userId, feature) {
  const db = getDb();
  db.prepare('INSERT INTO usage_logs (user_id, feature) VALUES (?, ?)').run(userId, feature);
}
