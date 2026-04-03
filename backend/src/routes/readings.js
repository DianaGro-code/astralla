import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { calculateInfluences } from '../services/astro/astrocarto.js';
import { calculateRelocatedChart } from '../services/astro/relocatedChart.js';
import { generateReading } from '../services/claude.js';
import { reserveUsage } from '../services/usageLimit.js';

const router = express.Router();
router.use(requireAuth);

// Generate a new reading for a chart + city
router.post('/', async (req, res) => {
  const { chartId, cityQuery, intent } = req.body;
  if (!chartId || !cityQuery) {
    return res.status(400).json({ error: 'chartId and cityQuery are required' });
  }

  const pool = getDb();
  const { rows: chartRows } = await pool.query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [chartId, req.user.id]
  );
  const chart = chartRows[0];
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  try {
    // Geocode the target city
    const city = await geocode(cityQuery);
    if (!city) return res.status(400).json({ error: `Could not find city: "${cityQuery}"` });

    // Return existing reading if one already exists for this chart + city (solo readings only)
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM readings WHERE chart_id = $1 AND city_name = $2 AND partner_chart_id IS NULL ORDER BY created_at DESC LIMIT 1',
      [chartId, city.displayName]
    );
    const existing = existingRows[0];
    if (existing) {
      return res.status(200).json({
        ...existing,
        influences: JSON.parse(existing.influences),
        parans: JSON.parse(existing.parans),
        themes: existing.themes ? JSON.parse(existing.themes) : null,
      });
    }

    // Calculate planetary influences + parans + relocated chart
    const { influences, parans } = calculateInfluences(chart, city);
    const relocatedChart = calculateRelocatedChart(chart, city);

    if (influences.length === 0 && parans.length === 0) {
      return res.status(200).json({
        influences: [],
        parans: [],
        readingText: `No significant planetary lines pass through ${city.displayName} for this birth chart. This doesn't mean the city is without energy — it may simply be a more neutral canvas, allowing you to project your natal chart more purely without strong geographic amplification.`,
        cityName: city.displayName,
        cityLat: city.lat,
        cityLng: city.lng,
        chartId,
        id: null,
        createdAt: new Date().toISOString()
      });
    }

    // Atomically reserve a usage slot before calling Claude
    const limit = await reserveUsage(req.user, 'city_reading');
    if (!limit.allowed) {
      return res.status(402).json({
        error: `You've used all ${limit.limit} free readings.`,
        limitReached: true, used: limit.used, limit: limit.limit,
      });
    }

    // Generate AI reading (returns themes object)
    const themes = await generateReading(chart, city, influences, parans, intent, relocatedChart);

    // Persist
    const { rows: inserted } = await pool.query(
      `INSERT INTO readings (chart_id, city_name, city_lat, city_lng, influences, parans, reading_text, themes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [chartId, city.displayName, city.lat, city.lng,
       JSON.stringify(influences), JSON.stringify(parans), '', JSON.stringify(themes)]
    );
    const reading = inserted[0];
    res.status(201).json({
      ...reading,
      influences: JSON.parse(reading.influences),
      parans: JSON.parse(reading.parans),
      themes,
    });
  } catch (err) {
    console.error('Reading generation error:', err);
    res.status(500).json({ error: 'Failed to generate reading' });
  }
});

// Get all readings for the current user (for map view)
router.get('/all', async (req, res) => {
  try {
    const { rows } = await getDb().query(
      `SELECT r.id, r.city_name, r.city_lat, r.city_lng, r.themes, r.created_at, r.chart_id
       FROM readings r
       JOIN birth_charts c ON c.id = r.chart_id
       WHERE c.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(r => ({
      ...r,
      themes: r.themes ? JSON.parse(r.themes) : null,
    })));
  } catch (err) {
    console.error('Error fetching all readings:', err);
    res.status(500).json({ error: 'Failed to load readings' });
  }
});

// Get all readings for a chart
router.get('/chart/:chartId', async (req, res) => {
  try {
    const pool = getDb();
    const { rows: chartRows } = await pool.query(
      'SELECT id FROM birth_charts WHERE id = $1 AND user_id = $2',
      [req.params.chartId, req.user.id]
    );
    if (!chartRows[0]) return res.status(404).json({ error: 'Chart not found' });

    const { rows } = await pool.query(
      'SELECT * FROM readings WHERE chart_id = $1 AND (partner_chart_id IS NULL) ORDER BY created_at DESC',
      [req.params.chartId]
    );
    res.json(rows.map(r => ({
      ...r,
      influences: JSON.parse(r.influences),
      parans: JSON.parse(r.parans),
      themes: r.themes ? JSON.parse(r.themes) : null,
    })));
  } catch (err) {
    console.error('Error fetching chart readings:', err);
    res.status(500).json({ error: 'Failed to load readings' });
  }
});

// Get single reading
router.get('/:id', async (req, res) => {
  const { rows } = await getDb().query(
    `SELECT r.*, c.birth_time, c.label as chart_label FROM readings r
     JOIN birth_charts c ON c.id = r.chart_id
     WHERE r.id = $1 AND c.user_id = $2`,
    [req.params.id, req.user.id]
  );
  const reading = rows[0];
  if (!reading) return res.status(404).json({ error: 'Reading not found' });
  res.json({
    ...reading,
    influences: JSON.parse(reading.influences),
    parans: JSON.parse(reading.parans),
    themes: reading.themes ? JSON.parse(reading.themes) : null,
  });
});

export default router;
