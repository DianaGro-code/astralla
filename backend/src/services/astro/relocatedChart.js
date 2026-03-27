/**
 * Relocated Birth Chart calculations.
 *
 * A relocated chart keeps the same moment in time as the natal chart
 * (same planetary positions), but recasts the Ascendant and house cusps
 * for a different geographic location.
 *
 * This tells us which life areas (houses) each natal planet activates
 * in a given city — far more specific than line proximity alone.
 *
 * House system: Whole Sign (simplest, widely used, very readable).
 * Angles: MC and ASC via standard Meeus formulas.
 */

import { find as findTimezone } from 'geo-tz';
import { DateTime } from 'luxon';
import {
  julianDay, lst, normalize360, toDeg, toRad,
  trueObliquity, julianCenturies,
} from './core.js';
import { getAllPositions } from './planets.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

const HOUSE_MEANINGS = {
  1:  'identity, body, how others first see you',
  2:  'money, possessions, self-worth',
  3:  'communication, siblings, short travel',
  4:  'home, family, inner foundations',
  5:  'creativity, romance, pleasure, children',
  6:  'health, daily routines, service',
  7:  'partnerships, marriage, what you attract',
  8:  'transformation, shared resources, depth',
  9:  'philosophy, long travel, higher learning',
  10: 'career, public reputation, authority',
  11: 'community, friendships, future goals',
  12: 'spirituality, solitude, hidden matters',
};

const PLANET_LABELS = {
  sun:     'Sun',
  moon:    'Moon',
  mercury: 'Mercury',
  venus:   'Venus',
  mars:    'Mars',
  jupiter: 'Jupiter',
  saturn:  'Saturn',
  uranus:  'Uranus',
  neptune: 'Neptune',
  pluto:   'Pluto',
};

// Only report house shifts for personal + social planets — outer planets
// change houses for everyone born within years and are less individually meaningful
const KEY_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function birthToJDE(chart) {
  const [year, month, day] = chart.birth_date.split('-').map(Number);
  const [hour, minute]     = (chart.birth_time || '12:00').split(':').map(Number);
  const tzNames = findTimezone(chart.birth_lat, chart.birth_lng);
  const tz      = tzNames[0] || 'UTC';
  const localDt = DateTime.fromObject({ year, month, day, hour, minute }, { zone: tz });
  const utc     = localDt.toUTC();
  return julianDay(utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second);
}

function signLabel(lon) {
  const norm = normalize360(lon);
  const idx  = Math.floor(norm / 30) % 12;
  const deg  = Math.floor(norm % 30);
  return `${SIGNS[idx]} ${deg}°`;
}

function signIndex(lon) {
  return Math.floor(normalize360(lon) / 30) % 12;
}

/**
 * Whole Sign house number for a planet given the ASC sign index.
 * If ASC is in Scorpio (index 7), Scorpio is the 1st house,
 * Sagittarius the 2nd, etc.
 */
function wholeSignHouse(planetLon, ascSignIdx) {
  return ((signIndex(planetLon) - ascSignIdx + 12) % 12) + 1;
}

/**
 * Calculate MC and ASC for a given JDE + geographic location.
 *
 * MC formula (Meeus):
 *   MC_lon = atan2(sin(LST), cos(LST) * cos(ε))
 *
 * ASC formula:
 *   ASC_lon = atan2(-cos(LST), sin(LST)*cos(ε) + tan(φ)*sin(ε)) + 180°
 *
 * Both normalized to [0°, 360°).
 */
function calcAngles(jde, lat, lng) {
  const lstDeg  = lst(jde, lng);           // Local Sidereal Time = RAMC
  const T       = julianCenturies(jde);
  const eps     = trueObliquity(T);        // obliquity in degrees

  const ramcRad = toRad(lstDeg);
  const epsRad  = toRad(eps);
  const latRad  = toRad(lat);

  // MC
  const mc = normalize360(
    toDeg(Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad)))
  );

  // ASC (+180° correction puts it on the eastern horizon)
  const ascRaw = toDeg(Math.atan2(
    -Math.cos(ramcRad),
    Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad)
  ));
  const asc = normalize360(ascRaw + 180);

  return { asc, mc };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Calculate a relocated birth chart for a given city.
 *
 * Returns:
 *   natal        — { asc, mc } sign labels at birth location
 *   relocated    — { asc, mc } sign labels at target city
 *   ascChanged   — boolean
 *   mcChanged    — boolean
 *   planetShifts — planets that moved to a different house when relocated
 *   allHouses    — all key-planet house placements in the relocated chart
 */
export function calculateRelocatedChart(chart, city) {
  const jde       = birthToJDE(chart);
  const positions = getAllPositions(jde);

  // Natal angles (birth location)
  const natalAngles  = calcAngles(jde, chart.birth_lat, chart.birth_lng);
  const natalAscIdx  = signIndex(natalAngles.asc);

  // Relocated angles (target city)
  const relocAngles  = calcAngles(jde, city.lat, city.lng);
  const relocAscIdx  = signIndex(relocAngles.asc);

  // Planet house placements — natal vs relocated
  const planetShifts = [];
  const allHouses    = {};

  for (const planet of KEY_PLANETS) {
    const lon         = positions[planet].lon; // ecliptic longitude
    const natalHouse  = wholeSignHouse(lon, natalAscIdx);
    const relocHouse  = wholeSignHouse(lon, relocAscIdx);

    allHouses[planet] = {
      label:   PLANET_LABELS[planet],
      zodiac:  signLabel(lon),
      house:   relocHouse,
      meaning: HOUSE_MEANINGS[relocHouse],
    };

    if (natalHouse !== relocHouse) {
      planetShifts.push({
        planet,
        label:            PLANET_LABELS[planet],
        zodiac:           signLabel(lon),
        natalHouse,
        relocHouse,
        natalMeaning:     HOUSE_MEANINGS[natalHouse],
        relocMeaning:     HOUSE_MEANINGS[relocHouse],
      });
    }
  }

  return {
    natal: {
      asc: signLabel(natalAngles.asc),
      mc:  signLabel(natalAngles.mc),
    },
    relocated: {
      asc: signLabel(relocAngles.asc),
      mc:  signLabel(relocAngles.mc),
    },
    ascChanged:   signIndex(natalAngles.asc) !== signIndex(relocAngles.asc),
    mcChanged:    signIndex(natalAngles.mc)  !== signIndex(relocAngles.mc),
    planetShifts, // planets that changed houses
    allHouses,    // all key-planet positions in relocated chart
  };
}
