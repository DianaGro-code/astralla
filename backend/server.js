import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { initDb } from './src/db/database.js';
import { requireAuth } from './src/middleware/auth.js';
import { getUsage } from './src/services/usageLimit.js';
import authRoutes from './src/routes/auth.js';
import chartsRoutes from './src/routes/charts.js';
import readingsRoutes from './src/routes/readings.js';
import geocodingRoutes from './src/routes/geocoding.js';
import topCitiesRoutes from './src/routes/topCities.js';
import transitsRoutes from './src/routes/transits.js';
import solarReturnsRoutes from './src/routes/solarReturns.js';
import weeklyRoutes from './src/routes/weekly.js';
import partnerReadingsRoutes from './src/routes/partnerReadings.js';
import adminRoutes from './src/routes/admin.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // Railway sits behind a proxy
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Allow the web deployment + Capacitor native apps (iOS: capacitor://localhost, Android: https://localhost)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'capacitor://localhost',   // iOS Capacitor
  'https://localhost',       // Android Capacitor
  ...(isProd ? [] : ['http://localhost:5173']),
].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/charts', chartsRoutes);
app.use('/api/readings/partner', partnerReadingsRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/geocode', geocodingRoutes);
app.use('/api/top-cities', topCitiesRoutes);
app.use('/api/transits', transitsRoutes);
app.use('/api/solar-returns', solarReturnsRoutes);
app.use('/api/weekly', weeklyRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/privacy', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — Astralla</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; color: #1a1a2e; line-height: 1.7; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; }
    p, li { font-size: 0.95rem; color: #333; }
    a { color: #4a6fa5; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p><em>Last updated: April 3, 2026</em></p>
  <p>Astralla ("we", "us", or "our") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.</p>

  <h2>1. Information We Collect</h2>
  <ul>
    <li><strong>Account data:</strong> email address and name when you register.</li>
    <li><strong>Birth data:</strong> date, time, and place of birth — used solely to calculate your astrological chart.</li>
    <li><strong>Usage data:</strong> cities and reading types you request, to enforce free-tier limits and improve the service.</li>
    <li><strong>Subscription data:</strong> managed via RevenueCat; we receive only a customer identifier, not payment details.</li>
  </ul>

  <h2>2. How We Use Your Data</h2>
  <ul>
    <li>To generate and store your astrocartography readings.</li>
    <li>To enforce the free-tier reading limit and process subscription upgrades.</li>
    <li>To communicate important account or service updates.</li>
  </ul>

  <h2>3. Data Sharing</h2>
  <p>We do not sell your data. We share data only with the following service providers, solely to operate the app:</p>
  <ul>
    <li><strong>Railway</strong> — cloud hosting for our backend API.</li>
    <li><strong>Supabase</strong> — database storage for charts and readings.</li>
    <li><strong>OpenAI</strong> — generates the text of your readings. Birth data and city are sent for this purpose.</li>
    <li><strong>RevenueCat</strong> — if you subscribe to Astralla Premium, subscription status is managed here.</li>
  </ul>

  <h2>4. Data Retention</h2>
  <p>Your account and readings are stored until you delete your account. You may request deletion at any time by emailing us.</p>

  <h2>5. Security</h2>
  <p>All data is transmitted over HTTPS. Passwords are hashed and never stored in plain text.</p>

  <h2>6. Children</h2>
  <p>Astralla is not directed at children under 13. We do not knowingly collect data from children.</p>

  <h2>7. Contact</h2>
  <p>Questions? Email us at <a href="mailto:hello@astralla.app">hello@astralla.app</a></p>
</body>
</html>`);
});
app.get('/api/usage', requireAuth, async (req, res) => res.json(await getUsage(req.user.id)));
app.use('/api/admin', adminRoutes);

// Serve frontend in production
if (isProd) {
  const dist = join(__dirname, '../frontend/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
  }
}

async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`Astrocartography server running on port ${PORT}`));
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
