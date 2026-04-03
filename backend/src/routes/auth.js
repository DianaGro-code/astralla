import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { getUsage } from '../services/usageLimit.js';
import { sendPasswordResetEmail } from '../services/email.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Try again in an hour.' },
});

const router = express.Router();

router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const pool = getDb();
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (existing.length) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
    [email.toLowerCase(), hash, name]
  );
  const newId = rows[0].id;

  const token = jwt.sign(
    { id: newId, email: email.toLowerCase(), name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.status(201).json({ token, user: { id: newId, email: email.toLowerCase(), name } });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const pool = getDb();
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// GET /api/auth/me — return current user profile (including home city + tier + usage)
router.get('/me', requireAuth, async (req, res) => {
  const pool = getDb();
  const { rows } = await pool.query(
    'SELECT id, email, name, tier, home_city, home_lat, home_lng FROM users WHERE id = $1',
    [req.user.id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  const usage = user.tier === 'pro' ? { unlimited: true } : await getUsage(user.id);
  res.json({ ...user, usage });
});

// GET /api/auth/usage — lightweight usage check
router.get('/usage', requireAuth, async (req, res) => {
  if (req.user.tier === 'pro') return res.json({ tier: 'pro', unlimited: true });
  const usage = await getUsage(req.user.id);
  res.json({ tier: 'free', ...usage });
});

// POST /api/auth/forgot-password — request a reset link
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const pool = getDb();
  const { rows } = await pool.query(
    'SELECT id, email FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  const user = rows[0];

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  }

  // Invalidate any existing unused tokens for this user
  await pool.query(
    'UPDATE password_reset_tokens SET used = 1 WHERE user_id = $1 AND used = 0',
    [user.id]
  );

  // Generate a secure random token; store only its SHA-256 hash
  const rawToken  = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  try {
    await sendPasswordResetEmail(user.email, rawToken);
  } catch (err) {
    console.error('Password reset email failed:', err);
    return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

// POST /api/auth/reset-password — set new password using a reset token
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const pool = getDb();

  const { rows } = await pool.query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND used = 0 AND expires_at > NOW()`,
    [tokenHash]
  );
  const record = rows[0];

  if (!record) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
  }

  // Mark token used before updating password (prevents replay)
  await pool.query(
    'UPDATE password_reset_tokens SET used = 1 WHERE id = $1',
    [record.id]
  );

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [hash, record.user_id]
  );

  res.json({ message: 'Password updated. You can now sign in with your new password.' });
});

// PUT /api/auth/home-city — save user's home city
router.put('/home-city', requireAuth, async (req, res) => {
  const { cityName, cityLat, cityLng } = req.body;
  if (!cityName || cityLat == null || cityLng == null) {
    return res.status(400).json({ error: 'cityName, cityLat and cityLng are required' });
  }
  await getDb().query(
    'UPDATE users SET home_city = $1, home_lat = $2, home_lng = $3 WHERE id = $4',
    [cityName, cityLat, cityLng, req.user.id]
  );
  res.json({ cityName, cityLat, cityLng });
});

/**
 * POST /api/auth/upgrade
 * Called by the app after a successful RevenueCat purchase to mark the user as Pro.
 * Body: { rcCustomerId } — RevenueCat customer ID, stored for future server-side verification.
 */
router.post('/upgrade', requireAuth, async (req, res) => {
  const { rcCustomerId } = req.body;
  const pool = getDb();

  await pool.query(
    'UPDATE users SET tier = $1 WHERE id = $2',
    ['pro', req.user.id]
  );

  // Store the RevenueCat customer ID for webhook correlation / future verification
  if (rcCustomerId) {
    await pool.query(
      `UPDATE users SET rc_customer_id = $1 WHERE id = $2`,
      [rcCustomerId, req.user.id]
    ).catch(() => {}); // column may not exist yet — non-fatal
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, tier FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ user: rows[0] });
});

/**
 * POST /api/auth/restore
 * Called after RevenueCat restorePurchases — re-checks entitlement and syncs tier.
 * Body: { entitlementActive: boolean }
 */
router.post('/restore', requireAuth, async (req, res) => {
  const { entitlementActive } = req.body;
  const pool = getDb();

  const newTier = entitlementActive ? 'pro' : 'free';
  await pool.query('UPDATE users SET tier = $1 WHERE id = $2', [newTier, req.user.id]);

  const { rows } = await pool.query(
    'SELECT id, name, email, tier FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ user: rows[0] });
});

export default router;
