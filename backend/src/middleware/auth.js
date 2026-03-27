import jwt from 'jsonwebtoken';
import { getDb } from '../db/database.js';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = getDb().prepare('SELECT id, name, email, tier FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
