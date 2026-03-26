/**
 * Travel Transits calculation.
 *
 * For a travel date range at a city:
 *   1. Transiting planet lines through the city (same math as natal astrocarto
 *      but using sky positions for each day of the trip).
 *   2. Transit-to-natal aspects (transiting ecliptic lon → natal ecliptic lon).
 *
 * Returns a compact summary suitable for passing to an AI reading prompt.
 */

import { find as findTimezone } from 'geo-tz';
import { DateTime } from 'luxon';
import {
  julianDay, gmst, normalize360, normalize180, toRad, toDeg,
} from './core.js';
import { getAllPositions } from './planets.js';

const PLANET_NAMES = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];

const PLANET_LABELS = {
  sun:'Sun', moon:'Moon', mercury:'Mercury', venus:'Venus', mars:'Mars',
  jupiter:'Jupiter', saturn:'Saturn', uranus:'Uranus', neptune:'Neptune', pluto:'Pluto',
};

// Aspect definitions used for transit-to-natal checks
const ASPECTS = [
  { name: 'conjunction', angle: 0,   orb: 3,   symbol: '☌' },
  { name: 'opposition',  angle: 180, orb: 3,   symbol: '☍' },
  { name: 'trine',       angle: 120, orb: 2.5, symbol: '△' },
  { name: 'square',      angle: 90,  orb: 2.5, symbol: '□' },
  { name: 'sextile',     angle: 60,  orb: 2,   symbol: '⚹' },
];

// Higher = more significant in the reading (outer planets matter more)
const PLANET_WEIGHT = {
  pluto:5, neptune:5, uranus:4, saturn:4, jupiter:3,
  mars:2, sun:2, venus:1, mercury:1, moon:0,
};

// We skip the Moon as a transiting planet (moves too fast for multi-day trips)
const SKIP_TRANSIT = new Set(['moon']);

// ── Inline helpers (mirror of astrocarto.js private functions) ────────────────

function birthChartToJDE(chart) {
  const [year, month, day] = chart.birth_date.split('-').map(Number);
  const [hour, minute]     = chart.birth_time.split(':').map(Number);
  const tzNames = findTimezone(chart.birth_lat, chart.birth_lng);
  const tz = tzNames[0] || 'UTC';
  const local = DateTime.fromObject({ year, month, day, hour, minute }, { zone: tz });
  const utc   = local.toUTC();
  return julianDay(utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second);
}

function dateStrToJDE(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return julianDay(y, m, d, 12, 0, 0); // noon UTC sample
}

function mcLineLng(raDeg, gmstDeg) {
  return normalize180(raDeg - gmstDeg);
}

function acLineLng(raDeg, decDeg, latDeg, gmstDeg) {
  const tp = Math.tan(toRad(latDeg)) * Math.tan(toRad(decDeg));
  if (Math.abs(tp) > 1) return null;
  return normalize180(raDeg - toDeg(Math.acos(-tp)) - gmstDeg);
}

function dcLineLng(raDeg, decDeg, latDeg, gmstDeg) {
  const tp = Math.tan(toRad(latDeg)) * Math.tan(toRad(decDeg));
  if (Math.abs(tp) > 1) return null;
  return normalize180(raDeg + toDeg(Math.acos(-tp)) - gmstDeg);
}

function lngDist(a, b) {
  return Math.abs(normalize180(a - b));
}

