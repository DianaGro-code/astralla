import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { generateMapLines } from '../services/astro/astrocarto.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const db = getDb();
  const charts = db.prepare(
    'SELECT * FROM birth_charts WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(charts);
});

router.post('/', async (req, res) => {
  const { label, birthDate, birthTime, birthPlace } = req.body;
  if (!label || !birthDate || !birthTime || !birthPlace) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const location = await geocode(birthPlace);
    if (!location) return res.status(400).json({ error: `Could not find location: "${birthPlace}"` });

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO birth_charts (user_id, label, birth_date, birth_time, birth_place, birth_lat, birth_lng)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, label, birthDate, birthTime, location.displayName, location.lat, location.lng);

    const chart = db.prepare('SELECT * FROM birth_charts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(chart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create chart' });
  }
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const chart = db.prepare(
    'SELECT * FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });
  res.json(chart);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM birth_charts WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Chart not found' });
  res.json({ success: true });
});

// GET /api/charts/:id/lines — planetary line paths for world-map rendering
router.get('/:id/lines', (req, res) => {
  const db = getDb();
  const chart = db.prepare(
    'SELECT * FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(Number(req.params.id), req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });
  try {
    const lines = generateMapLines(chart);
    res.json(lines);
  } catch (err) {
    console.error('generateMapLines error:', err);
    res.status(500).json({ error: 'Failed to generate map lines' });
  }
});

export default router;
