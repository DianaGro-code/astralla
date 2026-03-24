/**
 * Planetary position calculations.
 * Based on Jean Meeus "Astronomical Algorithms" 2nd ed.
 * Accuracy: ~1 arcminute for inner planets, ~1-2 arcmin for outer planets,
 * ~5 arcminutes for Moon. Adequate for astrocartography (lines span ~110 km/deg).
 */

import {
  toRad, toDeg, normalize360, julianCenturies,
  obliquity, trueObliquity, eclipticToEquatorial
} from './core.js';

// ─── Orbital elements at J2000.0 and their rates (per Julian century) ─────────
// Source: Meeus Table 31.a  [a, e, i, L, w̄, Ω]
// a = semi-major axis (AU), e = eccentricity, i = inclination (°)
// L = mean longitude (°), w̄ = longitude of perihelion (°), Ω = longitude of ascending node (°)
const ELEMENTS = {
  mercury: {
    a: 0.38709927,  da:  3.7e-7,
    e: 0.20563593,  de:  1.906e-5,
    i: 7.00497902,  di: -5.947e-3,
    L: 252.25032350, dL: 149472.67411175,
    w: 77.45779628,  dw:  0.16047689,
    Om: 48.33076593, dOm:-0.12534081,
  },
  venus: {
    a: 0.72333566,  da:  3.9e-6,
    e: 0.00677672,  de: -4.107e-5,
    i: 3.39467605,  di: -7.889e-4,
    L: 181.97909950, dL: 58517.81538729,
    w: 131.60246718, dw:  2.683e-3,
    Om: 76.67984255, dOm:-0.27769418,
  },
  mars: {
    a: 1.52371034,  da:  1.847e-5,
    e: 0.09339410,  de:  7.882e-5,
    i: 1.84969142,  di: -8.131e-3,
    L: -4.55343205, dL: 19140.30268499,
    w: -23.94362959, dw:  0.44441088,
    Om: 49.55953891, dOm:-0.29257343,
  },
  jupiter: {
    a: 5.20288700,  da: -1.1607e-4,
    e: 0.04838624,  de: -1.3253e-4,
    i: 1.30439695,  di: -1.8371e-3,
    L: 34.39644051, dL:  3034.74612775,
    w: 14.72847983,  dw:  0.21252668,
    Om:100.47390909, dOm: 0.20469106,
  },
  saturn: {
    a: 9.53667594,  da: -1.2506e-3,
    e: 0.05386179,  de: -5.0991e-4,
    i: 2.48599187,  di:  1.9361e-3,
    L: 49.95424423, dL:  1222.49362201,
    w: 92.59887831,  dw: -0.41897216,
    Om:113.66242448, dOm:-0.28867794,
  },
  uranus: {
    a: 19.18916464,  da: -1.9618e-3,
    e: 0.04725744,   de: -4.397e-5,
    i: 0.77263783,   di: -2.4294e-3,
    L: 313.23810451, dL:  428.48202785,
    w: 170.95427630,  dw:  0.40805281,
    Om: 74.01692503,  dOm: 0.04240589,
  },
  neptune: {
    a: 30.06992276,  da:  2.6291e-4,
    e: 0.00859048,   de:  5.105e-5,
    i: 1.77004347,   di:  3.5372e-4,
    L: -55.12002969, dL:  218.45945325,
    w: 44.96476227,   dw: -0.32241464,
    Om:131.78422574,  dOm:-0.00508664,
  },
};

// Earth's orbital elements
const EARTH = {
  a: 1.00000018,  da: -3e-8,
  e: 0.01671781,  de: -4.392e-5,
  i: -1.531e-5,   di: -1.29467e-2,
  L: 100.46457166, dL: 35999.37244981,
  w: 102.93768193, dw: 0.32327364,
  Om: 0.0,         dOm: 0.0,
};

