import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateTransits } from '../services/astro/transits.js';
import { generateWeeklyReading } from '../services/claude.js';

const router = express.Router();
router.use(requireAuth);

/** Returns the Monday of the week containing `date` as YYYY-MM-DD */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart) {
  const d = new Date(weekStart + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

/**
 * POST /api/weekly
 * Get (or generate) a weekly reading for a chart + city.
 * Body: { chartId, cityName, cityLat, cityLng }
 */
router.post('/', async (req, res) => {
  const { chartId, cityName, cityLat, cityLng } = req.body;
  if (!chartId || !cityName || cityLat == null || cityLng == null) {
    return res.status(400).json({ error: 'chartId, cityName, cityLat and cityLng are required' });
  }

  const db = getDb();
  const chart = db.prepare(
    'SELECT * FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(chartId, req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  const weekStart = getWeekStart();
  const weekEnd   = getWeekEnd(weekStart);

  // Return cached reading if it exists for this week
  const cached = db.prepare(
    `SELECT * FROM weekly_readings
     WHERE chart_id = ? AND city_name = ? AND week_start = ?
     ORDER BY created_at DESC LIMIT 1`
  ).get(chartId, cityName, weekStart);

  if (cached) {
    return res.json({ ...cached, reading: JSON.parse(cached.reading), weekStart, weekEnd, cached: true });
  }

  try {
    const city = { displayName: cityName, lat: cityLat, lng: cityLng };
    const transitData = calculateTransits(chart, city, weekStart, weekEnd);
    const reading = await generateWeeklyReading(chart, city, weekStart, weekEnd, transitData);

    const result = db.prepare(
      `INSERT INTO weekly_readings (chart_id, city_name, city_lat, city_lng, week_start, reading)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(chartId, cityName, cityLat, cityLng, weekStart, JSON.stringify(reading));

    const row = db.prepare('SELECT * FROM weekly_readings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...row, reading, weekStart, weekEnd, cached: false });
  } catch (err) {
    console.error('Weekly reading error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate weekly reading' });
  }
});

export default router;
