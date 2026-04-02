import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { calculateTransits } from '../services/astro/transits.js';
import { calculateRelocatedChart } from '../services/astro/relocatedChart.js';
import { generateTransitReading } from '../services/claude.js';
import { reserveUsage } from '../services/usageLimit.js';

const router = express.Router();
router.use(requireAuth);

/**
 * POST /api/transits
 * Generate a travel transit reading for a chart + city + date range.
 *
 * Body: { chartId, cityQuery, startDate, endDate }
 */
router.post('/', async (req, res) => {
  const { chartId, cityQuery, startDate, endDate } = req.body;
  if (!chartId || !cityQuery || !startDate || !endDate) {
    return res.status(400).json({ error: 'chartId, cityQuery, startDate and endDate are required' });
  }

  const db = getDb();
  const chart = db.prepare(
    'SELECT * FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(chartId, req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  try {
    const city = await geocode(cityQuery);
    if (!city) return res.status(400).json({ error: `Could not find city: "${cityQuery}"` });

    // Check for cached transit reading
    const existing = db.prepare(
      `SELECT * FROM transit_readings
       WHERE chart_id = ? AND city_name = ? AND start_date = ? AND end_date = ?
       ORDER BY created_at DESC LIMIT 1`
    ).get(chartId, city.displayName, startDate, endDate);

    if (existing) {
      return res.json({
        ...existing,
        transitData: JSON.parse(existing.transit_data),
        reading: JSON.parse(existing.reading),
      });
    }

    // Atomically reserve a usage slot before calling Claude
    const limit = reserveUsage(req.user, 'transit');
    if (!limit.allowed) {
      return res.status(402).json({
        error: `You've used all ${limit.limit} free readings this week.`,
        limitReached: true, used: limit.used, limit: limit.limit, resetsOn: limit.resetsOn,
      });
    }

    // Calculate transits + relocated chart
    const transitData    = calculateTransits(chart, city, startDate, endDate);
    const relocatedChart = calculateRelocatedChart(chart, city);

    // Generate AI reading
    const reading = await generateTransitReading(chart, city, startDate, endDate, transitData, relocatedChart);

    // Persist
    const result = db.prepare(
      `INSERT INTO transit_readings (chart_id, city_name, city_lat, city_lng, start_date, end_date, transit_data, reading)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      chartId,
      city.displayName,
      city.lat,
      city.lng,
      startDate,
      endDate,
      JSON.stringify(transitData),
      JSON.stringify(reading),
    );

    const row = db.prepare('SELECT * FROM transit_readings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...row,
      transitData,
      reading,
    });
  } catch (err) {
    console.error('Transit reading error:', err);
    res.status(500).json({ error: 'Failed to generate transit reading' });
  }
});

export default router;
