/**
 * Solar Return calculation.
 *
 * A Solar Return (SR) chart is cast for the exact moment the Sun returns to
 * its natal ecliptic longitude in a given year. When cast at a specific city,
 * it shows how that location will colour the native's year.
 *
 * Algorithm:
 *   1. Find the natal Sun longitude from the birth chart.
 *   2. Binary-search for the JDE when the transiting Sun reaches that longitude
 *      in the target year (starting ±5 days around the birthday).
 *   3. Cast the SR chart at the city: all planet positions + which lines pass
 *      through the city at that moment.
 *   4. Calculate SR-to-natal aspects (ecliptic longitude).
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

const ASPECTS = [
  { name: 'conjunction', angle: 0,   orb: 3,   symbol: '☌' },
  { name: 'opposition',  angle: 180, orb: 3,   symbol: '☍' },
  { name: 'trine',       angle: 120, orb: 2.5, symbol: '△' },
  { name: 'square',      angle: 90,  orb: 2.5, symbol: '□' },
  { name: 'sextile',     angle: 60,  orb: 2,   symbol: '⚹' },
];

const PLANET_WEIGHT = {
  pluto:5, neptune:5, uranus:4, saturn:4, jupiter:3,
  mars:2, sun:2, venus:1, mercury:1, moon:1,
};

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function birthChartToJDE(chart) {
  const [year, month, day] = chart.birth_date.split('-').map(Number);
  const [hour, minute]     = chart.birth_time.split(':').map(Number);
  const tz = (findTimezone(chart.birth_lat, chart.birth_lng)[0]) || 'UTC';
  const local = DateTime.fromObject({ year, month, day, hour, minute }, { zone: tz });
  const utc   = local.toUTC();
  return julianDay(utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second);
}

function toZodiac(lon) {
  const l = normalize360(lon);
  return `${Math.floor(l % 30)}° ${SIGNS[Math.floor(l / 30)]}`;
}

function mcLineLng(raDeg, gmstDeg)  { return normalize180(raDeg - gmstDeg); }

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

function lngDist(a, b) { return Math.abs(normalize180(a - b)); }

function findAspect(lon1, lon2) {
  const diff  = normalize360(lon1 - lon2);
  const angle = diff > 180 ? 360 - diff : diff;
  for (const asp of ASPECTS) {
    const orb = Math.abs(angle - asp.angle);
    if (orb <= asp.orb) return { ...asp, exactOrb: orb };
  }
  return null;
}

/**
 * Binary-search for the JDE when the Sun reaches natalSunLon.
 * Searches within [lo, hi] Julian Days.
 */
function binarySearchSolarReturn(natalSunLon, lo, hi) {
  for (let i = 0; i < 80; i++) {
    const mid    = (lo + hi) / 2;
    const sunLon = getAllPositions(mid).sun.lon;
    const diff   = normalize180(sunLon - natalSunLon);
    if (Math.abs(diff) < 0.00005) return mid; // ~4 seconds accuracy
    if (diff > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Calculate the Solar Return chart for a given year and city.
 *
 * @param {object} chart      – birth chart DB row
 * @param {object} city       – { lat, lng, displayName }
 * @param {number} targetYear – calendar year of the SR (e.g. 2025)
 */
export function calculateSolarReturn(chart, city, targetYear) {
  // ── 1. Natal data ───────────────────────────────────────────────────────────
  const birthJDE   = birthChartToJDE(chart);
  const natalPos   = getAllPositions(birthJDE);
  const natalSunLon = natalPos.sun.lon;

  // ── 2. Binary search for SR moment ─────────────────────────────────────────
  const [, bMonth, bDay] = chart.birth_date.split('-').map(Number);
  const midpoint = julianDay(targetYear, bMonth, bDay, 12, 0, 0);
  const srJDE    = binarySearchSolarReturn(natalSunLon, midpoint - 5, midpoint + 5);

  // ── 3. SR planet positions ──────────────────────────────────────────────────
  const srPos    = getAllPositions(srJDE);
  const gmstDeg  = gmst(srJDE);

  // ── 4. SR planet lines through city ────────────────────────────────────────
  const srInfluences = [];
  for (const planet of PLANET_NAMES) {
    const pos = srPos[planet];

    const lngMC = mcLineLng(pos.ra, gmstDeg);
    const lngIC = normalize180(lngMC + 180);
    const lngAC = acLineLng(pos.ra, pos.dec, city.lat, gmstDeg);
    const lngDC = dcLineLng(pos.ra, pos.dec, city.lat, gmstDeg);

    for (const [angle, lng] of [['MC',lngMC],['IC',lngIC],['AC',lngAC],['DC',lngDC]]) {
      if (lng === null) continue;
      const dist = lngDist(city.lng, lng);
      if (dist < 15) {
        srInfluences.push({
          planet, planetLabel: PLANET_LABELS[planet],
          angle, distance: dist,
          weight: PLANET_WEIGHT[planet] || 1,
        });
      }
    }
  }
  srInfluences.sort((a, b) => (b.weight - a.weight) || (a.distance - b.distance));

  // ── 5. SR-to-natal aspects ──────────────────────────────────────────────────
  const srToNatal = [];
  for (const sp of PLANET_NAMES) {
    for (const np of PLANET_NAMES) {
      if (sp === np) continue;
      const asp = findAspect(srPos[sp].lon, natalPos[np].lon);
      if (asp && asp.exactOrb <= 3) {
        srToNatal.push({
          srPlanet:    sp, srLabel:    PLANET_LABELS[sp],
          natalPlanet: np, natalLabel: PLANET_LABELS[np],
          aspect: asp.name, symbol: asp.symbol,
          exactOrb: asp.exactOrb,
          weight: (PLANET_WEIGHT[sp] || 1) + (PLANET_WEIGHT[np] || 1),
        });
      }
    }
  }
  srToNatal.sort((a, b) => (b.weight - a.weight) || (a.exactOrb - b.exactOrb));

  // ── 6. SR planet positions in zodiac ───────────────────────────────────────
  const srPlanets = PLANET_NAMES.map(p => ({
    planet: p, label: PLANET_LABELS[p],
    zodiac: toZodiac(srPos[p].lon),
    lon: srPos[p].lon,
  }));

  // ── 7. Natal planet zodiac ──────────────────────────────────────────────────
  const natalPlanets = PLANET_NAMES.map(p => ({
    planet: p, label: PLANET_LABELS[p],
    zodiac: toZodiac(natalPos[p].lon),
    lon: natalPos[p].lon,
  }));

  // ── 8. Convert SR JDE → human-readable local time at city ──────────────────
  const utcMs   = Date.UTC(2000, 0, 1) + (srJDE - 2451545.0) * 86400000;
  const utcDt   = new Date(utcMs).toISOString();
  const tz      = (findTimezone(city.lat, city.lng)[0]) || 'UTC';
  const localDt = DateTime.fromISO(utcDt, { zone: tz });
  const srLocalDate = localDt.toFormat("MMMM d, yyyy 'at' HH:mm");

  return {
    targetYear,
    srDate:       utcDt.slice(0, 10),
    srLocalDate,
    srPlanets,
    natalPlanets,
    srInfluences: srInfluences.slice(0, 10),
    srToNatal:    srToNatal.slice(0, 20),
  };
}
