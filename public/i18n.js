/* Naviya language: English / Bahasa Melayu.
   Static and generated text is matched phrase by phrase, so new screens translate as soon as their phrases are added here.
   Navigation voice and instructions use I18N.lang directly. */
(() => {
  'use strict';
  let lang = 'en';
  try { lang = localStorage.getItem('naviya-lang') || ((navigator.language || '').toLowerCase().startsWith('ms') ? 'ms' : 'en'); } catch {}
  const MS = {
    // Header, navigation, home
    'Explore': 'Teroka', 'Smart Lane': 'Smart Lane', 'Road notes': 'Nota jalan', 'Saved': 'Disimpan', 'Add note': 'Tambah nota', 'Privacy comes first': 'Privasi diutamakan',
    'Map': 'Peta', 'Plan': 'Rancang', 'Nearby': 'Berdekatan', 'More': 'Lagi', 'Sign in': 'Log masuk',
    'Find your place.': 'Cari destinasi anda.', 'Across Malaysia.': 'Di seluruh Malaysia.',
    'Search anywhere. Discover what is nearby. Plan your way there with real road routes.': 'Cari di mana-mana. Teroka tempat berdekatan. Rancang perjalanan dengan laluan jalan sebenar.',
    'MADE FOR THE ROADS WE CALL HOME': 'DIBINA UNTUK JALAN RAYA KITA', 'EXPLORE MALAYSIA': 'TEROKA MALAYSIA',
    'Real mapped places & road routes · Peninsular Malaysia, Sabah & Sarawak': 'Tempat & laluan jalan sebenar · Semenanjung, Sabah & Sarawak',
    'Phone QR': 'QR telefon', 'Data & coverage': 'Data & liputan', 'Data & transparency': 'Data & ketelusan', 'Data sources': 'Sumber data',
    'TAKE YOUR NEXT JOURNEY WITH YOU': 'BAWA PERJALANAN ANDA BERSAMA', 'Try Naviya on your phone.': 'Cuba Naviya di telefon anda.',
    'Scan with your phone camera to open the mobile website.': 'Imbas dengan kamera telefon untuk buka laman mudah alih.', 'Tap the code to enlarge it.': 'Ketik kod untuk besarkan.',
    'A little more local. A little more thoughtful.': 'Lebih tempatan. Lebih prihatin.', 'Designed for Malaysia, with care.': 'Direka untuk Malaysia, dengan teliti.',
    // Search
    'Search a place or “mall near me”': 'Cari tempat atau “mall dekat saya”', 'Explore nearby': 'Teroka berdekatan', 'Explore this area': 'Teroka kawasan ini', 'My day plan': 'Pelan hari saya',
    'Find': 'Cari', 'All locations': 'Semua lokasi', 'Malls': 'Pusat beli-belah', 'Buildings & offices': 'Bangunan & pejabat', 'Towns & areas': 'Bandar & kawasan', 'Streets & addresses': 'Jalan & alamat', 'Shops & places': 'Kedai & tempat',
    'Nearest first': 'Terdekat dahulu', 'Search a name, address or postcode, or a kind of place:': 'Cari nama, alamat atau poskod, atau jenis tempat:',
    'Quick search': 'Carian pantas', 'Recent': 'Terkini', 'Clear': 'Padam', 'Nearest first': 'Terdekat dahulu', 'No matches yet': 'Tiada padanan lagi',
    'Or type a name, address, postcode, or things like': 'Atau taip nama, alamat, poskod, atau seperti', 'or': 'atau',
    'Searching places across Malaysia…': 'Mencari tempat di seluruh Malaysia…', 'Try again': 'Cuba lagi', 'use my location': 'guna lokasi saya',
    'Check the spelling, use a fuller name, or try:': 'Semak ejaan, guna nama penuh, atau cuba:', 'For the nearest ones,': 'Untuk yang terdekat,',
    // Map
    'Peninsular Malaysia · Sabah · Sarawak': 'Semenanjung Malaysia · Sabah · Sarawak', 'Peninsular Malaysia': 'Semenanjung Malaysia', 'Sabah & Sarawak': 'Sabah & Sarawak',
    'Use my location': 'Guna lokasi saya', 'My location': 'Lokasi saya', 'Search this area ↻': 'Cari kawasan ini ↻', 'Search a place or move the map to begin.': 'Cari tempat atau gerakkan peta untuk mula.',
    'Zoom in for streets and mapped buildings. Select a search result to focus.': 'Zum masuk untuk jalan dan bangunan. Pilih hasil carian untuk fokus.',
    'Some map tiles could not load. Place search is still available.': 'Sebahagian peta gagal dimuat. Carian tempat masih boleh digunakan.',
    // Planner
    'Where are we heading?': 'Kita nak ke mana?', 'Journey planner': 'Perancang perjalanan', 'Drive': 'Kereta', 'Ride': 'Motor', 'Train': 'Kereta api', 'Bus': 'Bas', 'Walk': 'Jalan kaki', 'Cycle': 'Basikal',
    'Choose starting location': 'Pilih lokasi mula', 'Choose destination': 'Pilih destinasi', 'Avoid toll roads': 'Elak jalan bertol', 'Each route shows if it uses tolls': 'Setiap laluan tunjuk jika ada tol',
    'Find my way': 'Cari laluan', 'Plan with public transport': 'Rancang dengan pengangkutan awam', 'Your route, your choice': 'Laluan anda, pilihan anda', 'Your public transport plan': 'Pelan pengangkutan awam anda',
    'No route selected': 'Tiada laluan dipilih', 'Fastest': 'Terpantas', 'Journey steps & fuel estimate': 'Langkah perjalanan & anggaran minyak', 'Save journey': 'Simpan perjalanan', 'Copy journey': 'Salin perjalanan',
    'Your destination. Your business.': 'Destinasi anda. Urusan anda.', 'Saved journeys stay on this browser. Account data stays separate.': 'Perjalanan disimpan dalam pelayar ini. Data akaun berasingan.',
    'Road-speed estimates · live traffic not included': 'Anggaran ikut had laju jalan · tanpa trafik langsung', 'Road estimates · live traffic on the fastest route': 'Anggaran jalan · trafik langsung pada laluan terpantas',
    'No toll roads on this route': 'Tiada jalan bertol dalam laluan ini', 'Road-speed estimate · no live traffic': 'Anggaran had laju · tanpa trafik langsung',
    'Checking fixed cameras…': 'Menyemak kamera tetap…', 'Details & camera locations': 'Butiran & lokasi kamera', 'Mapped fixed cameras only. Mobile traps excluded.': 'Kamera tetap yang dipetakan sahaja. Perangkap bergerak tidak termasuk.',
    'Show stations & stops nearby ↗': 'Tunjuk stesen & hentian berdekatan ↗', 'Calculating road routes…': 'Mengira laluan jalan…',
    "Choose where you start and where you're going, then tap": 'Pilih tempat mula dan destinasi, kemudian ketik',
    // Trip tools (new)
    'Start navigation': 'Mula navigasi', 'Preview drive': 'Pratonton perjalanan', 'Stops along the way': 'Hentian sepanjang jalan', 'Go home': 'Balik rumah', 'Go to work': 'Pergi kerja',
    'Home': 'Rumah', 'Work': 'Kerja', 'Set as home': 'Jadikan rumah', 'Set as work': 'Jadikan tempat kerja', 'Set home': 'Tetapkan rumah', 'Set work': 'Tetapkan tempat kerja',
    'End': 'Tamat', 'Share ETA': 'Kongsi ETA', 'Stops': 'Hentian', 'Recenter': 'Pusatkan', 'Mute': 'Senyap', 'Sound on': 'Bunyi',
    'R&R': 'R&R', 'Petrol': 'Petrol', 'Surau & masjid': 'Surau & masjid', 'EV charging': 'Pengecas EV', 'Show on map': 'Tunjuk di peta', 'Add stop': 'Tambah hentian', 'Remove stop': 'Buang hentian',
    'Prayer times on this trip': 'Waktu solat dalam perjalanan ini', 'Arrived': 'Sudah tiba', 'Next stop': 'Hentian seterusnya', 'Go': 'Pergi', 'Navigate the day': 'Navigasi sepanjang hari',
    'Timetables & fares': 'Jadual & tambang', 'Language': 'Bahasa', 'English': 'English', 'Bahasa Melayu': 'Bahasa Melayu',
    // Discover
    'THE CITY IS MORE THAN A DESTINATION': 'BANDAR LEBIH DARIPADA DESTINASI', 'Discover around your selected place.': 'Teroka sekitar tempat pilihan anda.',
    'All places': 'Semua tempat', 'Restaurants': 'Restoran', 'Hotels': 'Hotel', 'Things to do': 'Aktiviti', 'Search radius': 'Radius carian',
    'Distances are measured in a straight line.': 'Jarak diukur dalam garis lurus.', 'Select a place to discover nearby mapped locations.': 'Pilih tempat untuk teroka lokasi berdekatan.',
    'Search any Malaysian place or choose an area on the map.': 'Cari mana-mana tempat di Malaysia atau pilih kawasan di peta.', 'Your next discovery starts with a place.': 'Penemuan seterusnya bermula dengan satu tempat.',
    'Cafes': 'Kafe', 'Offices': 'Pejabat', 'Buildings': 'Bangunan', 'Schools': 'Sekolah', 'Universities': 'Universiti', 'Museums': 'Muzium', 'Transit': 'Transit', 'Pharmacies': 'Farmasi', 'ATMs': 'ATM',
    'Hospitals': 'Hospital', 'Parking': 'Parkir', 'Prayer spaces': 'Surau & masjid', 'Rest stops': 'Hentian rehat', 'View place': 'Lihat tempat', 'Directions': 'Arah', 'Add to day plan': 'Tambah ke pelan hari',
    'Use as starting point': 'Guna sebagai titik mula', 'Explore around here': 'Teroka sekitar sini', 'Check opening hours': 'Semak waktu buka',
    // Cards & menus
    'Live services': 'Perkhidmatan langsung', "What's switched on.": 'Apa yang aktif.', 'Sources & highway information ↗': 'Sumber & maklumat lebuh raya ↗', 'Live': 'Langsung', 'Not available': 'Tiada',
    'Road observations': 'Pemerhatian jalan', 'Your local road notes.': 'Nota jalan anda.', 'Save what you notice in the selected area. Notes stay on this browser.': 'Simpan apa yang anda nampak di kawasan ini. Nota kekal dalam pelayar ini.',
    'Add an observation ↗': 'Tambah pemerhatian ↗', 'Your Naviya': 'Naviya anda', 'My account & points': 'Akaun & mata saya', 'Saved journeys': 'Perjalanan disimpan', 'Privacy controls': 'Kawalan privasi',
    'Install Naviya app': 'Pasang app Naviya', 'Add to your home screen': 'Tambah ke skrin utama', 'Get the Naviya app': 'Dapatkan app Naviya', 'Install': 'Pasang',
    'Full screen, opens straight to the map': 'Skrin penuh, terus buka peta', 'Journey cost estimate': 'Anggaran kos perjalanan', 'Calculate fuel estimate': 'Kira anggaran minyak',
    'Your journey steps': 'Langkah perjalanan anda', 'Estimate fuel cost': 'Anggar kos minyak',
    // Mode notes and route cards
    'Real road routes with arrival time and toll-road check.': 'Laluan jalan sebenar dengan masa tiba dan semakan tol.',
    'Riding uses the car road network. Watch for roads closed to motorcycles, and use motorcycle lanes where provided.': 'Motosikal guna rangkaian jalan kereta. Awasi jalan yang ditutup kepada motosikal dan guna lorong motosikal jika ada.',
    'Walking routes from OpenStreetMap. Path conditions and accessibility are not verified.': 'Laluan jalan kaki dari OpenStreetMap. Keadaan laluan dan akses tidak disahkan.',
    'Cycling routes from OpenStreetMap. Closures and cycling conditions are not verified.': 'Laluan basikal dari OpenStreetMap. Penutupan dan keadaan laluan tidak disahkan.',
    'Near route · direction unverified': 'Dekat laluan · arah tidak disahkan', 'Camera count unavailable': 'Bilangan kamera tiada',
    'Road-speed estimate · no live traffic · Car road network': 'Anggaran had laju · tanpa trafik langsung · rangkaian jalan kereta',
    'Start navigating': 'Mula navigasi', 'Preview route': 'Pratonton laluan', 'Turn-by-turn navigation': 'Navigasi selekoh demi selekoh',
    'Voice guidance in English or Bahasa Melayu': 'Panduan suara dalam BM atau English', 'Prayer times & surau on route': 'Waktu solat & surau di laluan',
    'JAKIM parameters, calculated on your device': 'Parameter JAKIM, dikira pada peranti anda', 'R&R and petrol along the way': 'R&R dan petrol sepanjang jalan',
    'From OpenStreetMap': 'Dari OpenStreetMap', 'Road routes & arrival times': 'Laluan jalan & masa tiba', 'Drive, ride, walk, cycle': 'Kereta, motor, jalan kaki, basikal',
    'Toll-road check': 'Semakan jalan bertol', 'Fixed speed cameras': 'Kamera laju tetap', 'Mapped cameras near your route': 'Kamera dipetakan dekat laluan anda',
    'Live buses & KTM trains': 'Bas & tren KTM langsung', 'Official data.gov.my positions': 'Kedudukan rasmi data.gov.my', 'Live traffic': 'Trafik langsung',
    'Needs a traffic data provider': 'Perlukan pembekal data trafik', 'Smart Lane status': 'Status Smart Lane', 'Shows if a route uses tolls; rates via LLM': 'Tunjuk jika laluan ada tol; kadar melalui LLM'
  };
  const PATTERNS = [
    [/^Alternative (\d+)$/, 'Alternatif $1'], [/^(\d+) routes?$/, '$1 laluan'], [/^Around (.+)$/, 'Sekitar $1'], [/^(\d+) matches?$/, '$1 padanan'],
    [/^Malls near (.+)$/, 'Pusat beli-belah dekat $1'], [/^Restaurants near (.+)$/, 'Restoran dekat $1'], [/^Petrol stations near (.+)$/, 'Stesen minyak dekat $1'],
    [/^(.+) across Malaysia$/, '$1 di seluruh Malaysia'], [/^(\d+) mapped fixed cameras?$/, '$1 kamera tetap dipetakan'],
    [/^Uses toll roads · (.+)$/, 'Guna jalan bertol · $1'], [/^· (.+) km · arrive ~(.+)$/, '· $1 km · tiba ~$2'], [/^Walk to the nearest (station|stop)$/, (m, k) => 'Jalan kaki ke ' + (k === 'station' ? 'stesen' : 'hentian') + ' terdekat'], [/^Near (.+)$/, 'Dekat $1'], [/^Nearest first$/, 'Terdekat dahulu']
  ];
  const t = (en, vars) => {
    let out = lang === 'ms' ? (MS[en] ?? en) : en;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll('{' + k + '}', v);
    return out;
  };
  const translateText = (text) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 220) return null;
    if (MS[trimmed]) return text.replace(trimmed, MS[trimmed]);
    for (const [re, rep] of PATTERNS) if (re.test(trimmed)) return text.replace(trimmed, trimmed.replace(re, rep));
    return null;
  };
  function translate(root) {
    if (lang !== 'ms' || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement?.closest('script,style,textarea,input,.leaflet-tile-container') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    if (root.nodeType === 3) nodes.push(root);
    for (const n of nodes) { const next = translateText(n.nodeValue); if (next !== null && next !== n.nodeValue) n.nodeValue = next; }
    const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('[placeholder],[aria-label],[title]')] : [];
    for (const el of els) for (const a of ['placeholder', 'aria-label', 'title']) { const v = el.getAttribute?.(a); if (v) { const next = translateText(v); if (next) el.setAttribute(a, next); } }
  }
  function start() {
    document.documentElement.lang = lang === 'ms' ? 'ms-MY' : 'en-MY';
    if (lang !== 'ms') return;
    translate(document.body);
    new MutationObserver((list) => { for (const m of list) { if (m.type === 'characterData') { const next = translateText(m.target.nodeValue); if (next !== null && next !== m.target.nodeValue) m.target.nodeValue = next; } else m.addedNodes.forEach((n) => translate(n.nodeType === 1 ? n : n.parentElement)); } }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  window.I18N = {
    get lang() { return lang; },
    t,
    set(next) { try { localStorage.setItem('naviya-lang', next); } catch {} location.reload(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
