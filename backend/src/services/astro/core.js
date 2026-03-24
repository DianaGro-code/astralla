// Core astronomical mathematics
// Based on Jean Meeus "Astronomical Algorithms" 2nd ed.

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

export function toRad(deg) { return deg * D2R; }
export function toDeg(rad) { return rad * R2D; }

/** Normalize angle to [0, 360) */
export function normalize360(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Normalize angle to (-180, 180] */
export function normalize180(deg) {
  let d = normalize360(deg);
  if (d > 180) d -= 360;
  return d;
}

/**
 * Julian Day Number from UTC date/time components.
 * Meeus Chapter 7.
 */
export function julianDay(year, month, day, hour = 0, min = 0, sec = 0) {
  const ut = hour + min / 60 + sec / 3600;
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + ut / 24 + B - 1524.5;
}

/**
 * Julian centuries from J2000.0
 */
export function julianCenturies(jd) {
  return (jd - 2451545.0) / 36525;
}

/**
 * Greenwich Mean Sidereal Time in degrees.
 * Meeus eq. 12.4
 */
export function gmst(jd) {
  const T = julianCenturies(jd);
  let θ = 280.46061837
    + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T
    - (T * T * T) / 38710000;
  return normalize360(θ);
}

/**
 * Local Sidereal Time in degrees.
 * lng is geographic longitude in degrees, positive east.
 */
export function lst(jd, lng) {
  return normalize360(gmst(jd) + lng);
}

/**
 * Mean obliquity of the ecliptic in degrees.
 * Meeus eq. 22.2 (low precision, good to ~1")
 */
export function obliquity(T) {
  const eps0 = 23.0 + 26.0 / 60 + 21.448 / 3600
    - (4680.93 / 3600) * T
    - (1.55 / 3600) * T * T
    + (1999.25 / 3600) * T * T * T
    - (51.38 / 3600) * T * T * T * T
    - (249.67 / 3600) * T * T * T * T * T
    - (39.05 / 3600) * T * T * T * T * T * T;
  return eps0;
}

/**
 * True obliquity (includes nutation correction).
 * Approx from Meeus §22.
 */
export function trueObliquity(T) {
  const Ω = toRad(normalize360(125.04452 - 1934.136261 * T));
  return obliquity(T) + 0.00256 * Math.cos(Ω);
}

/**
 * Convert ecliptic (λ, β) to equatorial (RA, Dec).
 * All inputs/outputs in degrees.
 */
export function eclipticToEquatorial(lonDeg, latDeg, oblDeg) {
  const λ = toRad(lonDeg);
  const β = toRad(latDeg);
  const ε = toRad(oblDeg);

  const ra = toDeg(Math.atan2(
    Math.sin(λ) * Math.cos(ε) - Math.tan(β) * Math.sin(ε),
    Math.cos(λ)
  ));
  const dec = toDeg(Math.asin(
    Math.sin(β) * Math.cos(ε) + Math.cos(β) * Math.sin(ε) * Math.sin(λ)
  ));

  return { ra: normalize360(ra), dec };
}

/**
 * Angular separation between two RA/Dec points (degrees).
 */
export function angularSeparation(ra1, dec1, ra2, dec2) {
  const d1 = toRad(dec1), d2 = toRad(dec2);
  const ra = toRad(ra2 - ra1);
  return toDeg(Math.acos(
    Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(ra)
  ));
}
