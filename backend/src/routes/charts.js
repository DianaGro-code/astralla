import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { generateMapLines } from '../services/astro/astrocarto.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await getDb().query(
    'SELECT * FROM birth_charts WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
    [req.user.id]
  );
  res.json(rows);
});

router.patch('/:id/primary', async (req, res) => {
  const pool = getDb();
  const { rows } = await pool.query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Chart not found' });
  // Clear all primary flags for this user, then set the chosen one
  await pool.query('UPDATE birth_charts SET is_primary = 0 WHERE user_id = $1', [req.user.id]);
  await pool.query('UPDATE birth_charts SET is_primary = 1 WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/', async (req, res) => {
  const { label, birthDate, birthTime, birthPlace } = req.body;
  if (!label || !birthDate || !birthPlace) {
    return res.status(400).json({ error: 'Label, birth date, and birth place are required' });
  }

  try {
    const location = await geocode(birthPlace);
    if (!location) return res.status(400).json({ error: `Could not find location: "${birthPlace}"` });

    const { rows } = await getDb().query(
      `INSERT INTO birth_charts (user_id, label, birth_date, birth_time, birth_place, birth_lat, birth_lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, label, birthDate, birthTime, location.displayName, location.lat, location.lng]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create chart' });
  }
});

router.get('/:id', async (req, res) => {
  const { rows } = await getDb().query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Chart not found' });
  res.json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { label, birthDate, birthTime, birthPlace } = req.body;
  if (!label || !birthDate || !birthPlace) {
    return res.status(400).json({ error: 'Label, birth date, and birth place are required' });
  }
  const pool = getDb();
  const { rows: existing } = await pool.query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing[0]) return res.status(404).json({ error: 'Chart not found' });

  try {
    const location = await geocode(birthPlace);
    if (!location) return res.status(400).json({ error: `Could not find location: "${birthPlace}"` });

    const { rows } = await pool.query(
      `UPDATE birth_charts
       SET label=$1, birth_date=$2, birth_time=$3, birth_place=$4, birth_lat=$5, birth_lng=$6
       WHERE id=$7 RETURNING *`,
      [label, birthDate, birthTime, location.displayName, location.lat, location.lng, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update chart' });
  }
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await getDb().query(
    'DELETE FROM birth_charts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Chart not found' });
  res.json({ success: true });
});

// GET /api/charts/:id/lines — planetary line paths for world-map rendering
router.get('/:id/lines', async (req, res) => {
  const { rows } = await getDb().query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [Number(req.params.id), req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Chart not found' });
  try {
    const lines = generateMapLines(rows[0]);
    res.json(lines);
  } catch (err) {
    console.error('generateMapLines error:', err);
    res.status(500).json({ error: 'Failed to generate map lines' });
  }
});

export default router;
