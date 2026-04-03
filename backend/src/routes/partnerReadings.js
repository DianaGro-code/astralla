import express from 'express';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { geocode } from '../services/geocoding.js';
import { calculateInfluences } from '../services/astro/astrocarto.js';
import { generatePartnerReading } from '../services/claude.js';
import { reserveUsage } from '../services/usageLimit.js';

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { chartId1, chartId2, cityQuery } = req.body;
  if (!chartId1 || !chartId2 || !cityQuery) {
    return res.status(400).json({ error: 'chartId1, chartId2, and cityQuery are required' });
  }
  if (chartId1 === chartId2) {
    return res.status(400).json({ error: 'Partner reading requires two different charts' });
  }

  const pool = getDb();
  const { rows: rows1 } = await pool.query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [chartId1, req.user.id]
  );
  const chart1 = rows1[0];
  if (!chart1) return res.status(404).json({ error: 'Chart 1 not found' });

  const { rows: rows2 } = await pool.query(
    'SELECT * FROM birth_charts WHERE id = $1 AND user_id = $2',
    [chartId2, req.user.id]
  );
  const chart2 = rows2[0];
  if (!chart2) return res.status(404).json({ error: 'Chart 2 not found' });

  try {
    const city = await geocode(cityQuery);
    if (!city) return res.status(400).json({ error: `Could not find city: "${cityQuery}"` });

    // Atomically reserve a usage slot before calling Claude
    const limit = await reserveUsage(req.user, 'partner_reading');
    if (!limit.allowed) {
      return res.status(402).json({
        error: `You've used all ${limit.limit} free readings.`,
        limitReached: true, used: limit.used, limit: limit.limit,
      });
    }

    const { influences: influences1, parans: parans1 } = calculateInfluences(chart1, city);
    const { influences: influences2, parans: parans2 } = calculateInfluences(chart2, city);

    const themes = await generatePartnerReading(chart1, chart2, city, influences1, parans1, influences2, parans2);

    // Combine both charts' influences for storage
    const allInfluences = [
      ...influences1.map(i => ({ ...i, chartId: chartId1 })),
      ...influences2.map(i => ({ ...i, chartId: chartId2 })),
    ];
    const allParans = [
      ...parans1.map(p => ({ ...p, chartId: chartId1 })),
      ...parans2.map(p => ({ ...p, chartId: chartId2 })),
    ];

    const { rows: inserted } = await pool.query(
      `INSERT INTO readings (chart_id, city_name, city_lat, city_lng, influences, parans, reading_text, themes, partner_chart_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [chartId1, city.displayName, city.lat, city.lng,
       JSON.stringify(allInfluences), JSON.stringify(allParans), '', JSON.stringify(themes), chartId2]
    );
    const reading = inserted[0];
    res.status(201).json({
      ...reading,
      influences: JSON.parse(reading.influences),
      parans: JSON.parse(reading.parans),
      themes,
    });
  } catch (err) {
    console.error('Partner reading error:', err);
    res.status(500).json({ error: 'Failed to generate partner reading' });
  }
});

export default router;
