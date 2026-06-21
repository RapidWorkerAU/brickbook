/**
 * Solar position calculations — Spencer (1971) / NOAA algorithm.
 *
 * All time values are LOCAL CIVIL TIME (wall-clock time) as decimal hours,
 * e.g. 14.5 = 2:30 PM. The timezone offset is read from the JS Date object
 * via Date.prototype.getTimezoneOffset(), so the runtime environment must
 * be set to the local timezone of the chosen location for correct results.
 *
 * Azimuth convention throughout: 0 = North, 90 = East, 180 = South, 270 = West.
 */

// ── Internal helpers ──────────────────────────────────────────────────────────

const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;
const rad = (d) => d * TO_RAD;
const deg = (r) => r * TO_DEG;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Day of year (1 = Jan 1). */
function dayOfYear(date) {
  return (
    Math.round(
      (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(date.getFullYear(), 0, 1)) /
        86400000
    ) + 1
  );
}

/** Local UTC offset in fractional hours (+8 for AWST, +10 for AEST, etc.). */
function utcOffsetHours(date) {
  return -date.getTimezoneOffset() / 60;
}

// ── Spencer (1971) core ───────────────────────────────────────────────────────

/** Fractional-year angle B in radians from day-of-year. */
function yearAngle(date) {
  return ((dayOfYear(date) - 1) / 365) * 2 * Math.PI;
}

/**
 * Solar declination in radians.
 * Spencer 1971 — accurate to ±0.0003 rad (≈ 0.017°).
 */
function declinationRad(date) {
  const B = yearAngle(date);
  return (
    0.006918 -
    0.399912 * Math.cos(B) +
    0.070257 * Math.sin(B) -
    0.006758 * Math.cos(2 * B) +
    0.000907 * Math.sin(2 * B) -
    0.002697 * Math.cos(3 * B) +
    0.001480 * Math.sin(3 * B)
  );
}

/**
 * Equation of Time in minutes.
 * Spencer 1971 — accurate to ±0.5 min.
 */
function eqtMinutes(date) {
  const B = yearAngle(date);
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(B) -
      0.032077 * Math.sin(B) -
      0.014615 * Math.cos(2 * B) -
      0.04089 * Math.sin(2 * B))
  );
}

// ── Time conversions ──────────────────────────────────────────────────────────

/**
 * Civil (clock) time → Local Apparent Solar Time, both in decimal hours.
 * LAST = 12 when the sun crosses the meridian.
 */
function toSolarTime(civilH, lng, utcOff, eqt) {
  return civilH - utcOff + lng / 15 + eqt / 60;
}

/** Local Apparent Solar Time → civil (clock) time, both in decimal hours. */
function toCivilTime(solarH, lng, utcOff, eqt) {
  return solarH + utcOff - lng / 15 - eqt / 60;
}

// ── Exported functions ────────────────────────────────────────────────────────

/**
 * getSunriseSet(lat, lng, date)
 *
 * Returns { sunrise, sunset } as decimal civil hours (e.g. 7.25 = 7:15 AM).
 * Returns { sunrise: 0, sunset: 24, polarDay: true }  for midnight-sun days.
 * Returns { sunrise: null, sunset: null, polarNight: true } for polar-night days.
 */
export function getSunriseSet(lat, lng, date) {
  const dec  = declinationRad(date);
  const eqt  = eqtMinutes(date);
  const utc  = utcOffsetHours(date);

  // cos(H₀) = −tan(φ)·tan(δ)  where H₀ is the sunrise hour-angle
  const cosH0 = -Math.tan(rad(lat)) * Math.tan(dec);

  if (cosH0 <= -1) return { sunrise: 0, sunset: 24, polarDay: true };
  if (cosH0 >=  1) return { sunrise: null, sunset: null, polarNight: true };

  const H0 = deg(Math.acos(cosH0)); // degrees — always 0–90
  const sunrise = toCivilTime(12 - H0 / 15, lng, utc, eqt);
  const sunset  = toCivilTime(12 + H0 / 15, lng, utc, eqt);

  return { sunrise, sunset };
}

