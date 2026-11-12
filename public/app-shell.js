/* Naviya app shell: install as an app, offline start, full-screen map on phones, deep links. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const phone = () => matchMedia('(max-width:760px)').matches;
  const store = { get(k) { try { return localStorage.getItem('naviya-' + k); } catch { return null; } }, set(k, v) { try { localStorage.setItem('naviya-' + k, v); } catch {} } };

  // ---- Offline start + installability ----
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) document.body.classList.add('installed-app');
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  let deferred = null;
  const canInstall = () => !standalone && (deferred || ios);

  function installHelp() {
    const modal = $('#modal');
    $('#modal-title').textContent = 'Install Naviya';
    $('#modal-content').innerHTML = ios
      ? '<p>Add Naviya to your Home Screen for a full-screen app that opens straight to the map.</p><ol class="install-steps"><li>Tap the <b>Share</b> button in Safari’s toolbar.</li><li>Scroll and choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>.</li></ol>'
      : '<p>Use your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>';
    if (!modal.open) modal.showModal();
  }
  async function install() {
    if (!deferred) return installHelp();
    deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    deferred = null;
    banner.hidden = true;
    if (choice?.outcome === 'accepted') store.set('install-dismissed', '1');
  }

  // Small install card on phones, shown once until dismissed.
  const banner = document.createElement('div');
  banner.className = 'install-card';
  banner.hidden = true;
  banner.innerHTML = '<img src="/app-icons/icon-192.png" alt="" width="40" height="40"><div><b>Get the Naviya app</b><small>Full screen, opens straight to the map</small></div><button type="button" class="install-go">Install</button><button type="button" class="install-x" aria-label="Dismiss">×</button>';
  document.body.append(banner);
  banner.querySelector('.install-go').onclick = install;
  banner.querySelector('.install-x').onclick = () => { banner.hidden = true; store.set('install-dismissed', '1'); };
  const maybeShowBanner = () => { banner.hidden = !(canInstall() && phone() && store.get('install-dismissed') !== '1'); };
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; maybeShowBanner(); });
  addEventListener('appinstalled', () => { banner.hidden = true; store.set('install-dismissed', '1'); });
  setTimeout(maybeShowBanner, 4000);

  // "Install app" row in the phone More menu (the menu is rebuilt each time it opens).
  new MutationObserver(() => {
    const menu = document.querySelector('.mobile-more-menu');
    if (!menu || menu.querySelector('[data-install]') || !canInstall()) return;
    const row = document.createElement('button');
    row.dataset.install = '1';
    row.innerHTML = NI('download') + '<div><b>Install Naviya app</b><small>Add to your home screen</small></div>';
    row.onclick = () => { $('#modal').close(); install(); };
    menu.prepend(row);
  }).observe($('#modal-content'), { childList: true });

  // ---- Header height, for the sticky search bar ----
  const header = $('header');
  const setHeader = () => document.documentElement.style.setProperty('--header-h', (header?.offsetHeight || 64) + 'px');
  setHeader();
  addEventListener('resize', setHeader);

  // ---- Sticky search: collapse the two shortcut buttons once the search bar sticks ----
  const bar = $('.explore-bar');
  if (bar && 'IntersectionObserver' in window) {
    const marker = document.createElement('div');
    marker.className = 'search-stick-marker';
    marker.style.height = '1px';
    bar.before(marker);
    new IntersectionObserver(([e]) => document.body.classList.toggle('search-stuck', !e.isIntersecting && e.boundingClientRect.top < 200), { rootMargin: '-' + ((header?.offsetHeight || 64) + 2) + 'px 0px 0px 0px' }).observe(marker);
  }

  // ---- Full-screen map on phones ----
  const mapBox = $('#map');
  const full = document.createElement('button');
  full.type = 'button';
  full.className = 'map-fullscreen';
  full.setAttribute('aria-label', 'Full-screen map');
  const icon = (d) => '<svg class="ni" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  full.innerHTML = '<span class="open">' + icon('M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7') + '</span><span class="close">' + icon('M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7') + '</span>';
  mapBox.append(full);
  const setFull = (on) => {
    document.body.classList.toggle('map-full', on);
    full.setAttribute('aria-label', on ? 'Exit full-screen map' : 'Full-screen map');
    full.setAttribute('aria-pressed', String(on));
    setTimeout(() => window.Naviya?.map?.invalidateSize(), 60);
    if (on) history.pushState({ mapFull: true }, '');
  };
  full.onclick = () => document.body.classList.contains('map-full') ? history.back() : setFull(true);
  addEventListener('popstate', () => { if (document.body.classList.contains('map-full')) setFull(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('map-full')) history.back(); });

  // Compact labels on the phone map controls.
  const locate = $('#locate-me');
  if (locate) { locate.innerHTML = NI('locate') + '<span>My location</span>'; locate.setAttribute('aria-label', 'Use my location'); }
  const report = $('#report');
  if (report) { report.setAttribute('aria-label', 'Add road note'); report.querySelector('use')?.setAttribute('href', '/icons.svg#flag'); }

  // ---- Deep links: ?q=mall+near+me, ?view=saved (used by home-screen shortcuts) ----
  const params = new URLSearchParams(location.search);
  addEventListener('load', () => {
    if (params.get('q')) window.Naviya?.search(params.get('q').slice(0, 120));
    else if (params.get('view') === 'saved') window.Naviya?.savedJourneys();
  });
})();
