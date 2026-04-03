import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { calculateSolarReturn } from '../services/astro/solarReturn.js';
import { calculateRelocatedChart } from '../services/astro/relocatedChart.js';
import { generateSolarReturnReading } from '../services/claude.js';
import { reserveUsage } from '../services/usageLimit.js';

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

  const pool = getDb();
  const { rows: chartRows } = await pool.query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [chartId, req.user.id]
  );
  const chart = chartRows[0];
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  try {
    const city = await geocode(cityQuery);
    if (!city) return res.status(400).json({ error: `Could not find city: "${cityQuery}"` });

    // Check cache — only use if it has monthly themes (new format)
    const { rows: existingRows } = await pool.query(
      `SELECT * FROM solar_returns
       WHERE chart_id = $1 AND city_name = $2 AND return_year = $3
       ORDER BY created_at DESC LIMIT 1`,
      [chartId, city.displayName, year]
    );
    const existing = existingRows[0];

    if (existing) {
      const cachedReading = JSON.parse(existing.reading);
      const hasMonths = cachedReading.months && cachedReading.months.length === 12;
      const cityRef = city.displayName.split(',')[0].toLowerCase();
      const hasCityRefInMonths = hasMonths && cachedReading.months.some(m =>
        (m.text  && m.text.toLowerCase().includes(cityRef)) ||
        (m.theme && m.theme.toLowerCase().includes(cityRef))
      );
      if (hasMonths && !hasCityRefInMonths) {
        return res.json({
          ...existing,
          srData: JSON.parse(existing.sr_data),
          reading: cachedReading,
        });
      }
    }

    // Atomically reserve a usage slot before calling Claude
    const limit = await reserveUsage(req.user, 'solar_return');
    if (!limit.allowed) {
      return res.status(402).json({
        error: `You've used all ${limit.limit} free readings.`,
        limitReached: true, used: limit.used, limit: limit.limit,
      });
    }

    // Calculate solar return + relocated chart
    const srData         = calculateSolarReturn(chart, city, year);
    const relocatedChart = calculateRelocatedChart(chart, city);

    // Generate AI reading
    const reading = await generateSolarReturnReading(chart, city, srData, relocatedChart);

    // Persist
    const { rows: inserted } = await pool.query(
      `INSERT INTO solar_returns (chart_id, city_name, city_lat, city_lng, return_year, return_date, sr_data, reading)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [chartId, city.displayName, city.lat, city.lng,
       year, srData.srDate, JSON.stringify(srData), JSON.stringify(reading)]
    );
    const row = inserted[0];
    res.status(201).json({
      ...row,
      srData,
      reading,
    });
  } catch (err) {
    console.error('Solar return error:', err);
    res.status(500).json({ error: 'Failed to generate solar return reading' });
  }
});

export default router;
