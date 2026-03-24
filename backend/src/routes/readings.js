import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { calculateInfluences } from '../services/astro/astrocarto.js';
import { generateReading } from '../services/claude.js';

const router = express.Router();
router.use(requireAuth);

// Generate a new reading for a chart + city
router.post('/', async (req, res) => {
  const { chartId, cityQuery } = req.body;
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

    // Calculate planetary influences + parans
    const { influences, parans } = calculateInfluences(chart, city);

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

    // Generate AI reading (returns themes object)
    const themes = await generateReading(chart, city, influences, parans);

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

// Get all readings for a chart
router.get('/chart/:chartId', (req, res) => {
  const db = getDb();
  const chart = db.prepare(
    'SELECT id FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(req.params.chartId, req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  const readings = db.prepare(
    'SELECT * FROM readings WHERE chart_id = ? ORDER BY created_at DESC'
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
    SELECT r.* FROM readings r
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
