import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { calculateSolarReturn } from '../services/astro/solarReturn.js';
import { generateSolarReturnReading } from '../services/claude.js';

const router = express.Router();
router.use(requireAuth);

/**
 * POST /api/solar-returns
 * Generate a Solar Return reading for a chart + city + year.
 *
 * Body: { chartId, cityQuery, targetYear }
 */
router.post('/', async (req, res) => {
  const { chartId, cityQuery, targetYear } = req.body;
  if (!chartId || !cityQuery || !targetYear) {
    return res.status(400).json({ error: 'chartId, cityQuery and targetYear are required' });
  }

  const year = parseInt(targetYear, 10);
  if (isNaN(year) || year < 1900 || year > 2100) {
    return res.status(400).json({ error: 'targetYear must be a valid year' });
  }

  const db = getDb();
  const chart = db.prepare(
    'SELECT * FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(chartId, req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  try {
    const city = await geocode(cityQuery);
    if (!city) return res.status(400).json({ error: `Could not find city: "${cityQuery}"` });

    // Check cache
    const existing = db.prepare(
      `SELECT * FROM solar_returns
       WHERE chart_id = ? AND city_name = ? AND return_year = ?
       ORDER BY created_at DESC LIMIT 1`
    ).get(chartId, city.displayName, year);

    if (existing) {
      return res.json({
        ...existing,
        srData: JSON.parse(existing.sr_data),
        reading: JSON.parse(existing.reading),
      });
    }

    // Calculate solar return
    const srData = calculateSolarReturn(chart, city, year);

    // Generate AI reading
    const reading = await generateSolarReturnReading(chart, city, srData);

    // Persist
    const result = db.prepare(
      `INSERT INTO solar_returns (chart_id, city_name, city_lat, city_lng, return_year, return_date, sr_data, reading)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      chartId,
      city.displayName,
      city.lat,
      city.lng,
      year,
      srData.srDate,
      JSON.stringify(srData),
      JSON.stringify(reading),
    );

    const row = db.prepare('SELECT * FROM solar_returns WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...row,
      srData,
      reading,
    });
  } catch (err) {
    console.error('Solar return error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate solar return reading' });
  }
});

export default router;
