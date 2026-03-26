import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { initDb } from './src/db/database.js';
import authRoutes from './src/routes/auth.js';
import chartsRoutes from './src/routes/charts.js';
import readingsRoutes from './src/routes/readings.js';
import geocodingRoutes from './src/routes/geocoding.js';
import topCitiesRoutes from './src/routes/topCities.js';
import transitsRoutes from './src/routes/transits.js';
import solarReturnsRoutes from './src/routes/solarReturns.js';
import weeklyRoutes from './src/routes/weekly.js';
import adminRoutes from './src/routes/admin.js';

dotenv.config({ override: true });

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
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

initDb();

app.use('/api/auth', authRoutes);
app.use('/api/charts', chartsRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/geocode', geocodingRoutes);
app.use('/api/top-cities', topCitiesRoutes);
app.use('/api/transits', transitsRoutes);
app.use('/api/solar-returns', solarReturnsRoutes);
app.use('/api/weekly', weeklyRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/admin', adminRoutes);

// Serve frontend in production
if (isProd) {
  const dist = join(__dirname, '../frontend/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
  }
}

app.listen(PORT, () => console.log(`Astrocartography server running on port ${PORT}`));
