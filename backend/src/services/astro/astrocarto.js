/**
 * Astrocartography calculations.
 *
 * For each planet and a target city (lat, lng):
 *   - MC line: longitude where planet is on the Midheaven
 *   - IC line: opposite (180°) of MC
 *   - AC line: longitude where planet is rising at city's latitude
 *   - DC line: longitude where planet is setting at city's latitude
 *
 * Parans: latitudes where two planetary lines cross (planet A on one angle,
 * planet B on another, simultaneously).
 *
 * Mathematics: Jean Meeus "Astronomical Algorithms" + standard astrocartography.
 */

import { find as findTimezone } from 'geo-tz';
import { DateTime } from 'luxon';
import { julianDay, gmst, normalize360, normalize180, toRad, toDeg } from './core.js';
import { getAllPositions } from './planets.js';

const PLANET_NAMES = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];

const PLANET_LABELS = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
};

// Lines within this threshold (degrees of longitude) are considered "active"
const THRESHOLD_STRONG   = 5;
const THRESHOLD_MODERATE = 10;
const THRESHOLD_WEAK     = 15;

// Parans within this latitude distance are active
const PARAN_LAT_THRESHOLD = 2.5; // degrees

/**
 * Convert birth chart data (with naive local date/time) to UTC Julian Day.
 */
function birthChartToJDE(chart) {
  // chart.birth_date = "YYYY-MM-DD", chart.birth_time = "HH:MM"
  const [year, month, day] = chart.birth_date.split('-').map(Number);
  const [hour, minute]     = chart.birth_time.split(':').map(Number);

  // Detect timezone from birth location coordinates
  const tzNames = findTimezone(chart.birth_lat, chart.birth_lng);
  const tz = tzNames[0] || 'UTC';

  const localDt = DateTime.fromObject({ year, month, day, hour, minute }, { zone: tz });
  const utc     = localDt.toUTC();

  return julianDay(utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second);
}

/**
 * Calculate the MC-line longitude for a planet.
 * This is the geographic longitude where the planet would be on the Midheaven.
 * Formula: λ_MC = RA_planet − GMST (both in degrees)
 */
function mcLineLng(raDeg, gmstDeg) {
  return normalize180(raDeg - gmstDeg);
}

/**
 * Calculate the AC-line longitude for a planet at a given geographic latitude.
 * At latitude φ, planet (RA, Dec) rises when its hour angle H = -H_rise.
 *   H_rise = arccos(−tan(φ) × tan(Dec))    [degrees]
 *   RAMC at rise = RA − H_rise
 *   λ_AC = RAMC_at_rise − GMST
 *
 * Returns null if planet is circumpolar or never rises at this latitude.
 */
function acLineLng(raDeg, decDeg, latDeg, gmstDeg) {
  const tanProduct = Math.tan(toRad(latDeg)) * Math.tan(toRad(decDeg));
  if (Math.abs(tanProduct) > 1) return null; // circumpolar or never rises

  const H_rise = toDeg(Math.acos(-tanProduct));
  const ramcAtRise = raDeg - H_rise;
  return normalize180(ramcAtRise - gmstDeg);
}

/**
 * Calculate the DC-line longitude (planet setting).
 * λ_DC = RA + H_rise − GMST
 */
function dcLineLng(raDeg, decDeg, latDeg, gmstDeg) {
  const tanProduct = Math.tan(toRad(latDeg)) * Math.tan(toRad(decDeg));
  if (Math.abs(tanProduct) > 1) return null;

  const H_rise = toDeg(Math.acos(-tanProduct));
  const ramcAtSet = raDeg + H_rise;
  return normalize180(ramcAtSet - gmstDeg);
}

/**
 * Shortest angular distance between two longitudes (−180 to 180).
 */
function lngDiff(a, b) {
  let d = Math.abs(normalize180(a - b));
  return d;
}

/**
 * Classify influence strength.
 */
function strengthLabel(dist) {
  if (dist < 2) return 'exact';
  if (dist < THRESHOLD_STRONG) return 'strong';
  if (dist < THRESHOLD_MODERATE) return 'moderate';
  return 'mild';
}

/**
 * Calculate parans at a given latitude.
 *
 * A MC×AC paran for planet A and B at latitude φ:
 *   Planet A on MC (lng_A_MC) simultaneously with planet B on AC.
 *   Condition: lng_A_MC = lng_B_AC(φ)
 *   → RA_A − GMST = RA_B − H_B(φ) − GMST
 *   → H_B(φ) = RA_B − RA_A
 *   → arccos(−tan(φ)·tan(Dec_B)) = RA_B − RA_A
 *   → φ_paran = arctan(−cos(RA_B − RA_A) / tan(Dec_B))
 *
 * Similarly for MC×DC, IC×AC, IC×DC parans.
 */
