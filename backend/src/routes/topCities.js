import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { WORLD_CITIES, scoreCity } from '../services/worldCities.js';
import { calculateInfluences } from '../services/astro/astrocarto.js';
import { generateTopCitiesReading } from '../services/claude.js';
import { reserveUsage } from '../services/usageLimit.js';

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { chartId, intent, region } = req.body;
  if (!chartId || !intent) {
    return res.status(400).json({ error: 'chartId and intent are required' });
  }

  const pool = getDb();
  const { rows: chartRows } = await pool.query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [chartId, req.user.id]
  );
  const chart = chartRows[0];
  if (!chart) return res.status(404).json({ error: 'Chart not found' });

  try {
    // Atomically reserve a usage slot before the expensive scoring work
    const limit = await reserveUsage(req.user, 'top_cities');
    if (!limit.allowed) {
      return res.status(402).json({
        error: `You've used all ${limit.limit} free readings.`,
        limitReached: true, used: limit.used, limit: limit.limit,
      });
    }

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

    // Sort descending, then keep only the strongest city per country
    scored.sort((a, b) => b.score - a.score);
    const seenCountries = new Set();
    const deduped = [];
    for (const entry of scored) {
      const country = entry.city.name.split(', ').pop();
      if (seenCountries.has(country)) continue;
      seenCountries.add(country);
      deduped.push(entry);
      if (deduped.length === 3) break;
    }
    const top3 = deduped;

    // Generate readings for all 3 in one Claude call
    const cities = await generateTopCitiesReading(chart, top3, intent);

    res.json({ cities });
  } catch (err) {
    console.error('Top cities error:', err);
    res.status(500).json({ error: 'Failed to find top cities' });
  }
});

export default router;
