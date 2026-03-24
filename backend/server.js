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

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({ origin: isProd ? false : (process.env.FRONTEND_URL || 'http://localhost:5173') }));
app.use(express.json());

initDb();

app.use('/api/auth', authRoutes);
app.use('/api/charts', chartsRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/geocode', geocodingRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve frontend in production
if (isProd) {
  const dist = join(__dirname, '../frontend/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
  }
}

app.listen(PORT, () => console.log(`Astrocartography server running on port ${PORT}`));
