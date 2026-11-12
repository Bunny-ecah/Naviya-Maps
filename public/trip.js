/* Naviya trip: in-app turn-by-turn navigation, stops along the way, prayer times on the trip and ETA sharing.
   Depends on malaysia.js (window.Naviya), prayer.js (window.PrayerTimes) and i18n.js (window.I18N). */
(() => {
  'use strict';
  const N = window.Naviya;
  if (!N) return;
  const $ = (s) => document.querySelector(s);
  const t = (en, vars) => window.I18N ? window.I18N.t(en, vars) : en;
  const ms = () => window.I18N?.lang === 'ms';
  const { esc, toast, modal, map } = N;

  // ---------- Geometry (route coordinates are [lon, lat]) ----------
  const M = 111195;
  const flat = (p, lat) => [p[0] * Math.cos(lat * Math.PI / 180) * M, p[1] * M];
  function cumulative(pts) { const out = [0]; for (let i = 1; i < pts.length; i++) { const a = flat(pts[i - 1], pts[i][1]), b = flat(pts[i], pts[i][1]); out.push(out[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); } return out; }
  /** Nearest point on the route to p: distance along (m), distance off (m), segment index. Searches near `hint` first. */
  function project(pts, cum, p, hint = 0) {
    const scan = (from, to) => {
      let best = { along: 0, offset: Infinity, index: from };
      for (let i = Math.max(1, from); i < Math.min(pts.length, to); i++) {
        const A = flat(pts[i - 1], p[1]), B = flat(pts[i], p[1]), P = flat(p, p[1]), dx = B[0] - A[0], dy = B[1] - A[1], len = dx * dx + dy * dy || 1;
        const k = Math.max(0, Math.min(1, ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / len)), d = Math.hypot(P[0] - A[0] - k * dx, P[1] - A[1] - k * dy);
        if (d < best.offset) best = { along: cum[i - 1] + k * (cum[i] - cum[i - 1]), offset: d, index: i - 1 };
      }
      return best;
    };
    const near = scan(hint - 30, hint + 400);
    return near.offset < 80 ? near : scan(1, pts.length);
  }
  function pointAt(pts, cum, along) {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < along) i++;
    const k = Math.max(0, Math.min(1, (along - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1)));
    return { lon: pts[i - 1][0] + k * (pts[i][0] - pts[i - 1][0]), lat: pts[i - 1][1] + k * (pts[i][1] - pts[i - 1][1]), bearing: bearing(pts[i - 1], pts[i]) };
  }
  function bearing(a, b) { const y = Math.sin((b[0] - a[0]) * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180), x = Math.cos(a[1] * Math.PI / 180) * Math.sin(b[1] * Math.PI / 180) - Math.sin(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.cos((b[0] - a[0]) * Math.PI / 180); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
  const metres = (a, b) => { const A = flat([a.lon, a.lat], a.lat), B = flat([b.lon, b.lat], a.lat); return Math.hypot(A[0] - B[0], A[1] - B[1]); };

  // ---------- Words: instructions in English and Bahasa Melayu ----------
  function roadName(s) { return s.name || s.ref || ''; }
  function instruction(s, short = false) {
    const road = roadName(s), mod = (s.modifier || '').replace('uturn', 'u-turn');
    const side = mod.includes('left') ? 'left' : mod.includes('right') ? 'right' : '';
    if (ms()) {
      const ke = road ? ' ke ' + road : '';
      const dir = { 'left': 'kiri', 'right': 'kanan' }[side] || '';
      if (s.type === 'arrive') return 'Anda telah tiba di destinasi';
      if (s.type === 'depart') return 'Mulakan perjalanan' + (road ? ' di ' + road : '');
      if (s.type === 'roundabout' || s.type === 'rotary') return 'Di bulatan, ambil ' + (s.exit ? 'susur keluar ke-' + s.exit : 'susur keluar') + ke;
      if (s.type === 'on ramp') return 'Masuk susur' + (dir ? ' di sebelah ' + dir : '') + ke;
      if (s.type === 'off ramp') return 'Keluar' + (dir ? ' di sebelah ' + dir : '') + ke;
      if (s.type === 'fork') return 'Ikut lorong ' + (dir || 'kanan') + ke;
      if (s.type === 'merge') return 'Masuk' + ke;
      if (mod === 'u-turn') return 'Buat pusingan U' + ke;
      if (mod === 'straight' || ((s.type === 'continue' || s.type === 'new name') && !dir)) return 'Terus' + ke;
      if (mod.startsWith('slight')) return 'Belok sedikit ke ' + dir + ke;
      if (mod.startsWith('sharp')) return 'Belok tajam ke ' + dir + ke;
      return 'Belok ' + dir + ke;
    }
    const onto = road ? ' onto ' + road : '';
    if (s.type === 'arrive') return 'You have arrived at your destination';
    if (s.type === 'depart') return 'Head off' + (road ? ' on ' + road : '');
    if (s.type === 'roundabout' || s.type === 'rotary') return 'At the roundabout, take the ' + (s.exit ? ordinal(s.exit) + ' exit' : 'exit') + onto;
    if (s.type === 'on ramp') return 'Take the ramp' + (side ? ' on the ' + side : '') + onto;
    if (s.type === 'off ramp') return 'Take the exit' + (side ? ' on the ' + side : '') + (road ? ' towards ' + road : '');
    if (s.type === 'fork') return 'Keep ' + (side || 'right') + ' at the fork' + onto;
    if (s.type === 'merge') return 'Merge' + onto;
    if (mod === 'u-turn') return 'Make a U-turn' + onto;
    if (mod === 'straight' || ((s.type === 'continue' || s.type === 'new name') && !side)) return 'Continue' + onto;
    if (mod.startsWith('slight')) return 'Bear ' + side + onto;
    if (mod.startsWith('sharp')) return 'Turn sharp ' + side + onto;
    return 'Turn ' + side + onto;
  }
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const spokenDistance = (m) => {
    const r = m >= 1000 ? (Math.round(m / 100) / 10) : m >= 300 ? Math.round(m / 100) * 100 : Math.round(m / 50) * 50;
    if (ms()) return m >= 1000 ? `Dalam ${String(r).replace('.', ' perpuluhan ')} kilometer` : `Dalam ${r} meter`;
    return m >= 1000 ? `In ${r} kilometres` : `In ${r} metres`;
  };
  const shownDistance = (m) => m >= 1000 ? (m / 1000).toFixed(m >= 10000 ? 0 : 1) + ' km' : Math.max(10, Math.round(m / 10) * 10) + ' m';

  // Turn arrows
  const P = {
    straight: 'M12 20V5M6 11l6-6 6 6', left: 'M17 20v-7a4 4 0 0 0-4-4H5M9 5L5 9l4 4', right: 'M7 20v-7a4 4 0 0 1 4-4h8M15 5l4 4-4 4',
    slightleft: 'M15 20v-6L8 7M8 13V7h6', slightright: 'M9 20v-6l7-7M16 13V7h-6', uturn: 'M16 20V9a4 4 0 0 0-8 0v6M5 12l3 3 3-3',
    roundabout: 'M12 21v-6M12 15a4 4 0 1 1 4-4M16 6v5h-5', arrive: 'M6 21V4M6 4h11l-2 4 2 4H6', depart: 'M12 3l7 18-7-4-7 4z'
  };
  function arrow(s) {
    const mod = s.modifier || '';
    const key = s.type === 'arrive' ? 'arrive' : s.type === 'depart' ? 'depart' : (s.type === 'roundabout' || s.type === 'rotary') ? 'roundabout' : mod === 'uturn' ? 'uturn' : mod.includes('slight') ? (mod.includes('left') ? 'slightleft' : 'slightright') : mod.includes('left') ? 'left' : mod.includes('right') ? 'right' : 'straight';
    return `<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[key]}"/></svg>`;
  }

  // ---------- Voice ----------
  let muted = false;
  try { muted = localStorage.getItem('naviya-muted') === '1'; } catch {}
  function say(text) {
    if (muted || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text), want = ms() ? 'ms' : 'en';
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang.toLowerCase().startsWith(want + '-my')) || voices.find((v) => v.lang.toLowerCase().startsWith(want)) || null;
    u.lang = ms() ? 'ms-MY' : 'en-MY';
    u.rate = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // ---------- Navigation UI ----------
  const ui = document.createElement('div');
  ui.id = 'nav-ui';
  ui.hidden = true;
  ui.innerHTML = `
    <div class="nav-top" role="status" aria-live="polite"><div class="nav-arrow"></div><div class="nav-text"><b class="nav-dist"></b><span class="nav-instr"></span></div></div>
    <div class="nav-then" hidden></div>
    <div class="nav-banner" hidden></div>
    <button type="button" class="nav-recenter" hidden>${NI('locate')}<span>${t('Recenter')}</span></button>
    <div class="nav-bottom">
      <div class="nav-eta"><b class="nav-arrive"></b><small class="nav-left"></small></div>
      <div class="nav-actions">
        <button type="button" data-nav="mute" aria-label="${t('Mute')}"></button>
        <button type="button" data-nav="stops" aria-label="${t('Stops')}">${NI('fuel')}</button>
        <button type="button" data-nav="share" aria-label="${t('Share ETA')}">${NI('arrow')}</button>
        <button type="button" data-nav="end" class="nav-end">${t('End')}</button>
      </div>
    </div>`;
  document.body.append(ui);
  const meIcon = L.divIcon({ className: 'nav-me', html: '<span><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2.5 19 20l-7-4.2L5 20z" fill="#fff"/></svg></span>', iconSize: [38, 38], iconAnchor: [19, 19] });
  const navLayer = L.layerGroup().addTo(map);
  const setMuteIcon = () => {
    const b = ui.querySelector('[data-nav="mute"]');
    b.innerHTML = muted ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/></svg>' : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
    b.setAttribute('aria-label', muted ? t('Sound on') : t('Mute'));
  };
  setMuteIcon();

  // ---------- Navigation session ----------
  let nav = null; // { route, pts, cum, starts, total, mode, dest, queue, progress, ... }
  let watchId = null, simTimer = null, wakeLock = null, following = true;

  function prepare(route) {
    const pts = route.geometry.coordinates, cum = cumulative(pts), total = cum[cum.length - 1] || route.distance;
    const scale = total / (route.steps.reduce((s, x) => s + (x.distance || 0), 0) || total);
    const starts = []; let acc = 0;
    for (const s of route.steps) { starts.push(acc * scale); acc += s.distance || 0; }
    return { route, pts, cum, total, starts };
  }
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !document.hidden) { wakeLock = await navigator.wakeLock.request('screen'); } } catch {}
  }
  document.addEventListener('visibilitychange', () => { if (nav && !document.hidden) keepAwake(); });

  function start({ route, mode, dest, queue = [], simulate = false }) {
    stop(true);
    nav = { ...prepare(route), mode, dest, queue, simulate, progress: 0, step: 0, spoken: new Set(), offCount: 0, lastReroute: 0, startedAt: Date.now(), last: null, arrived: false };
    document.body.classList.add('navigating');
    ui.hidden = false;
    following = true;
    navLayer.clearLayers();
    L.geoJSON(route.geometry, { style: { color: '#7a4ddb', weight: 8, opacity: 0.95 } }).addTo(navLayer);
    nav.me = L.marker([route.geometry.coordinates[0][1], route.geometry.coordinates[0][0]], { icon: meIcon, interactive: false, zIndexOffset: 1000 }).addTo(navLayer);
    setTimeout(() => map.invalidateSize(), 50);
    keepAwake();
    history.pushState({ naviyaNav: true }, '');
    const first = route.steps[0], next = route.steps[1];
    say((first ? instruction(first) + '. ' : '') + (next ? (ms() ? 'Kemudian, ' : 'Then, ') + instruction(next).toLowerCase() : ''));
    if (simulate) simulateDrive();
    else watch();
    render();
  }
  function watch() {
    if (!navigator.geolocation) { toast(t('Location is unavailable in this browser.')); return; }
    let firstFix = false;
    watchId = navigator.geolocation.watchPosition((pos) => {
      firstFix = true;
      update({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy || 30, heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null, speed: pos.coords.speed });
    }, (err) => {
      if (err.code === 1) { toast(ms() ? 'Benarkan akses lokasi untuk navigasi.' : 'Allow location access to navigate.'); stop(); }
      else banner(ms() ? 'Mencari isyarat GPS…' : 'Looking for GPS signal…');
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
    setTimeout(() => { if (nav && !firstFix && !nav.simulate) banner(ms() ? 'Menunggu GPS… Pastikan lokasi dihidupkan.' : 'Waiting for GPS… Make sure location is on.'); }, 8000);
  }
  function simulateDrive() {
    const speed = { car: 16, motorbike: 14, cycle: 5, walk: 1.5 }[nav.mode] || 14; // m/s, played back 4× faster
    let along = 0;
    simTimer = setInterval(() => {
      if (!nav) return clearInterval(simTimer);
      along = Math.min(nav.total, along + speed * 4);
      const p = pointAt(nav.pts, nav.cum, along);
      update({ lat: p.lat, lon: p.lon, accuracy: 5, heading: p.bearing, speed });
    }, 1000);
    banner(ms() ? 'Pratonton: perjalanan disimulasikan 4× lebih laju' : 'Preview: simulated drive at 4× speed');
  }
  function banner(text) { const b = ui.querySelector('.nav-banner'); b.textContent = text; b.hidden = !text; }

  function update(fix) {
    if (!nav || nav.arrived) return;
    const p = [fix.lon, fix.lat], pos = project(nav.pts, nav.cum, p, nav.lastIndex || 0);
    nav.lastIndex = pos.index;
    nav.last = fix;
    if (!nav.simulate) banner('');
    // Off route: well outside GPS accuracy for three fixes in a row.
    const limit = Math.max(45, Math.min(120, fix.accuracy * 1.5));
    nav.offCount = pos.offset > limit ? nav.offCount + 1 : 0;
    if (nav.offCount >= 3 && Date.now() - nav.lastReroute > 12000) return reroute(fix);
    nav.progress = Math.max(nav.progress - 30, pos.along);
    let i = 0;
    while (i < nav.starts.length - 1 && nav.starts[i + 1] <= nav.progress + 5) i++;
    if (i !== nav.step) { nav.step = i; }
    const heading = fix.heading ?? pointAt(nav.pts, nav.cum, nav.progress).bearing;
    nav.me.setLatLng([fix.lat, fix.lon]);
    const el = nav.me.getElement()?.querySelector('span');
    if (el) el.style.transform = `rotate(${heading}deg)`;
    if (following) map.setView([fix.lat, fix.lon], nav.mode === 'walk' ? 18 : nav.total - nav.progress > 3000 && (fix.speed || 0) > 20 ? 16 : 17, { animate: true });
    if (nav.total - nav.progress < 30 || (nav.progress > nav.total - 60 && metres(fix, { lat: nav.dest.lat, lon: nav.dest.lon }) < 40)) return arrive();
    announce();
    render();
  }
  function announce() {
    const next = nav.route.steps[nav.step + 1];
    if (!next) return;
    const d = nav.starts[nav.step + 1] - nav.progress, key = (n) => nav.step + 1 + ':' + n;
    const fast = nav.mode === 'car' || nav.mode === 'motorbike';
    const marks = fast ? [[1500, 'far'], [500, 'mid'], [120, 'now']] : [[200, 'mid'], [30, 'now']];
    for (const [m, k] of marks) {
      if (d <= m && !nav.spoken.has(key(k))) {
        marks.forEach(([mm, kk]) => { if (mm >= m) nav.spoken.add(key(kk)); });
        if (k === 'far' && nav.starts[nav.step + 1] - nav.starts[nav.step] < 2500) return; // skip the long-range call on short stretches
        say(k === 'now' ? instruction(next) : spokenDistance(d) + ', ' + instruction(next).charAt(0).toLowerCase() + instruction(next).slice(1));
        return;
      }
    }
  }
  function remaining() {
    const left = Math.max(0, nav.total - nav.progress);
    const secs = nav.route.duration * (left / nav.total);
    return { left, secs };
  }
  function render() {
    if (!nav) return;
    const steps = nav.route.steps, next = steps[nav.step + 1] || steps[nav.step], after = steps[nav.step + 2];
    const d = Math.max(0, (nav.starts[nav.step + 1] ?? nav.total) - nav.progress);
    ui.querySelector('.nav-arrow').innerHTML = arrow(next);
    ui.querySelector('.nav-dist').textContent = shownDistance(d);
    ui.querySelector('.nav-instr').textContent = instruction(next);
    const then = ui.querySelector('.nav-then');
    then.hidden = !(after && nav.starts[nav.step + 2] - nav.starts[nav.step + 1] < 300);
    if (!then.hidden) then.innerHTML = `<span>${ms() ? 'Kemudian' : 'Then'}</span>${arrow(after).replace('width="44" height="44"', 'width="20" height="20"')}`;
    const r = remaining();
    ui.querySelector('.nav-arrive').textContent = N.clock(r.secs);
    ui.querySelector('.nav-left').textContent = `${N.minutes(r.secs)} · ${shownDistance(r.left)}`;
  }
  async function reroute(fix) {
    nav.lastReroute = Date.now();
    nav.offCount = 0;
    banner(ms() ? 'Mengira semula laluan…' : 'Recalculating…');
    say(ms() ? 'Mengira semula laluan' : 'Recalculating');
    try {
      const routes = await N.fetchRoute({ lat: fix.lat, lon: fix.lon }, nav.dest, nav.mode);
      if (!nav || !routes?.length) return;
      const keep = { mode: nav.mode, dest: nav.dest, queue: nav.queue, simulate: nav.simulate, spoken: new Set(), offCount: 0, lastReroute: Date.now(), startedAt: nav.startedAt, me: nav.me, progress: 0, step: 0, lastIndex: 0, arrived: false };
      nav = { ...prepare(routes[0]), ...keep };
      navLayer.eachLayer((l) => { if (l !== nav.me) navLayer.removeLayer(l); });
      L.geoJSON(routes[0].geometry, { style: { color: '#7a4ddb', weight: 8, opacity: 0.95 } }).addTo(navLayer);
      banner('');
      render();
    } catch (e) {
      banner(ms() ? 'Tidak dapat mengira semula. Cuba lagi sebentar.' : 'Could not recalculate. Will try again shortly.');
    }
  }
  function arrive() {
    nav.arrived = true;
    say(instruction({ type: 'arrive' }));
    clearWatch();
    const next = nav.queue[0];
    const top = ui.querySelector('.nav-top');
    ui.querySelector('.nav-arrow').innerHTML = arrow({ type: 'arrive' });
    ui.querySelector('.nav-dist').textContent = t('Arrived');
    ui.querySelector('.nav-instr').textContent = nav.dest.name || '';
    ui.querySelector('.nav-left').textContent = '';
    ui.querySelector('.nav-arrive').textContent = N.clock(0);
    if (next) {
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'nav-next';
      go.innerHTML = `<small>${t('Next stop')}</small><b>${esc(next.name)}</b><span>${t('Go')} →</span>`;
      top.after(go);
      go.onclick = async () => {
        go.remove();
        const from = nav.last ? { lat: nav.last.lat, lon: nav.last.lon } : nav.dest;
        try {
          const routes = await N.fetchRoute(from, next, nav.mode);
          start({ route: routes[0], mode: nav.mode, dest: next, queue: nav.queue.slice(1), simulate: nav.simulate });
        } catch (e) { toast(e.message); }
      };
    }
  }
  function clearWatch() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    clearInterval(simTimer);
    simTimer = null;
  }
  function stop(silent) {
    clearWatch();
    if (!nav) return;
    nav = null;
    try { wakeLock?.release(); } catch {}
    wakeLock = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    navLayer.clearLayers();
    ui.querySelector('.nav-next')?.remove();
    ui.hidden = true;
    banner('');
    document.body.classList.remove('navigating');
    setTimeout(() => map.invalidateSize(), 50);
    if (!silent && history.state?.naviyaNav) history.back();
  }
  addEventListener('popstate', () => { if (nav) stop(true); });
  map.on('dragstart', () => { if (nav) { following = false; ui.querySelector('.nav-recenter').hidden = false; } });
  ui.querySelector('.nav-recenter').onclick = () => { following = true; ui.querySelector('.nav-recenter').hidden = true; if (nav?.last) map.setView([nav.last.lat, nav.last.lon], 17); };
  ui.querySelector('[data-nav="end"]').onclick = () => stop();
  ui.querySelector('[data-nav="mute"]').onclick = () => { muted = !muted; try { localStorage.setItem('naviya-muted', muted ? '1' : '0'); } catch {} if (muted) speechSynthesis?.cancel(); setMuteIcon(); };
  ui.querySelector('[data-nav="share"]').onclick = () => shareEta();
  ui.querySelector('[data-nav="stops"]').onclick = () => {
    if (!nav) return;
    stopsModal({ route: nav.route, mode: nav.mode, fromAlong: nav.progress, departure: Date.now() });
  };

  // ---------- Share ETA (WhatsApp or the phone's share sheet) ----------
  async function shareEta() {
    if (!nav) return;
    const r = remaining(), when = N.clock(r.secs), dest = nav.dest.name || (ms() ? 'destinasi' : 'my destination');
    const link = `${location.origin}/explore.html?` + new URLSearchParams({ to: (+nav.dest.lat).toFixed(6) + ',' + (+nav.dest.lon).toFixed(6), toName: dest, mode: nav.mode });
    const text = ms() ? `Saya dalam perjalanan ke ${dest}. Dijangka sampai ${when} (${N.minutes(r.secs)} lagi).` : `I'm on my way to ${dest}. Expected arrival ${when} (${N.minutes(r.secs)} away).`;
    if (navigator.share) { try { await navigator.share({ text, url: link }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + link), '_blank', 'noopener');
  }

  // ---------- Stops along the way + prayer times ----------
  const stopCache = new Map();
  async function stopsFor(route) {
    const key = route.geometry.coordinates.length + ':' + route.distance + ':' + route.geometry.coordinates[0].join();
    if (stopCache.has(key)) return stopCache.get(key);
    const res = await fetch('/api/along-route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ route: route.geometry.coordinates }), signal: AbortSignal.timeout(32000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.available) throw new Error(data.error || 'Stops along the route are temporarily unavailable.');
    stopCache.set(key, data.stops);
    return data.stops;
  }
  const kinds = [['rest', 'R&R', 'coffee'], ['petrol', 'Petrol', 'fuel'], ['surau', 'Surau & masjid', 'museum'], ['ev', 'EV charging', 'ev']];
  async function stopsModal({ route, mode, fromAlong = 0, departure = Date.now() }) {
    const pts = route.geometry.coordinates, cum = cumulative(pts), total = cum[cum.length - 1] || route.distance;
    const timeAt = (along) => departure + route.duration * 1e3 * Math.max(0, along - fromAlong) / total;
    modal(t('Stops along the way'), `<div id="prayer-box" class="prayer-box"></div><div class="stop-tabs" role="tablist">${kinds.map(([k, label, icon], i) => `<button type="button" role="tab" data-kind="${k}" aria-selected="${i === 0}">${NI(icon)}${t(label)}</button>`).join('')}</div><div id="stop-list" class="stop-list"><p class="small-print">${ms() ? 'Mencari hentian sepanjang laluan…' : 'Finding stops along your route…'}</p></div>`);
    let stops = [];
    // Prayer times during the rest of the trip (JAKIM parameters, on this device).
    const end = timeAt(total), where = (time) => { const k = (time.getTime() - departure) / Math.max(1, end - departure); return pointAt(pts, cum, fromAlong + k * (total - fromAlong)); };
    const prayers = window.PrayerTimes ? window.PrayerTimes.duringTrip(new Date(departure), new Date(end), where) : [];
    const renderPrayers = () => {
      const box = $('#prayer-box');
      if (!box) return;
      if (!prayers.length) { box.innerHTML = `<div class="prayer-none">${NI('clock')}<span>${ms() ? 'Tiada waktu solat masuk sepanjang perjalanan ini.' : 'No prayer time begins during this trip.'}</span></div>`; return; }
      box.innerHTML = `<b class="prayer-title">${NI('clock')} ${t('Prayer times on this trip')}</b>` + prayers.map((p) => {
        const k = (p.time.getTime() - departure) / Math.max(1, end - departure), along = fromAlong + k * (total - fromAlong);
        const options = stops.filter((s) => (s.kind === 'surau' || s.kind === 'rest') && s.along >= along - 1500 && s.along > fromAlong).slice(0, 2);
        const fmt = p.time.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' });
        return `<div class="prayer-row"><div><b>${p.names[ms() ? 1 : 0]} · ${fmt}</b><small>${ms() ? 'Anda dijangka di km' : 'You should be around km'} ${Math.round(along / 1000)}</small></div>${options.length ? options.map((s) => `<button type="button" class="prayer-stop" data-stop-id="${esc(s.id)}">${esc(s.name)} <small>km ${Math.round(s.along / 1000)}</small></button>`).join('') : `<small class="prayer-wait">${stops.length ? (ms() ? 'Tiada surau dipetakan tepat di laluan selepas titik ini.' : 'No mapped surau right on the route after this point.') : ''}</small>`}</div>`;
      }).join('') + `<p class="small-print">${ms() ? 'Dikira dengan parameter JAKIM pada peranti anda; mungkin berbeza 1–2 minit. Semak e-solat.gov.my.' : 'Calculated with JAKIM parameters on your device; may differ by 1–2 minutes. Check e-solat.gov.my.'}</p>`;
      bindStopButtons();
    };
    let kind = 'rest';
    const renderList = () => {
      const box = $('#stop-list');
      if (!box) return;
      const list = stops.filter((s) => s.kind === kind && s.along > fromAlong - 200);
      box.innerHTML = list.length ? list.map((s) => `<div class="stop-row"><div><b>${esc(s.name)}</b><small>km ${(s.along / 1000).toFixed(s.along < 10000 ? 1 : 0)} · ~${new Date(timeAt(s.along)).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' })}${s.offset > 60 ? ` · ${s.offset} m ${ms() ? 'dari jalan' : 'off route'}` : ''}</small></div><button type="button" data-show="${esc(s.id)}" aria-label="${t('Show on map')}">${NI('map')}</button><button type="button" class="add" data-stop-id="${esc(s.id)}">${t('Add stop')}</button></div>`).join('') : `<p class="small-print">${ms() ? 'Tiada hentian jenis ini dipetakan di sepanjang laluan.' : 'None of these are mapped along this route.'}</p>`;
      bindStopButtons();
    };
    const bindStopButtons = () => {
      document.querySelectorAll('#modal [data-stop-id]').forEach((b) => b.onclick = () => addStop(stops.find((s) => s.id === b.dataset.stopId)));
      document.querySelectorAll('#modal [data-show]').forEach((b) => b.onclick = () => { const s = stops.find((x) => x.id === b.dataset.show); $('#modal').close(); following = false; if (nav) ui.querySelector('.nav-recenter').hidden = false; map.setView([s.lat, s.lon], 17); });
    };
    document.querySelectorAll('#modal [data-kind]').forEach((b) => b.onclick = () => { kind = b.dataset.kind; document.querySelectorAll('#modal [data-kind]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); renderList(); });
    renderPrayers();
    try {
      stops = await stopsFor(route);
      renderPrayers();
      renderList();
    } catch (e) {
      const box = $('#stop-list');
      if (box) box.innerHTML = `<p class="small-print">${esc(e.message)}</p>`;
    }
  }
  async function addStop(s) {
    if (!s) return;
    $('#modal').close();
    if (!nav) return N.addVia(s);
    // During navigation: go to the stop first, then continue to the destination.
    const from = nav.last ? { lat: nav.last.lat, lon: nav.last.lon } : { lat: nav.pts[0][1], lon: nav.pts[0][0] };
    try {
      const routes = await N.fetchRoute(from, s, nav.mode);
      start({ route: routes[0], mode: nav.mode, dest: s, queue: [nav.dest, ...nav.queue], simulate: nav.simulate });
      toast((ms() ? 'Hentian ditambah: ' : 'Stop added: ') + s.name);
    } catch (e) { toast(e.message); }
  }

  // ---------- Buttons from the planner, day plan and transit plan ----------
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-trip]');
    if (!b) return;
    const st = N.state(), action = b.dataset.trip;
    if (action === 'stops') { if (st.route) stopsModal({ route: st.route, mode: st.mode }); return; }
    if (action === 'start' || action === 'preview') {
      if (!st.route || !st.destination) return toast(ms() ? 'Kira laluan dahulu.' : 'Find a route first.');
      if (action === 'preview') return start({ route: st.route, mode: st.mode, dest: st.destination, simulate: true });
      // Start from where the phone actually is; recalculate if that is away from the planned start.
      b.disabled = true;
      navigator.geolocation?.getCurrentPosition(async (pos) => {
        b.disabled = false;
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const s0 = st.route.geometry.coordinates[0];
        let route = st.route;
        if (metres(here, { lat: s0[1], lon: s0[0] }) > 300) {
          try { route = (await N.fetchRoute(here, st.destination, st.mode, st.via))[0]; toast(ms() ? 'Laluan dari lokasi anda sekarang.' : 'Route from where you are now.'); }
          catch (err) { return toast(err.message); }
        }
        start({ route, mode: st.mode, dest: st.destination });
      }, () => { b.disabled = false; toast(ms() ? 'Benarkan akses lokasi untuk navigasi. Atau cuba Pratonton perjalanan.' : 'Allow location access to navigate, or try Preview drive.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
      if (!navigator.geolocation) { b.disabled = false; toast('Location is unavailable in this browser.'); }
      return;
    }
    if (action === 'day' || action === 'walk-to-stop') {
      const targets = action === 'day' ? st.day : [N.nearestStop()].filter(Boolean);
      if (!targets.length) return toast(ms() ? 'Tiada destinasi.' : 'Nothing to navigate to yet.');
      const m = action === 'day' ? (['car', 'motorbike', 'walk', 'cycle'].includes(st.mode) ? st.mode : 'car') : 'walk';
      $('#modal').open && $('#modal').close();
      navigator.geolocation?.getCurrentPosition(async (pos) => {
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try { const routes = await N.fetchRoute(here, targets[0], m); start({ route: routes[0], mode: m, dest: targets[0], queue: targets.slice(1) }); }
        catch (err) { toast(err.message); }
      }, () => toast(ms() ? 'Benarkan akses lokasi untuk navigasi.' : 'Allow location access to navigate.'), { enableHighAccuracy: true, timeout: 15000 });
    }
  });

  window.NaviyaTrip = { start, stop, stopsModal, instruction, get active() { return !!nav; }, _update: update };
})();
