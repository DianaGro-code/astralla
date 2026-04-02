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

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), hash, name);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email: email.toLowerCase(), name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.status(201).json({ token, user: { id: result.lastInsertRowid, email: email.toLowerCase(), name } });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
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
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, tier, home_city, home_lat, home_lng FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const usage = user.tier === 'pro' ? { unlimited: true } : getUsage(user.id);
  res.json({ ...user, usage });
});

// GET /api/auth/usage — lightweight usage check
router.get('/usage', requireAuth, (req, res) => {
  if (req.user.tier === 'pro') return res.json({ tier: 'pro', unlimited: true });
  res.json({ tier: 'free', ...getUsage(req.user.id) });
});

// POST /api/auth/forgot-password — request a reset link
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const db = getDb();
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase().trim());

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  }

  // Invalidate any existing unused tokens for this user
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

  // Generate a secure random token; store only its SHA-256 hash
  const rawToken   = crypto.randomBytes(32).toString('hex');
  const tokenHash  = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt  = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, tokenHash, expiresAt);

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
  const db = getDb();

  const record = db.prepare(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')`
  ).get(tokenHash);

  if (!record) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
  }

  // Mark token used before updating password (prevents replay)
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(record.id);

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, record.user_id);

  res.json({ message: 'Password updated. You can now sign in with your new password.' });
});

// PUT /api/auth/home-city — save user's home city
router.put('/home-city', requireAuth, (req, res) => {
  const { cityName, cityLat, cityLng } = req.body;
  if (!cityName || cityLat == null || cityLng == null) {
    return res.status(400).json({ error: 'cityName, cityLat and cityLng are required' });
  }
  const db = getDb();
  db.prepare('UPDATE users SET home_city = ?, home_lat = ?, home_lng = ? WHERE id = ?')
    .run(cityName, cityLat, cityLng, req.user.id);
  res.json({ cityName, cityLat, cityLng });
});

export default router;
