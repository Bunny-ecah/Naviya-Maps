/* Prayer times for Malaysia, calculated on the device with JAKIM's parameters:
   Subuh at sun 18° below the horizon (JAKIM's angle since 2020), Isyak at 18°, Asar by the Shafi'i shadow rule, Maghrib at sunset,
   plus about 1–2 minutes of ihtiyat. Results can differ from the official e-Solat table by a minute or two. */
(() => {
  'use strict';
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const sin = (d) => Math.sin(d * rad), cos = (d) => Math.cos(d * rad), tan = (d) => Math.tan(d * rad);
  const asin = (x) => Math.asin(x) * deg, acos = (x) => Math.acos(Math.max(-1, Math.min(1, x))) * deg, atan2 = (y, x) => Math.atan2(y, x) * deg, acot = (x) => Math.atan(1 / x) * deg;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

  function sun(jd) {
    const D = jd - 2451545.0, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360), e = 23.439 - 0.00000036 * D;
    const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
    return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - fix(RA, 24) };
  }
  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  /** Times for the Malaysian calendar day of `date` at lat/lon, as Date objects. */
  function times(date, lat, lon) {
    const myt = new Date(date.getTime() + 8 * 3600e3); // calendar day in Malaysia (UTC+8)
    const y = myt.getUTCFullYear(), m = myt.getUTCMonth() + 1, d = myt.getUTCDate();
    const jd = julian(y, m, d) - lon / (15 * 24);
    const noon = (t) => fix(12 - sun(jd + t).eqt, 24);
    const angleTime = (angle, t, before) => {
      const { decl } = sun(jd + t);
      const T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
      return noon(t) + (before ? -T : T);
    };
    const asrTime = (t) => { const { decl } = sun(jd + t); return angleTime(-acot(1 + tan(Math.abs(lat - decl))), t, false); };
    // hours of local solar day → UTC hours
    const h = {
      subuh: angleTime(18, 5 / 24, true),
      syuruk: angleTime(0.833, 6 / 24, true),
      zohor: noon(12 / 24),
      asar: asrTime(13 / 24),
      maghrib: angleTime(0.833, 18 / 24, false),
      isyak: angleTime(18, 18 / 24, false)
    };
    const base = Date.UTC(y, m - 1, d) - 8 * 3600e3; // 00:00 MYT
    const ihtiyat = { subuh: 1, syuruk: -1, zohor: 1, asar: 1, maghrib: 2, isyak: 1 };
    const out = {};
    for (const [k, v] of Object.entries(h)) out[k] = new Date(base + ((v - lon / 15 + 8) * 3600 + ihtiyat[k] * 60) * 1e3);
    return out;
  }
  const names = { subuh: ['Subuh', 'Subuh'], zohor: ['Zuhur', 'Zohor'], asar: ['Asr', 'Asar'], maghrib: ['Maghrib', 'Maghrib'], isyak: ['Isha', 'Isyak'] };

  /** Prayers that begin between `from` and `to` (Dates) for a moving trip; `where(time)` gives {lat, lon}. */
  function duringTrip(from, to, where) {
    const out = [];
    for (let day = new Date(from.getTime() - 86400e3); day <= to; day = new Date(day.getTime() + 86400e3)) {
      const p = where(day.getTime() < from.getTime() ? from : day > to ? to : day);
      const t = times(day, p.lat, p.lon);
      for (const k of Object.keys(names)) if (t[k] >= from && t[k] <= to && !out.some((x) => x.key === k && Math.abs(x.time - t[k]) < 3600e3)) out.push({ key: k, time: t[k], names: names[k] });
    }
    return out.sort((a, b) => a.time - b.time);
  }
  window.PrayerTimes = { times, duringTrip, names };
})();