function findAspect(lon1, lon2) {
  const diff  = normalize360(lon1 - lon2);
  const angle = diff > 180 ? 360 - diff : diff;
  for (const asp of ASPECTS) {
    const orb = Math.abs(angle - asp.angle);
    if (orb <= asp.orb) return { ...asp, exactOrb: orb };
  }
  return null;
}

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
function toZodiac(lon) {
  const l = normalize360(lon);
  return `${Math.floor(l % 30)}° ${SIGNS[Math.floor(l / 30)]}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Calculate transit influences for a travel window.
 *
 * @param {object} chart  – birth chart row from DB
 * @param {object} city   – { lat, lng, displayName }
 * @param {string} startDate – "YYYY-MM-DD"
 * @param {string} endDate   – "YYYY-MM-DD"
 */
export function calculateTransits(chart, city, startDate, endDate) {
  // ── 1. Natal positions ──────────────────────────────────────────────────────
  const birthJDE      = birthChartToJDE(chart);
  const natalPos      = getAllPositions(birthJDE);
  const natalZodiac   = Object.fromEntries(
    PLANET_NAMES.map(p => [p, toZodiac(natalPos[p].lon)])
  );

  // ── 2. Build sampling dates ─────────────────────────────────────────────────
  const startJDE  = dateStrToJDE(startDate);
  const endJDE    = dateStrToJDE(endDate);
  const totalDays = Math.max(1, Math.round(endJDE - startJDE));
  // Sample at most every 3 days; always include start + end
  const step  = Math.max(1, Math.floor(totalDays / Math.min(30, totalDays)));
  const dates = [];
  for (let d = 0; d <= totalDays; d += step) dates.push(startJDE + d);
  if (dates[dates.length - 1] < endJDE) dates.push(endJDE);

  // ── 3. Accumulators ─────────────────────────────────────────────────────────
  // Transit-to-natal aspects: keep best (tightest) occurrence per key
  const aspectMap = new Map();
  // Transiting lines through city: keep tightest distance per key
  const lineMap   = new Map();

  for (const jde of dates) {
    const tPos    = getAllPositions(jde);
    const gmstDeg = gmst(jde);

    // Calendar date label for this sample
    const ms = Date.UTC(2000, 0, 1) + (jde - 2451545.0) * 86400000;
    const dateLabel = new Date(ms).toISOString().slice(0, 10);

    for (const tp of PLANET_NAMES) {
      if (SKIP_TRANSIT.has(tp)) continue;
      const pos = tPos[tp];

      // ── transit-to-natal aspects ──────────────────────────────────────────
      for (const np of PLANET_NAMES) {
        const asp = findAspect(pos.lon, natalPos[np].lon);
        if (!asp) continue;
        const key = `${tp}|${np}|${asp.name}`;
        const existing = aspectMap.get(key);
        if (!existing || asp.exactOrb < existing.exactOrb) {
          aspectMap.set(key, {
            transitPlanet: tp,  transitLabel: PLANET_LABELS[tp],
            natalPlanet:   np,  natalLabel:   PLANET_LABELS[np],
            aspect: asp.name,   symbol: asp.symbol,
            exactOrb: asp.exactOrb,
            peakDate: dateLabel,
            weight: (PLANET_WEIGHT[tp] || 1) + (PLANET_WEIGHT[np] || 1),
          });
        }
      }

      // ── transiting planet lines through city ──────────────────────────────
      const lngMC = mcLineLng(pos.ra, gmstDeg);
      const lngIC = normalize180(lngMC + 180);
      const lngAC = acLineLng(pos.ra, pos.dec, city.lat, gmstDeg);
      const lngDC = dcLineLng(pos.ra, pos.dec, city.lat, gmstDeg);

      for (const [angle, lng] of [['MC',lngMC],['IC',lngIC],['AC',lngAC],['DC',lngDC]]) {
        if (lng === null) continue;
        const dist = lngDist(city.lng, lng);
        if (dist >= 12) continue;
        const key = `${tp}|${angle}`;
        const existing = lineMap.get(key);
        if (!existing || dist < existing.distance) {
          lineMap.set(key, {
            planet: tp, planetLabel: PLANET_LABELS[tp],
            angle, distance: dist,
            peakDate: dateLabel,
            weight: PLANET_WEIGHT[tp] || 1,
          });
        }
      }
    }
  }

  // ── 4. Sort, filter, return ─────────────────────────────────────────────────
  const aspects = [...aspectMap.values()]
    .sort((a, b) => (b.weight - a.weight) || (a.exactOrb - b.exactOrb))
    .slice(0, 18);

  const lines = [...lineMap.values()]
    .sort((a, b) => (b.weight - a.weight) || (a.distance - b.distance))
    .slice(0, 10);

  return { aspects, lines, natalZodiac, startDate, endDate, totalDays };
}
