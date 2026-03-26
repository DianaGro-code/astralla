import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
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

router.post('/login', async (req, res) => {
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

// GET /api/auth/me — return current user profile (including home city)
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, home_city, home_lat, home_lng FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
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