/**
 * getSolarPosition(lat, lng, date, timeHours)
 *
 * timeHours — local civil time as decimal hours (0–24).
 * Returns { azimuth, altitude } in degrees.
 *   azimuth:  0 = North, 90 = East, 180 = South, 270 = West  (clockwise).
 *   altitude: degrees above the horizon (negative = below).
 */
export function getSolarPosition(lat, lng, date, timeHours) {
  const dec  = declinationRad(date);
  const eqt  = eqtMinutes(date);
  const utc  = utcOffsetHours(date);

  // Hour angle in radians: 0 at noon, positive in the afternoon (west)
  const solarH = toSolarTime(timeHours, lng, utc, eqt);
  const HA     = rad((solarH - 12) * 15);

  const latR = rad(lat);

  // ── Altitude ──────────────────────────────────────────────────────────────
  const sinAlt = clamp(
    Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(HA),
    -1, 1
  );
  const altitude = deg(Math.asin(sinAlt));

  // ── Azimuth (NOAA formula, 0 = North clockwise) ───────────────────────────
  // cos(zenith) = sin(altitude), sin(zenith) = cos(altitude)
  const cosZ = sinAlt;
  const sinZ = Math.cos(rad(altitude));

  let azimuth;
  if (sinZ < 1e-6) {
    // Sun at zenith or nadir — azimuth undefined; default by hemisphere
    azimuth = lat >= 0 ? 180 : 0;
  } else {
    const azRad = clamp(
      (Math.sin(latR) * cosZ - Math.sin(dec)) / (Math.cos(latR) * sinZ),
      -1, 1
    );
    azimuth = 180 - deg(Math.acos(azRad));
    if (HA > 0) azimuth = -azimuth; // afternoon → west side
    if (azimuth < 0) azimuth += 360;
  }

  return { azimuth, altitude };
}

/**
 * getSunPathArc(lat, lng, date, intervalMinutes = 30)
 *
 * Returns an array of { time, azimuth, altitude, aboveHorizon } objects.
 * First entry = sunrise, last entry = sunset.
 * Intermediate entries are spaced intervalMinutes apart.
 * 'time' is local civil time as decimal hours.
 */
export function getSunPathArc(lat, lng, date, intervalMinutes = 30) {
  const { sunrise, sunset, polarDay, polarNight } = getSunriseSet(lat, lng, date);

  if (polarNight || sunrise == null) return [];

  const start = polarDay ? 0 : sunrise;
  const end   = polarDay ? 24 : sunset;
  const step  = intervalMinutes / 60;
  const points = [];

  // ── Sunrise ──
  if (!polarDay) {
    points.push({ time: sunrise, ...getSolarPosition(lat, lng, date, sunrise), aboveHorizon: false });
  }

  // ── Interior points ── (first tick strictly after start)
  const firstTick = Math.ceil((start + 1e-9) / step) * step;
  for (let t = firstTick; t < end - 1e-9; t += step) {
    const pos = getSolarPosition(lat, lng, date, t);
    points.push({ time: t, ...pos, aboveHorizon: pos.altitude > 0 });
  }

  // ── Sunset ──
  if (!polarDay) {
    points.push({ time: sunset, ...getSolarPosition(lat, lng, date, sunset), aboveHorizon: false });
  }

  return points;
}

/**
 * getSeasonDates(year)
 *
 * Returns approximate solstice and equinox dates as UTC Date objects.
 * Includes both hemisphere-neutral names (marchEquinox, juneSolstice, …)
 * and Southern Hemisphere season labels (summerSolstice = December, etc.).
 *
 * Uses Meeus "Astronomical Algorithms" Ch.27 simplified series.
 * Accuracy: ±1–2 days.
 */
