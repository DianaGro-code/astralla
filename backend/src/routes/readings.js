import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { calculateInfluences } from '../services/astro/astrocarto.js';
import { calculateRelocatedChart } from '../services/astro/relocatedChart.js';
import { generateReading } from '../services/claude.js';
import { checkLimit, logUsage } from '../services/usageLimit.js';

const router = express.Router();
router.use(requireAuth);

// Generate a new reading for a chart + city
router.post('/', async (req, res) => {
  const { chartId, cityQuery, intent } = req.body;
  if (!chartId || !cityQuery) {
    return res.status(400).json({ error: 'chartId and cityQuery are required' });
  }

  const db = getDb();
  const chart = db.prepare(
    'SELECT * FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(chartId, req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  try {
    // Geocode the target city
    const city = await geocode(cityQuery);
    if (!city) return res.status(400).json({ error: `Could not find city: "${cityQuery}"` });

    // Return existing reading if one already exists for this chart + city (solo readings only)
    const existing = db.prepare(
      'SELECT * FROM readings WHERE chart_id = ? AND city_name = ? AND partner_chart_id IS NULL ORDER BY created_at DESC LIMIT 1'
    ).get(chartId, city.displayName);
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

    // Check weekly limit before calling Claude
    const limit = checkLimit(req.user);
    if (!limit.allowed) {
      return res.status(402).json({
        error: `You've used all ${limit.limit} free readings this week.`,
        limitReached: true, used: limit.used, limit: limit.limit, resetsOn: limit.resetsOn,
      });
    }

    // Generate AI reading (returns themes object)
    const themes = await generateReading(chart, city, influences, parans, intent, relocatedChart);
    logUsage(req.user.id, 'city_reading');

    // Persist
    const result = db.prepare(
      `INSERT INTO readings (chart_id, city_name, city_lat, city_lng, influences, parans, reading_text, themes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      chartId,
      city.displayName,
      city.lat,
      city.lng,
      JSON.stringify(influences),
      JSON.stringify(parans),
      '',
      JSON.stringify(themes)
    );

    const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...reading,
      influences: JSON.parse(reading.influences),
      parans: JSON.parse(reading.parans),
      themes,
    });
  } catch (err) {
    console.error('Reading generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate reading' });
  }
});

// Get all readings for the current user (for map view)
router.get('/all', (req, res) => {
  const db = getDb();
  const readings = db.prepare(`
    SELECT r.id, r.city_name, r.city_lat, r.city_lng, r.themes, r.created_at, r.chart_id
    FROM readings r
    JOIN birth_charts c ON c.id = r.chart_id
    WHERE c.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);

  res.json(readings.map(r => ({
    ...r,
    themes: r.themes ? JSON.parse(r.themes) : null,
  })));
});

// Get all readings for a chart
router.get('/chart/:chartId', (req, res) => {
  const db = getDb();
  const chart = db.prepare(
    'SELECT id FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(req.params.chartId, req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  const readings = db.prepare(
    'SELECT * FROM readings WHERE chart_id = ? AND (partner_chart_id IS NULL) ORDER BY created_at DESC'
  ).all(req.params.chartId);

  res.json(readings.map(r => ({
    ...r,
    influences: JSON.parse(r.influences),
    parans: JSON.parse(r.parans),
    themes: r.themes ? JSON.parse(r.themes) : null,
  })));
});

// Get single reading
router.get('/:id', (req, res) => {
  const db = getDb();
  const reading = db.prepare(`
    SELECT r.*, c.birth_time, c.label as chart_label FROM readings r
    JOIN birth_charts c ON c.id = r.chart_id
    WHERE r.id = ? AND c.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!reading) return res.status(404).json({ error: 'Reading not found' });
  res.json({
    ...reading,
    influences: JSON.parse(reading.influences),
    parans: JSON.parse(reading.parans),
    themes: reading.themes ? JSON.parse(reading.themes) : null,
  });
});

export default router;
