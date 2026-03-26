import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

function checkAdminPassword(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(503).json({ error: 'Admin not configured' });
  }
  const provided = req.headers['x-admin-password'];
  if (!provided || provided !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.get('/stats', checkAdminPassword, (_req, res) => {
  const db = getDb();

  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalCharts = db.prepare('SELECT COUNT(*) as count FROM birth_charts').get().count;
  const totalReadings = db.prepare('SELECT COUNT(*) as count FROM readings').get().count;

  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.created_at,
      COUNT(DISTINCT bc.id) as chart_count,
      COUNT(DISTINCT r.id) as reading_count
    FROM users u
    LEFT JOIN birth_charts bc ON bc.user_id = u.id
    LEFT JOIN readings r ON r.chart_id = bc.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  const signupsByDay = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `).all();

  res.json({ totalUsers, totalCharts, totalReadings, users, signupsByDay });
});

export default router;
