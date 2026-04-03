import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getDb } from '../db/database.js';

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests.' },
});

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

router.get('/stats', adminLimiter, checkAdminPassword, async (_req, res) => {
  const pool = getDb();

  const { rows: [{ count: rawUsers }] }    = await pool.query('SELECT COUNT(*) as count FROM users');
  const { rows: [{ count: rawCharts }] }   = await pool.query('SELECT COUNT(*) as count FROM birth_charts');
  const { rows: [{ count: rawReadings }] } = await pool.query('SELECT COUNT(*) as count FROM readings');

  const totalUsers    = parseInt(rawUsers, 10);
  const totalCharts   = parseInt(rawCharts, 10);
  const totalReadings = parseInt(rawReadings, 10);

  const { rows: users } = await pool.query(`
    SELECT u.id, u.email, u.name, u.created_at,
      COUNT(DISTINCT bc.id) as chart_count,
      COUNT(DISTINCT r.id) as reading_count
    FROM users u
    LEFT JOIN birth_charts bc ON bc.user_id = u.id
    LEFT JOIN readings r ON r.chart_id = bc.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);

  const { rows: signupsByDay } = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `);

  res.json({ totalUsers, totalCharts, totalReadings, users, signupsByDay });
});

export default router;