function calcParanLatitude(raA, decA, raB, decB, angleA, angleB) {
  // We need Dec_B's planet to be on AC or DC, and Dec_A's planet on MC or IC
  // Depending on angle combination, pick which planet is the "horizon" one
  let horizRA, horizDec, meridRA;

  // Cases where planet A is on meridian (MC/IC) and B is on horizon (AC/DC):
  if ((angleA === 'MC' || angleA === 'IC') && (angleB === 'AC' || angleB === 'DC')) {
    meridRA = raA; horizRA = raB; horizDec = decB;
    const ICOffset = angleA === 'IC' ? 180 : 0;
    const DCOffset = angleB === 'DC' ? 1 : -1; // +1 for DC (setting side)

    const Hneeded = normalize360(horizRA - meridRA - ICOffset) * DCOffset;
    if (Hneeded < 0 || Hneeded > 180) return null;

    const cosH = Math.cos(toRad(Hneeded));
    const tanDec = Math.tan(toRad(horizDec));
    if (Math.abs(tanDec) < 1e-10) return null;
    const tanLat = -cosH / tanDec;
    if (Math.abs(tanLat) > 10) return null; // latitude > ~84°
    return toDeg(Math.atan(tanLat));
  }

  // Cases where planet B is on meridian and A is on horizon:
  if ((angleB === 'MC' || angleB === 'IC') && (angleA === 'AC' || angleA === 'DC')) {
    meridRA = raB; horizRA = raA; horizDec = decA;
    const ICOffset = angleB === 'IC' ? 180 : 0;
    const DCOffset = angleA === 'DC' ? 1 : -1;

    const Hneeded = normalize360(horizRA - meridRA - ICOffset) * DCOffset;
    if (Hneeded < 0 || Hneeded > 180) return null;

    const cosH = Math.cos(toRad(Hneeded));
    const tanDec = Math.tan(toRad(horizDec));
    if (Math.abs(tanDec) < 1e-10) return null;
    const tanLat = -cosH / tanDec;
    if (Math.abs(tanLat) > 10) return null;
    return toDeg(Math.atan(tanLat));
  }

  return null;
}

/**
 * Main calculation: returns influences and parans for a birth chart + target city.
 */
export function calculateInfluences(chart, city) {
  const jde    = birthChartToJDE(chart);
  const gmstDeg = gmst(jde);
  const positions = getAllPositions(jde);

  const cityLat = city.lat;
  const cityLng = city.lng;

  // ── Step 1: Calculate all 4 lines per planet, find which are near the city ──
  const influences = [];

  for (const planet of PLANET_NAMES) {
    const pos = positions[planet];
    const { ra, dec } = pos;

    // MC line
    const lngMC = mcLineLng(ra, gmstDeg);
    const distMC = lngDiff(cityLng, lngMC);
    if (distMC < THRESHOLD_WEAK) {
      influences.push({
        planet, planetLabel: PLANET_LABELS[planet],
        angle: 'MC', lineLng: lngMC,
        distance: distMC, strength: strengthLabel(distMC),
        ra, dec,
      });
    }

    // IC line
    const lngIC = normalize180(lngMC + 180);
    const distIC = lngDiff(cityLng, lngIC);
    if (distIC < THRESHOLD_WEAK) {
      influences.push({
        planet, planetLabel: PLANET_LABELS[planet],
        angle: 'IC', lineLng: lngIC,
        distance: distIC, strength: strengthLabel(distIC),
        ra, dec,
      });
    }

    // AC line (depends on city latitude)
    const lngAC = acLineLng(ra, dec, cityLat, gmstDeg);
    if (lngAC !== null) {
      const distAC = lngDiff(cityLng, lngAC);
      if (distAC < THRESHOLD_WEAK) {
        influences.push({
          planet, planetLabel: PLANET_LABELS[planet],
          angle: 'AC', lineLng: lngAC,
          distance: distAC, strength: strengthLabel(distAC),
          ra, dec,
        });
      }
    }

    // DC line
    const lngDC = dcLineLng(ra, dec, cityLat, gmstDeg);
    if (lngDC !== null) {
      const distDC = lngDiff(cityLng, lngDC);
      if (distDC < THRESHOLD_WEAK) {
        influences.push({
          planet, planetLabel: PLANET_LABELS[planet],
          angle: 'DC', lineLng: lngDC,
          distance: distDC, strength: strengthLabel(distDC),
          ra, dec,
        });
      }
    }
  }

  // Sort by distance
  influences.sort((a, b) => a.distance - b.distance);

  // ── Step 2: Calculate parans at this latitude ──────────────────────────────
  const parans = [];
  const ANGLE_COMBOS = [
    ['MC','AC'],['MC','DC'],['IC','AC'],['IC','DC'],
    ['AC','MC'],['DC','MC'],['AC','IC'],['DC','IC'],
  ];

  for (let i = 0; i < PLANET_NAMES.length; i++) {
    for (let j = i + 1; j < PLANET_NAMES.length; j++) {
      const pA = PLANET_NAMES[i];
      const pB = PLANET_NAMES[j];
      const posA = positions[pA];
      const posB = positions[pB];

      for (const [angleA, angleB] of ANGLE_COMBOS) {
        const paranLat = calcParanLatitude(
          posA.ra, posA.dec, posB.ra, posB.dec, angleA, angleB
        );
        if (paranLat === null) continue;
        const latDist = Math.abs(cityLat - paranLat);
        if (latDist < PARAN_LAT_THRESHOLD) {
          parans.push({
            planetA: pA, planetALabel: PLANET_LABELS[pA], angleA,
            planetB: pB, planetBLabel: PLANET_LABELS[pB], angleB,
            paranLatitude: paranLat,
            cityLatitude: cityLat,
            latDistance: latDist,
          });
        }
      }
    }
  }

  // Deduplicate parans (same planet pair may appear from both orderings)
  const seenParans = new Set();
  const uniqueParans = parans.filter(p => {
    const key = [
      [p.planetA, p.angleA].join('_'),
      [p.planetB, p.angleB].join('_'),
    ].sort().join('|');
    if (seenParans.has(key)) return false;
    seenParans.add(key);
    return true;
  });

  uniqueParans.sort((a, b) => a.latDistance - b.latDistance);

  return { influences, parans: uniqueParans };
}

