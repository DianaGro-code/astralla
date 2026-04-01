import { Router } from 'express';
import { searchCities } from '../services/geocoding.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/search', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  try {
    const results = await searchCities(q);
    res.json(results);
  } catch {
    res.status(500).json({ error: 'City search failed' });
  }
});

// GET /api/geocode/ip — detect approximate city from the client's IP address.
// Uses ipwho.is (free, HTTPS, no key required). Returns null for local IPs.
router.get('/ip', requireAuth, async (req, res) => {
  try {
    // Railway (and most proxies) put the real IP in X-Forwarded-For
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress;

    // Can't geolocate loopback or RFC-1918 addresses (local dev)
    const isLocal = !rawIp
      || rawIp === '127.0.0.1'
      || rawIp === '::1'
      || rawIp.startsWith('192.168.')
      || rawIp.startsWith('10.')
      || /^172\.(1[6-9]|2\d|3[01])\./.test(rawIp);

    if (isLocal) return res.json(null);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    const response = await fetch(`https://ipwho.is/${rawIp}`, { signal: ac.signal });
    clearTimeout(timer);
    const data = await response.json();

    if (!data.success || !data.city) return res.json(null);

    res.json({
      displayName: `${data.city}, ${data.country}`,
      lat: data.latitude,
      lng: data.longitude,
    });
  } catch {
    res.json(null); // never crash — just return null so the frontend falls back gracefully
  }
});

export default router;