// ─── Kepler's equation ────────────────────────────────────────────────────────
function solveKepler(M_rad, e, tol = 1e-10) {
  let E = M_rad;
  for (let i = 0; i < 50; i++) {
    const dE = (M_rad - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

// ─── Apply secular rates to orbital elements ─────────────────────────────────
function applyRates(el, T) {
  return {
    a:  el.a  + el.da  * T,
    e:  el.e  + el.de  * T,
    i:  el.i  + el.di  * T,
    L:  el.L  + el.dL  * T,
    w:  el.w  + el.dw  * T,
    Om: el.Om + el.dOm * T,
  };
}

// ─── Heliocentric ecliptic rectangular coordinates ────────────────────────────
function heliocentricRect(el, T) {
  const { a, e, i, L, w, Om } = applyRates(el, T);
  const M = toRad(normalize360(L - w));
  const E = solveKepler(M, e);

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  const r = a * (1 - e * Math.cos(E));

  // Argument of perihelion ω = ω̄ - Ω
  const omega = toRad(normalize360(w - Om));
  const iR = toRad(i), OmR = toRad(normalize360(Om));
  const u = omega + nu;

  const x = r * (Math.cos(OmR) * Math.cos(u) - Math.sin(OmR) * Math.sin(u) * Math.cos(iR));
  const y = r * (Math.sin(OmR) * Math.cos(u) + Math.cos(OmR) * Math.sin(u) * Math.cos(iR));
  const z = r * Math.sin(u) * Math.sin(iR);

  return { x, y, z, r };
}

// ─── Sun position ─────────────────────────────────────────────────────────────
// High-precision low algorithm from Meeus Ch. 25
export function sunPosition(jde) {
  const T = julianCenturies(jde);

  const L0 = normalize360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = toRad(normalize360(357.52911 + 35999.05029 * T - 0.0001537 * T * T));
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  // Equation of center
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
           + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
           + 0.000289 * Math.sin(3 * M);

  const sunLon = L0 + C; // Sun's true longitude
  const Ω = toRad(normalize360(125.04 - 1934.136 * T));
  const λ = sunLon - 0.00569 - 0.00478 * Math.sin(Ω); // apparent longitude

  const ε = trueObliquity(T);
  const { ra, dec } = eclipticToEquatorial(λ, 0, ε);
  return { ra, dec, lon: normalize360(λ), lat: 0 };
}

// ─── Moon position ────────────────────────────────────────────────────────────
// From Meeus Ch. 47, abbreviated theory (~25 longitude terms, ~15 latitude terms)
// Accuracy: ~5 arcminutes

const MOON_L = [
  // [D, M, Mp, F, Σl (×0.001°)]
  [0,0,1,0,6.288774],[2,0,-1,0,1.274027],[2,0,0,0,0.658314],[0,0,2,0,0.213618],
  [0,1,0,0,-0.185116],[0,0,0,2,-0.114332],[2,0,-2,0,0.058793],[2,-1,-1,0,0.057066],
  [2,0,1,0,0.053322],[2,-1,0,0,0.045758],[0,1,-1,0,-0.040923],[1,0,0,0,-0.034720],
  [0,1,1,0,-0.030383],[2,0,0,-2,0.015327],[0,0,1,2,-0.012528],[0,0,1,-2,0.010980],
  [4,0,-1,0,0.010675],[0,0,3,0,0.010034],[4,0,-2,0,0.008548],[2,1,-1,0,-0.007888],
  [2,1,0,0,0.007212],[1,0,-1,0,0.005765],[2,2,-1,0,0.005180],[2,0,2,0,0.005000],
  [0,0,2,-2,-0.004314],[3,0,-1,0,-0.004130],[2,0,-3,0,-0.003862],[2,-1,-2,0,-0.003628],
  [1,1,0,0,0.002596],[0,1,2,0,-0.002557],[0,0,4,0,0.002281],
];

const MOON_B = [
  // [D, M, Mp, F, Σb (×0.001°)]
  [0,0,0,1,5.128122],[0,0,1,1,0.280602],[0,0,1,-1,0.277693],[2,0,0,-1,0.173237],
  [2,0,-1,1,0.055413],[2,0,-1,-1,0.046271],[2,0,0,1,0.032573],[0,0,2,1,0.017198],
  [2,0,1,-1,0.009266],[0,0,2,-1,0.008822],[2,-1,0,-1,0.008216],[2,0,-2,-1,0.004324],
  [2,0,1,1,0.004200],[2,1,0,-1,-0.003359],[2,-1,-1,1,0.002463],[2,-1,0,1,0.002211],
  [2,-1,-1,-1,0.002065],[0,1,-1,-1,-0.001870],[4,0,-1,-1,0.001828],[0,1,0,1,-0.001794],
  [0,0,0,3,-0.001749],[0,1,-1,1,-0.001565],[1,0,0,1,-0.001491],[0,1,1,1,-0.001475],
  [0,1,1,-1,-0.001410],[0,1,0,-1,-0.001344],
];

export function moonPosition(jde) {
  const T = julianCenturies(jde);

  const L  = normalize360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841);
  const D  = normalize360(297.8501921 + 445267.1114034  * T - 0.0018819 * T * T + T * T * T / 545868);
  const M  = normalize360(357.5291092 +  35999.0502909  * T - 0.0001536 * T * T);
  const Mp = normalize360(134.9633964 + 477198.8675055  * T + 0.0087414 * T * T + T * T * T / 69699);
  const F  = normalize360(93.2720950  + 483202.0175233  * T - 0.0036539 * T * T);

  // Venus/Jupiter/flattening corrections
  const A1 = toRad(normalize360(119.75  +    131.849 * T));
  const A2 = toRad(normalize360( 53.09  + 479264.290 * T));
  const A3 = toRad(normalize360(313.45  + 481266.484 * T));

  const Dr = toRad(D), Mr = toRad(M), Mpr = toRad(Mp), Fr = toRad(F);

  // E factor for M terms
  const E  = 1 - 0.002516 * T - 0.0000074 * T * T;
  const E2 = E * E;

  let Σl = 0;
  for (const [dC, mC, mpC, fC, coeff] of MOON_L) {
    const arg = dC * Dr + mC * Mr + mpC * Mpr + fC * Fr;
    const eFactor = Math.abs(mC) === 2 ? E2 : (Math.abs(mC) === 1 ? E : 1);
    Σl += eFactor * coeff * Math.sin(arg);
  }
  // Additional terms
  Σl += 0.003958 * Math.sin(A1) + 0.001962 * Math.sin(toRad(L) - Fr) + 0.000318 * Math.sin(A2);

  let Σb = 0;
  for (const [dC, mC, mpC, fC, coeff] of MOON_B) {
    const arg = dC * Dr + mC * Mr + mpC * Mpr + fC * Fr;
    const eFactor = Math.abs(mC) === 2 ? E2 : (Math.abs(mC) === 1 ? E : 1);
    Σb += eFactor * coeff * Math.sin(arg);
  }
  Σb += -0.002235 * Math.sin(toRad(L)) + 0.000382 * Math.sin(A3)
      + 0.000175 * Math.sin(A1 - Fr) + 0.000175 * Math.sin(A1 + Fr)
      + 0.000127 * Math.sin(toRad(L) - Mpr) - 0.000115 * Math.sin(toRad(L) + Mpr);

  const lon = normalize360(L + Σl);
  const lat = Σb;

  const ε = trueObliquity(T);
  const { ra, dec } = eclipticToEquatorial(lon, lat, ε);
  return { ra, dec, lon, lat };
}

// ─── Outer planets (Mercury–Neptune) via orbital mechanics ───────────────────
export function planetPosition(name, jde) {
  const T = julianCenturies(jde);
  const elPlanet = ELEMENTS[name];
  if (!elPlanet) throw new Error(`Unknown planet: ${name}`);

  const planetPos = heliocentricRect(elPlanet, T);
  const earthPos  = heliocentricRect(EARTH, T);

  // Geocentric ecliptic rectangular (approx – ignores light time, ~1% error max)
  const dx = planetPos.x - earthPos.x;
  const dy = planetPos.y - earthPos.y;
  const dz = planetPos.z - earthPos.z;

  const lon = toDeg(Math.atan2(dy, dx));
  const r   = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const lat = toDeg(Math.asin(dz / r));

  const ε = trueObliquity(T);
  const { ra, dec } = eclipticToEquatorial(normalize360(lon), lat, ε);
  return { ra, dec, lon: normalize360(lon), lat };
}

// ─── Pluto – polynomial approximation (Meeus Ch. 37) ─────────────────────────
// Valid ~1885–2099, accuracy ~1°
const PLUTO_LON_TERMS = [
  [0,0,1,-19.799804],[0,0,2,0.897144],[0,0,3,0.611149],[0,0,4,0.070440],
  [0,0,5,-0.008138],[1,0,0,-1.082222],[1,0,-1,0.102982],[1,0,-2,0.024683],
  [1,0,-3,0.006753],[2,0,0,0.000712],[2,0,-1,-0.001683],[2,0,-2,-0.000263],
];
const PLUTO_LAT_TERMS = [
  [0,0,1,-0.017678],[0,0,2,-0.020672],[0,0,3,-0.002582],[0,0,4,-0.003000],
  [1,0,0, 0.002143],[1,0,-1, 0.003234],[1,0,-2, 0.000510],[2,0,0, 0.000039],
  [2,0,-1,-0.000179],[2,0,-2,-0.000010],
];

export function plutoPosition(jde) {
  const T = julianCenturies(jde);
  const J = toRad(normalize360(34.35   + 3034.9057 * T));
  const S = toRad(normalize360(50.08   + 1222.1138 * T));
  const P = toRad(normalize360(238.96  +  144.9600 * T));

  let dLon = 0;
  for (const [j, s, p, amp] of PLUTO_LON_TERMS) {
    dLon += amp * Math.sin(j * J + s * S + p * P);
  }
  let dLat = 0;
  for (const [j, s, p, amp] of PLUTO_LAT_TERMS) {
    dLat += amp * Math.cos(j * J + s * S + p * P);
  }

  const lon = normalize360(238.958116 + 144.96 * T + dLon);
  const lat = -3.908239 + dLat;

  const ε = trueObliquity(T);
  const { ra, dec } = eclipticToEquatorial(lon, lat, ε);
  return { ra, dec, lon, lat };
}

// ─── Master: all 10 bodies ────────────────────────────────────────────────────
export function getAllPositions(jde) {
  return {
    sun:     sunPosition(jde),
    moon:    moonPosition(jde),
    mercury: planetPosition('mercury', jde),
    venus:   planetPosition('venus', jde),
    mars:    planetPosition('mars', jde),
    jupiter: planetPosition('jupiter', jde),
    saturn:  planetPosition('saturn', jde),
    uranus:  planetPosition('uranus', jde),
    neptune: planetPosition('neptune', jde),
    pluto:   plutoPosition(jde),
  };
}