/**
 * Generate full planetary line paths for world-map rendering.
 *
 * For each planet returns:
 *   mc  — longitude (number) of the MC line  (vertical line at that longitude)
 *   ic  — longitude (number) of the IC line  (mc + 180°)
 *   ac  — array of coordinate segments [[lng,lat],…] (curved rising line)
 *   dc  — array of coordinate segments [[lng,lat],…] (curved setting line)
 *
 * AC/DC lines are pre-split at real discontinuities so each segment can be
 * drawn as a single smooth GeoJSON LineString.
 */
export function generateMapLines(chart) {
  const jde      = birthChartToJDE(chart);
  const gmstDeg  = gmst(jde);
  const positions = getAllPositions(jde);

  const LAT_STEP   = 0.5;   // degrees — dense enough for smooth curves
  const LAT_MIN    = -85;
  const LAT_MAX    =  85;
  const BREAK_DEG  =  30;   // longitude jump that signals a real discontinuity

  return PLANET_NAMES.map(planet => {
    const { ra, dec } = positions[planet];

    const mc = mcLineLng(ra, gmstDeg);
    const ic = normalize180(mc + 180);

    const acSegments = [];
    const dcSegments = [];
    let acSeg = [], dcSeg = [];
    let prevAcLng = null, prevDcLng = null;

    for (let latRaw = LAT_MIN; latRaw <= LAT_MAX + 0.01; latRaw += LAT_STEP) {
      const lat = Math.round(latRaw * 10) / 10;

      // ── AC ──
      const lngAC = acLineLng(ra, dec, lat, gmstDeg);
      if (lngAC !== null) {
        if (prevAcLng !== null && Math.abs(normalize180(lngAC - prevAcLng)) > BREAK_DEG) {
          if (acSeg.length > 1) acSegments.push(acSeg);
          acSeg = [];
        }
        acSeg.push([+lngAC.toFixed(4), lat]);
        prevAcLng = lngAC;
      } else {
        if (acSeg.length > 1) acSegments.push(acSeg);
        acSeg = [];
        prevAcLng = null;
      }

      // ── DC ──
      const lngDC = dcLineLng(ra, dec, lat, gmstDeg);
      if (lngDC !== null) {
        if (prevDcLng !== null && Math.abs(normalize180(lngDC - prevDcLng)) > BREAK_DEG) {
          if (dcSeg.length > 1) dcSegments.push(dcSeg);
          dcSeg = [];
        }
        dcSeg.push([+lngDC.toFixed(4), lat]);
        prevDcLng = lngDC;
      } else {
        if (dcSeg.length > 1) dcSegments.push(dcSeg);
        dcSeg = [];
        prevDcLng = null;
      }
    }

    if (acSeg.length > 1) acSegments.push(acSeg);
    if (dcSeg.length > 1) dcSegments.push(dcSeg);

    return { planet, planetLabel: PLANET_LABELS[planet], mc, ic, ac: acSegments, dc: dcSegments };
  });
}
