import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { WORLD_CITIES, scoreCity } from '../services/worldCities.js';
import { calculateInfluences } from '../services/astro/astrocarto.js';
import { generateTopCitiesReading } from '../services/claude.js';

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { chartId, intent, region } = req.body;
  if (!chartId || !intent) {
    return res.status(400).json({ error: 'chartId and intent are required' });
  }

  const db = getDb();
  const chart = db.prepare(
    'SELECT * FROM birth_charts WHERE id = ? AND user_id = ?'
  ).get(chartId, req.user.id);
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  try {
    // Filter by region if provided
    const cityPool = (region && region !== 'worldwide')
      ? WORLD_CITIES.filter(c => c.region === region)
      : WORLD_CITIES;

    // Score every city in pool for this chart + intent
    const scored = cityPool.map(city => {
      const { influences, parans } = calculateInfluences(chart, city);
      const score = scoreCity(influences, intent);
      return { city, influences, parans, score };
    });

    // Sort descending, take top 3 with any activation
    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3);

    // Generate readings for all 3 in one Claude call
    const cities = await generateTopCitiesReading(chart, top3, intent);

    res.json({ cities });
  } catch (err) {
    console.error('Top cities error:', err);
    res.status(500).json({ error: err.message || 'Failed to find top cities' });
  }
});

export default router;