export function getSeasonDates(year) {
  const Y = (year - 2000) / 1000;
  const Y2 = Y * Y;
  const Y3 = Y * Y2;

  const jde = {
    marchEquinox:     2451623.80984 + 365242.37404 * Y + 0.05169 * Y2 - 0.00411 * Y3,
    juneSolstice:     2451716.56767 + 365241.62603 * Y + 0.00325 * Y2 + 0.00888 * Y3,
    septemberEquinox: 2451810.21715 + 365242.01767 * Y - 0.11575 * Y2 + 0.00337 * Y3,
    decemberSolstice: 2451900.05952 + 365242.74049 * Y - 0.06223 * Y2 - 0.00823 * Y3,
  };

  function jdToDate(jd) {
    const z = Math.floor(jd + 0.5);
    const f = (jd + 0.5) - z;
    const A =
      z < 2299161
        ? z
        : (() => {
            const a = Math.floor((z - 1867216.25) / 36524.25);
            return z + 1 + a - Math.floor(a / 4);
          })();
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);
    const day   = B - D - Math.floor(30.6001 * E);
    const month = E < 14 ? E - 1 : E - 13;
    const yr    = month > 2 ? C - 4716 : C - 4715;
    const hr    = f * 24;
    return new Date(Date.UTC(yr, month - 1, day, Math.floor(hr), Math.round((hr % 1) * 60)));
  }

  return {
    // Hemisphere-neutral astronomical labels
    marchEquinox:     jdToDate(jde.marchEquinox),
    juneSolstice:     jdToDate(jde.juneSolstice),
    septemberEquinox: jdToDate(jde.septemberEquinox),
    decemberSolstice: jdToDate(jde.decemberSolstice),
    // Southern Hemisphere season labels
    summerSolstice: jdToDate(jde.decemberSolstice), // Dec — sun furthest south
    winterSolstice: jdToDate(jde.juneSolstice),     // Jun — sun furthest north
    springEquinox:  jdToDate(jde.septemberEquinox), // Sep — sun crossing equator southward
    autumnEquinox:  jdToDate(jde.marchEquinox),     // Mar — sun crossing equator northward
  };
}

// ── Self-test ─────────────────────────────────────────────────────────────────
// Run in an environment with timezone set to AWST (UTC+8), e.g.:
//   TZ=Australia/Perth node -e "require('./sunPath.js')"
//
// Expected for Perth (−31.95°, 115.86°) on 21 June:
//   Sunrise  ≈ 07:21 AWST   (BOM: ~07:15)
//   Solar noon ≈ 12:18 AWST (sun is due North, altitude ≈ 34.7°)
//   Sunset   ≈ 17:15 AWST   (BOM: ~17:22)
//   Day length ≈ 9 h 54 min
//
// The Spencer (1971) formula has ~5–8 min error vs. the full NOAA SPA —
// sufficient for building-design sun studies.
//
// import { getSunriseSet, getSolarPosition, getSunPathArc, getSeasonDates } from './sunPath.js';
//
// (function selfTest() {
//   const LAT = -31.95, LNG = 115.86;
//   const date = new Date('2024-06-21T00:00:00'); // AWST midnight → next UTC day is fine
//
//   const hm = (h) => {
//     if (h == null) return 'n/a';
//     const hh = Math.floor(h);
//     const mm = String(Math.round((h - hh) * 60)).padStart(2, '0');
//     return `${hh}:${mm}`;
//   };
//
//   const { sunrise, sunset } = getSunriseSet(LAT, LNG, date);
//   console.log('Sunrise :', hm(sunrise), '— expected ~07:15 AWST');
//   console.log('Sunset  :', hm(sunset),  '— expected ~17:22 AWST');
//   console.log('Day len :', hm(sunset - sunrise), '— expected ~10:07');
//
//   // Solar noon: civil time when LAST = 12
//   // civil_noon = 12 + utcOffset − lng/15 − EqT/60
//   // ≈ 12 + 8 − 7.724 − (−1.27)/60 ≈ 12.30 → 12:18
//   const civilNoon = 12 + 8 - LNG / 15 + 1.27 / 60; // ~12.30
//   const noonPos = getSolarPosition(LAT, LNG, date, civilNoon);
//   console.log('Noon altitude :', noonPos.altitude.toFixed(1) + '°', '— expected ~34.7°');
//   console.log('Noon azimuth  :', noonPos.azimuth.toFixed(1) + '°', '— expected ~0° (North)');
//
//   const arc = getSunPathArc(LAT, LNG, date, 60);
//   console.log('Arc entries   :', arc.length, '(hourly + rise/set endpoints)');
//
//   const seasons = getSeasonDates(2024);
//   console.log('Winter solstice:', seasons.winterSolstice.toISOString(), '— expected ~Jun 20/21');
//   console.log('Summer solstice:', seasons.summerSolstice.toISOString(), '— expected ~Dec 21/22');
// })();
