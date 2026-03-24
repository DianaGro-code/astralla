import { Router } from 'express';
import { searchCities } from '../services/geocoding.js';

const router = Router();

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  try {
    const results = await searchCities(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
