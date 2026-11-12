/* Naviya Malaysia: real mapped places, road routes and official live transit. No simulated results. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem("laluan-" + key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem("laluan-" + key, JSON.stringify(value));
    } catch {
      toast("Storage is unavailable; your changes last for this visit.");
    }
  };
  const categoryList = [["all", "compass", "All places"], ["Restaurant", "restaurant", "Restaurants"], ["Cafe", "coffee", "Cafes"], ["Mall", "mall", "Malls"], ["Office", "office", "Offices"], ["Building", "building", "Buildings"], ["School", "school", "Schools"], ["University", "university", "Universities"], ["Hotel", "hotel", "Hotels"], ["Museum", "museum", "Museums"], ["Things to do", "sparkles", "Things to do"], ["Transit", "transit", "Transit"], ["Pharmacy", "pharmacy", "Pharmacies"], ["ATM", "atm", "ATMs"], ["Petrol", "fuel", "Petrol"], ["EV charging", "ev", "EV charging"], ["Hospital", "pharmacy", "Hospitals"], ["Parking", "car", "Parking"], ["Surau", "museum", "Prayer spaces"], ["Rest stop", "coffee", "Rest stops"]];
  const iconFor = (type) => type === "Office building" ? "office" : /building|apartments/i.test(type || "") ? "building" : categoryList.find((c) => c[0] === type)?.[1] || "map";
  let visiblePlaces = 12, nearbyVersion = 0;
  let cameraAbort = null, cameraStatus = null;
  let trafficAvailable = false, trafficInfo = null, trafficLayer = null, transitTimer = null, transitVehicles = [];
  const roadModes = ["car", "motorbike", "walk", "cycle"], transitModes = ["train", "bus"];
  const modeLabel = { car: "Drive", motorbike: "Ride", walk: "Walk", cycle: "Cycle", train: "Train", bus: "Bus" };
  const clock = (secondsFromNow) => new Date(Date.now() + secondsFromNow * 1e3).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
  const minutes = (s) => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min"; };
  let area = null, category = "all", radius = 3, mode = "car", routeResults = [], chosen = 0, places = [], searchState = null, nearbyAbort = null, routeAbort = null, requestId = 0;
  let theme = read("theme", "light"), saved = read("saved", []), day = read("day", []), reports = read("reports", []);
  if (!Array.isArray(saved)) saved = [];
  if (!Array.isArray(day)) day = [];
  if (!Array.isArray(reports)) reports = [];
  day = day.map((p) => typeof p === "string" ? { name: p } : p).filter((p) => p && typeof p.name === "string");
  function retryAfter(button, seconds, action) {
    const original = button.textContent, until = Date.now() + seconds * 1e3;
    button.onclick = action;
    if (seconds <= 1) return;
    button.disabled = true;
    const timer = setInterval(() => {
      if (!button.isConnected) {
        clearInterval(timer);
        return;
      }
      const left = Math.ceil((until - Date.now()) / 1e3);
      button.textContent = left > 0 ? "Try again in " + left + "s" : original;
      if (left <= 0) {
        clearInterval(timer);
        button.disabled = false;
      }
    }, 1e3);
  }
  function toast(text) {
    $("#toast").textContent = text;
    $("#toast").classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 4500);
  }
  function applyTheme() {
    document.body.classList.toggle("dark", theme === "dark");
    $("#theme").innerHTML = NI(theme === "dark" ? "sun" : "moon");
    $("#theme").setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }
  applyTheme();
  $("#theme").onclick = () => {
    theme = theme === "dark" ? "light" : "dark";
    write("theme", theme);
    applyTheme();
  };
  function modal(title, content) {
    $("#modal-title").textContent = title;
    $("#modal-content").innerHTML = content;
    if (!$("#modal").open) $("#modal").showModal();
  }
  $("#close-modal").onclick = () => $("#modal").close();
  $("#modal").onclick = (e) => {
    if (e.target !== $("#modal")) return;
    const r = $("#modal").getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $("#modal").close();
  };
  async function api(url, signal) {
    if (!navigator.onLine) throw new Error("You are offline. Reconnect to search places or calculate routes.");
    const response = await fetch(url, { signal: AbortSignal.any([...signal ? [signal] : [], AbortSignal.timeout(25e3)]) });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("The service did not return a valid response. Please retry.");
    }
    if (!response.ok) {
      const error = new Error(data.error || "Service temporarily unavailable.");
      error.retryAfter = Math.max(1, Math.min(300, Number(response.headers.get("Retry-After")) || 1));
      throw error;
    }
    return data;
  }
  const map = L.map("actual-map", { zoomControl: false, minZoom: 4, maxZoom: 19 }).setView([4.4, 109.4], 5);
  if (matchMedia("(max-width:900px)").matches) map.fitBounds([[0.8, 99.5], [7.5, 119.6]], { padding: [12, 12] });
  L.control.zoom({ position: "topright" }).addTo(map);
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(map);
  tiles.on("tileerror", () => {
    $("#map-state").textContent = "Some map tiles could not load. Place search is still available.";
  });
  const cameraLayer = L.layerGroup().addTo(map);
  const poiLayer = L.layerGroup().addTo(map), areaLayer = L.layerGroup().addTo(map), roadLayer = L.layerGroup().addTo(map);
  // Only offer "Search this area" after the visitor moves the map, not after the app recentres it.
  let userZoom = false;
  const mapBox = map.getContainer();
  ["wheel", "dblclick"].forEach((t) => mapBox.addEventListener(t, () => userZoom = true, { passive: true }));
  mapBox.addEventListener("touchmove", (e) => { if (e.touches.length > 1) userZoom = true; }, { passive: true });
  mapBox.querySelectorAll(".leaflet-control-zoom a").forEach((a) => a.addEventListener("click", () => userZoom = true));
  map.on("dragend", () => { $("#search-area").hidden = false; });
  map.on("zoomend", () => { if (userZoom) $("#search-area").hidden = false; userZoom = false; });
  const transitLayer = L.layerGroup().addTo(map);
  const inside = (p) => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon) && +p.lat >= 0 && +p.lat <= 8 && +p.lon >= 99 && +p.lon <= 120;
  const distance = (km) => km < 1 ? Math.round(km * 1e3) + " m" : km.toFixed(1) + " km";
  function setField(id, point) {
    const f = $(id);
    f.value = point.name;
    f.dataset.lat = point.lat;
    f.dataset.lon = point.lon;
    f.dataset.address = point.address || "";
    f.dataset.placeId = point.id || "";
  }
  function fieldPoint(id) {
    const f = $(id);
    if (!f.dataset.lat || !f.dataset.lon) return null;
    return { name: f.value, lat: +f.dataset.lat, lon: +f.dataset.lon, address: f.dataset.address || "", id: f.dataset.placeId || "" };
  }
  function setArea(point, fit = true) {
    if (!inside(point)) {
      toast("Choose a place within Malaysia.");
      return;
    }
    area = { ...point, lat: +point.lat, lon: +point.lon };
    $("#area-label").textContent = area.name;
    $("#discovery-title").textContent = "Around " + area.name;
    $("#map-state").textContent = "Mapped places \xB7 Malaysia";
    $("#nearby-open").innerHTML = NI("locate") + "<span>Explore this area</span>";
    areaLayer.clearLayers();
    L.marker([area.lat, area.lon], { title: area.name, alt: area.name, icon: L.divIcon({ className: "area-map-pin", html: NI("map"), iconSize: [34, 40], iconAnchor: [17, 39] }) }).bindTooltip(esc(area.name), { direction: "top" }).addTo(areaLayer);
    if (fit) map.setView([area.lat, area.lon], area.category === "area" ? 12 : ["building", "office"].includes(area.category) ? 17 : 16);
    $("#search-area").hidden = true;
    loadNearby();
  }
  $("#search-area").onclick = () => {
    const c = map.getCenter();
    setArea({ name: "Selected map area", lat: c.lat, lon: c.lng, address: "Map centre" }, false);
  };
  $("#map-reset").onclick = () => {
    if (area) map.setView([area.lat, area.lon], area.category === "area" ? 12 : ["building", "office"].includes(area.category) ? 17 : 16);
    else map.setView([4.4, 109.4], 5);
  };
  let myLocation = null;
  // Asks for the device location only when the visitor taps a location button. `after` lets search reuse it.
  function locateMe(after) {
    if (!navigator.geolocation) {
      toast("Location is unavailable in this browser. Search for a place instead.");
      return;
    }
    $("#locate-me").disabled = true;
    navigator.geolocation.getCurrentPosition((position) => {
      $("#locate-me").disabled = false;
      const p = { name: "My current location", lat: position.coords.latitude, lon: position.coords.longitude, address: "Location provided by your device" };
      if (!inside(p)) {
        toast("Your location is outside the supported Malaysian area. Please search for a Malaysian place.");
        return;
      }
      myLocation = p;
      if (after) return after(p);
      setField("#origin", p);
      invalidateRoute();
      setArea(p);
    }, () => {
      $("#locate-me").disabled = false;
      toast("Location could not be accessed. You can still search for a town, address or landmark.");
    }, { enableHighAccuracy: false, timeout: 1e4, maximumAge: 6e4 });
  }
  $("#locate-me").onclick = () => locateMe();
  function renderCategories() {
    const html = categoryList.map((c) => `<button data-category="${c[0]}" class="${category === c[0] ? "active" : ""}" aria-pressed="${category === c[0]}"><span>${NI(c[1])}</span>${c[2]}</button>`).join("");
    $("#categories").innerHTML = html;
    $$("[data-category]").forEach((b) => b.onclick = () => chooseCategory(b.dataset.category));
    $$("[data-filter]").forEach((b) => b.classList.toggle("active", b.dataset.filter === category));
  }
  function chooseCategory(next) {
    category = next;
    renderCategories();
    loadNearby();
  }
  renderCategories();
  $$("[data-filter]").forEach((b) => b.onclick = () => chooseCategory(b.dataset.filter));
  $("#radius").onchange = () => {
    radius = +$("#radius").value;
    loadNearby();
  };
  function initialDiscovery() {
    $("#discovery-context").textContent = "Search any Malaysian place or choose an area on the map.";
    $("#stops").innerHTML = '<div class="discovery-empty">' + NI("map") + '<h3>Your next discovery starts with a place.</h3><p>Search a mall, address or town. Nearby restaurants, hotels and other mapped places will appear here.</p><div class="city-shortcuts">' + ["Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Kota Kinabalu", "Kuching"].map((city) => `<button data-city="${city}">${city} \u2197</button>`).join("") + "</div></div>";
    $$("[data-city]").forEach((b) => b.onclick = () => {
      const f = $("#place-search");
      f.value = b.dataset.city;
      f.focus();
      startSearch(f, true);
    });
  }
  async function loadNearby() {
    const version = ++nearbyVersion;
    visiblePlaces = 12;
    nearbyAbort?.abort();
    poiLayer.clearLayers();
    places = [];
    if (!area) {
      initialDiscovery();
      return;
    }
    const center = { ...area }, requestedCategory = category, requestedRadius = radius;
    nearbyAbort = new AbortController();
    $("#discovery-context").textContent = `Searching ${category === "all" ? "mapped places" : category.toLowerCase()} within ${radius} km of ${area.name}\u2026`;
    $("#stops").innerHTML = '<div class="discovery-empty loading-state">' + NI("search") + "<p>Finding real places around this location\u2026</p></div>";
    try {
      const data = await api("/api/nearby?" + new URLSearchParams({ lat: center.lat, lon: center.lon, category: requestedCategory, radius: requestedRadius }), nearbyAbort.signal);
      if (version !== nearbyVersion) return;
      places = data.places || [];
      $("#discovery-context").textContent = `${places.length} mapped places \xB7 Within ${radius} km of ${area.name} \xB7 Straight-line distances \xB7 OpenStreetMap`;
      renderPlaces();
    } catch (e) {
      if (e.name === "AbortError" || version !== nearbyVersion) return;
      $("#discovery-context").textContent = "Nearby service unavailable";
      $("#stops").innerHTML = `<div class="discovery-empty"><h3>Places could not be loaded.</h3><p>${esc(e.message)}</p><button id="retry-nearby">Retry nearby search \u2197</button></div>`;
      retryAfter($("#retry-nearby"), e.retryAfter || 1, loadNearby);
    }
  }
  function renderPlaces() {
    poiLayer.clearLayers();
    if (!places.length) {
      $("#stops").innerHTML = '<div class="discovery-empty">' + NI("search") + "<h3>No mapped results in this radius.</h3><p>Try another category or a larger radius. An empty map result does not mean no businesses exist here.</p></div>";
      return;
    }
    $("#stops").innerHTML = places.slice(0, visiblePlaces).map((p, i) => `<button class="stop place-card" data-place="${i}"><div class="place-art art-${esc(p.type.replaceAll(" ", "-").toLowerCase())}"><span>${NI(iconFor(p.type))}</span><small>${esc(p.type)}</small><span class="art-arrow">${NI("arrow")}</span></div><div class="place-copy"><b>${esc(p.name)}</b><small>${esc(p.address)}</small><p>${distance(p.distance)} from selected area</p><span class="place-meta">View place <span>\u2192</span></span></div></button>`).join("");
    if (places.length > visiblePlaces) {
      const more = document.createElement("button");
      more.className = "load-more-places";
      more.textContent = "Show more places (" + (places.length - visiblePlaces) + ")";
      more.onclick = () => {
        visiblePlaces += 12;
        renderPlaces();
      };
      $("#stops").append(more);
    }
    $$("[data-place]").forEach((b) => b.onclick = () => placeDetails(places[+b.dataset.place]));
    places.forEach((p) => {
      L.marker([p.lat, p.lon], { title: p.name, alt: p.name, icon: L.divIcon({ className: "place-map-pin", html: NI(iconFor(p.type)), iconSize: [29, 29], iconAnchor: [14, 14] }) }).bindTooltip(esc(p.name)).on("click", () => placeDetails(p)).addTo(poiLayer);
    });
  }
  function addToDay(p) {
    if (day.some((x) => x.name === p.name && x.lat === p.lat && x.lon === p.lon)) {
      toast("Already in your day plan.");
      return;
    }
    day.push({ ...p });
    write("day", day);
    $("#day-count").textContent = day.length;
    toast("Added to your day plan on this browser.");
  }
  function placeDetails(p) {
    modal(p.name, `<div class="place-hero"><span>${NI(iconFor(p.type))}</span><div><b>${esc(p.type || "Mapped place")}</b><small>${esc(p.address)}</small></div></div><p class="coordinate-text">${(+p.lat).toFixed(6)}, ${(+p.lon).toFixed(6)}${Number.isFinite(p.distance) ? " \xB7 " + distance(p.distance) + " from selected area" : ""}</p><div class="detail-facts"><div>${NI("clock")}<b>Check opening hours</b><small><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + " " + (p.address || ""))}" target="_blank" rel="noopener">Hours & reviews on Google Maps \u2197</a></small></div><div>${NI("map")}<b>OpenStreetMap place</b><small>Community-maintained map data</small></div></div><div class="detail-actions"><button class="primary" id="place-directions">Directions ${NI("arrow")}</button><button id="place-day">${NI("heart")} Add to day plan</button></div><div class="place-secondary"><button id="place-start">Use as starting point</button><button id="place-explore">Explore around here</button><button id="place-focus">Show on map</button></div><p class="small-print">Place data may be incomplete or outdated. Nearby distances are straight-line distances. Route estimates use road-network speeds without live traffic.</p>`);
    $("#place-directions").onclick = () => {
      setField("#destination", p);
      invalidateRoute();
      $("#modal").close();
      setArea(p);
      $(".planner").scrollIntoView({ behavior: "smooth", block: "start" });
      if (fieldPoint("#origin")) findRoutes();
      else toast("Destination selected. Choose an exact starting point to find routes.");
    };
    $("#place-start").onclick = () => {
      setField("#origin", p);
      invalidateRoute();
      $("#modal").close();
      toast("Starting point selected.");
    };
    $("#place-explore").onclick = () => {
      $("#modal").close();
      setArea(p);
      $(".discover").scrollIntoView({ behavior: "smooth", block: "start" });
    };
    $("#place-focus").onclick = () => {
      $("#modal").close();
      map.setView([p.lat, p.lon], 17);
      $("#map").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    $("#place-day").onclick = () => addToDay(p);
  }
  function closeSearch() {
    if (searchState) {
      clearTimeout(searchState.timer);
      searchState.abort?.abort();
      searchState = null;
    }
    $$(".live-results").forEach((b) => b.hidden = true);
    ["#place-search", "#origin", "#destination"].forEach((id) => {
      $(id).setAttribute("aria-expanded", "false");
      $(id).removeAttribute("aria-activedescendant");
    });
  }
  const routeBox = document.createElement("div");
  routeBox.id = "route-search-results";
  routeBox.className = "live-results";
  routeBox.role = "listbox";
  routeBox.hidden = true;
  document.body.append(routeBox);
  const mainSearchBox = $("#search-results");
  mainSearchBox.classList.add("live-results");
  document.body.append(mainSearchBox);
  [routeBox, mainSearchBox].forEach((box) => box.classList.add("search-portal"));
  function positionSearch(state) {
    if (!state || state.box.hidden) return;
    const anchor = state.field.id === "place-search" ? $(".global-search") : $(".locations"), r = anchor.getBoundingClientRect(), vw = document.documentElement.clientWidth, viewportTop = window.visualViewport?.offsetTop || 0, vh = (window.visualViewport?.height || window.innerHeight) + viewportTop;
    if (r.bottom < 0 || r.top > vh) {
      closeSearch();
      return;
    }
    const below = vh - r.bottom - 12, above = r.top - viewportTop - 12, up = below < 220 && above > below, cap = Math.max(90, Math.min(360, up ? above : below)), width = Math.min(Math.max(r.width, 290), vw - 16);
    Object.assign(state.box.style, { position: "fixed", width: width + "px", maxHeight: cap + "px", left: Math.max(8, Math.min(r.left, vw - width - 8)) + "px", right: "auto", bottom: "auto" });
    const h = Math.min(cap, state.box.scrollHeight || cap);
    state.box.style.top = Math.max(viewportTop + 8, Math.min(up ? r.top - h - 6 : r.bottom + 6, vh - h - 8)) + "px";
  }
  window.addEventListener("resize", () => positionSearch(searchState));
  window.visualViewport?.addEventListener("resize", () => positionSearch(searchState));
  window.visualViewport?.addEventListener("scroll", () => positionSearch(searchState));
  document.addEventListener("scroll", (e) => {
    if (searchState && !searchState.box.contains(e.target)) positionSearch(searchState);
  }, true);
  $("#search-kind").onchange = () => {
    const field = searchState?.field || $("#place-search");
    if (field.value.trim().length >= 2) startSearch(field, true);
  };
  $("#search-bias").checked = read("nearest", true) !== false;
  $("#search-bias").onchange = () => {
    write("nearest", $("#search-bias").checked);
    const field = searchState?.field || $("#place-search");
    if (field.value.trim().length >= 2) startSearch(field, true);
  };
  // Where "nearest" means: the other end of the journey, the selected area, your location, or the map you're looking at.
  function searchBias(field) {
    if (!$("#search-bias").checked) return null;
    const other = field.id === "origin" ? fieldPoint("#destination") : field.id === "destination" ? fieldPoint("#origin") : null;
    if (other && inside(other)) return { lat: other.lat, lon: other.lon, name: other.name };
    if (area) return { lat: area.lat, lon: area.lon, name: area.name };
    if (myLocation) return { lat: myLocation.lat, lon: myLocation.lon, name: "you" };
    if (map.getZoom() >= 9) { const c = map.getCenter(); return { lat: c.lat, lon: c.lng, name: "the map area" }; }
    return null;
  }
  const quickSearches = [["mall", "Malls"], ["restoran", "Restoran"], ["petrol", "Petrol"], ["klinik", "Klinik"], ["surau", "Surau & masjid"], ["atm", "ATM"], ["hotel", "Hotel"], ["parking", "Parking"]];
  function showQuickSearches(field) {
    closeSearch();
    const box = field.id === "place-search" ? $("#search-results") : routeBox;
    const state = { field, box, q: "", index: -1, places: [], timer: null, abort: null };
    searchState = state;
    box.hidden = false;
    const where = searchBias(field);
    box.innerHTML = `<div class="search-heading">Quick search <span>${where ? "near " + esc(where.name) : "Malaysia"}</span></div><div class="quick-chips">${quickSearches.map(([q, label]) => `<button type="button" data-quick="${q}">${label}</button>`).join("")}</div><div class="search-tip">Or type a name, address, postcode, or things like <b>mall dekat JB</b> or <b>petrol near me</b>.</div>`;
    box.querySelectorAll("[data-quick]").forEach((b) => b.onclick = () => { field.value = b.dataset.quick; field.focus(); startSearch(field, true); });
    positionSearch(state);
  }
  function startSearch(field, immediate = false) {
    closeSearch();
    const q = field.value.trim();
    if (!q) return showQuickSearches(field);
    if (q.length < 2) return;
    const box = field.id === "place-search" ? $("#search-results") : routeBox;
    const state = { field, box, q, kind: field.id === "place-search" ? $("#search-kind").value : "all", bias: searchBias(field), index: -1, places: [], timer: null, abort: null };
    searchState = state;
    box.hidden = false;
    field.setAttribute("aria-expanded", "true");
    box.innerHTML = '<div class="empty">Searching places across Malaysia\u2026</div>';
    positionSearch(state);
    state.timer = setTimeout(() => runSearch(state), immediate ? 0 : 350);
  }
  async function runSearch(state) {
    state.abort?.abort();
    state.abort = new AbortController();
    try {
      const data = await api("/api/search?" + new URLSearchParams({ q: state.q, kind: state.kind, ...state.bias ? { lat: state.bias.lat, lon: state.bias.lon, near: state.bias.name } : {} }), state.abort.signal);
      if (searchState !== state) return;
      state.places = data.places || [];
      const intent = data.intent;
      const heading = intent ? intent.near ? `${esc(intent.label)} near ${esc(intent.near)}` : `${esc(intent.label)} across Malaysia` : state.places.length ? `${state.places.length} match${state.places.length === 1 ? "" : "es"}` : "No matches yet";
      const where = intent ? (intent.near ? "Nearest first" : "") : state.bias ? "Near " + esc(state.bias.name) : "Malaysia";
      const locateHint = intent && !intent.near ? `<div class="search-tip">${intent.placeText ? `Couldn't find "${esc(intent.placeText)}". Try the full town name, or ` : "For the nearest ones, "}<button type="button" class="link-btn" id="search-locate">${NI("locate")} use my location</button></div>` : "";
      const rows = state.places.map((p, i) => `<button role="option" id="${state.field.id}-option-${i}" aria-selected="false" data-result="${i}"><span class="suggest-icon">${NI(iconFor(p.type))}</span><div><b>${esc(p.name)}</b><small>${Number.isFinite(p.distance) ? `<em class="dist">${distance(p.distance)}</em> \xB7 ` : ""}${esc(p.type)} \xB7 ${esc(p.address)}</small></div><span>${NI("arrow")}</span></button>`).join("");
      const tries = intent ? ["mall dekat KLCC", "petrol near me", "klinik di Shah Alam"] : ["Sunway Pyramid", "Jalan Ampang", "mall dekat JB", "81300"];
      const empty = `<div class="empty"><b>No places found for "${esc(state.q)}".</b><br>Check the spelling, use a fuller name, or try:<div class="quick-chips">${tries.map((t) => `<button type="button" data-try="${esc(t)}">${esc(t)}</button>`).join("")}</div></div>`;
      state.box.innerHTML = `<div class="search-heading">${heading} <span>${where}</span></div>${locateHint}${state.places.length ? rows : empty}<div class="search-credit">\xA9 OpenStreetMap contributors \xB7 Photon</div>`;
      state.box.querySelectorAll("[data-result]").forEach((b) => b.onclick = () => pickSearch(state, +b.dataset.result));
      state.box.querySelectorAll("[data-try]").forEach((b) => b.onclick = () => { state.field.value = b.dataset.try; state.field.focus(); startSearch(state.field, true); });
      const loc = state.box.querySelector("#search-locate");
      if (loc) loc.onclick = () => locateMe(() => { state.field.focus(); startSearch(state.field, true); });
      positionSearch(state);
    } catch (e) {
      if (e.name === "AbortError" || searchState !== state) return;
      state.box.innerHTML = `<div class="empty">${esc(e.message)}<br><button class="retry-search">Try again</button></div>`;
      retryAfter(state.box.querySelector("button"), e.retryAfter || 1, () => runSearch(state));
    }
  }
  function pickSearch(state, i) {
    const p = state.places[i];
    if (!p) return;
    const field = state.field;
    closeSearch();
    if (field.id === "place-search") {
      field.value = p.name;
      setArea(p);
      toast("Exploring around " + p.name);
      if (matchMedia("(max-width:900px)").matches) $("#map").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setField("#" + field.id, p);
      invalidateRoute();
      if (field.id === "destination") setArea(p);
      toast("Exact location selected: " + p.name);
    }
  }
  ["#place-search", "#origin", "#destination"].forEach((id) => {
    const f = $(id);
    f.removeAttribute("list");
    f.maxLength = 120;
    f.setAttribute("role", "combobox");
    f.setAttribute("aria-autocomplete", "list");
    f.setAttribute("aria-controls", id === "#place-search" ? "search-results" : "route-search-results");
    f.setAttribute("aria-expanded", "false");
    f.onfocus = () => {
      if (!f.value.trim()) showQuickSearches(f);
    };
    f.oninput = () => {
      delete f.dataset.lat;
      delete f.dataset.lon;
      if (id !== "#place-search") invalidateRoute();
      startSearch(f);
    };
    f.onkeydown = (e) => {
      const s = searchState;
      if (e.key === "Escape") {
        closeSearch();
        return;
      }
      if (e.key === "Enter" && s?.field === f) {
        e.preventDefault();
        if (s.places.length) pickSearch(s, s.index < 0 ? 0 : s.index);
        else if (s.q) {
          clearTimeout(s.timer);
          runSearch(s);
        }
        return;
      }
      if (!s || s.field !== f || !s.places.length || !["ArrowDown", "ArrowUp"].includes(e.key)) return;
      e.preventDefault();
      s.index = s.index < 0 ? e.key === "ArrowDown" ? 0 : s.places.length - 1 : (s.index + (e.key === "ArrowDown" ? 1 : -1) + s.places.length) % s.places.length;
      s.box.querySelectorAll("[data-result]").forEach((b, i) => {
        b.classList.toggle("highlighted", i === s.index);
        b.setAttribute("aria-selected", i === s.index);
      });
      const active = s.box.querySelector(`[data-result="${s.index}"]`);
      f.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    };
  });
  document.addEventListener("click", (e) => {
    // A button inside the results that redrew the list is no longer in the page; that click must not close search.
    if (!e.target.isConnected) return;
    if (!e.target.closest(".global-search") && !e.target.closest(".locations") && !e.target.closest(".search-portal")) closeSearch();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !$("#modal").open) {
      e.preventDefault();
      $("#place-search").focus();
    }
  });
  function invalidateRoute() {
    cameraLayer.clearLayers();
    cameraAbort?.abort();
    cameraStatus = null;
    $("#camera-coverage")?.remove();
    requestId++;
    routeAbort?.abort();
    clearInterval(transitTimer);
    transitLayer.clearLayers();
    trafficInfo = null;
    $("#planform .primary").disabled = false;
    routeResults = [];
    chosen = 0;
    roadLayer.clearLayers();
    renderRoutes();
  }
  function cameraSummary(i) {
    if (cameraStatus?.loading) return "Checking fixed cameras\u2026";
    if (!cameraStatus?.available) return "Camera count unavailable";
    const r = cameraStatus.routes[i];
    return `<b>${r.count} mapped fixed camera${r.count === 1 ? "" : "s"}</b><small>Near route \xB7 direction unverified</small>`;
  }
  function drawCameras() {
    cameraLayer.clearLayers();
    if (!cameraStatus?.available || !["car", "motorbike"].includes(mode)) return;
    for (const c of cameraStatus.routes[chosen].cameras) L.circleMarker([c.lat, c.lon], { radius: 7, color: "#fff", weight: 2, fillColor: "#a95723", fillOpacity: 1 }).bindTooltip(esc(c.name) + " \xB7 mapped fixed camera").addTo(cameraLayer);
  }
  function cameraDetails() {
    if (!cameraStatus?.available) return;
    const route = cameraStatus.routes[chosen];
    modal("Fixed cameras near this route", `<div class="status-note">${route.count} mapped fixed camera${route.count === 1 ? "" : "s"} \xB7 within 50 metres</div><p>${esc(cameraStatus.coverage)}</p><p>Map data: ${esc(cameraStatus.dataAsOf?.slice(0, 10))}<br>Checked: ${esc(new Date(cameraStatus.checkedAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }))} MYT</p>${route.cameras.length ? route.cameras.map((c, i) => `<div class="modal-item"><b>${esc(c.name)}</b><small>${(+c.lat).toFixed(5)}, ${(+c.lon).toFixed(5)}</small><button data-camera="${i}">Show on map \u2197</button></div>`).join("") : "<p>No mapped cameras were found. This does not mean the road has no cameras.</p>"}<p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">\xA9 OpenStreetMap contributors</a></p>`);
    $$("[data-camera]").forEach((b) => b.onclick = () => {
      const c = route.cameras[+b.dataset.camera];
      $("#modal").close();
      map.setView([c.lat, c.lon], 17);
      $("#map").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  async function checkCameras(id) {
    if (cameraStatus?.loading && cameraAbort && !cameraAbort.signal.aborted) cameraAbort.abort();
    cameraAbort = new AbortController();
    let retry = 0;
    try {
      const response = await fetch("/api/route-cameras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ routes: routeResults.map((r) => r.geometry.coordinates) }), signal: AbortSignal.any([cameraAbort.signal, AbortSignal.timeout(22e3)]) });
      const data = await response.json();
      if (id !== requestId) return;
      cameraStatus = response.ok && data.available ? data : { available: false };
      retry = Math.max(0, Math.min(300, Number(response.headers.get("Retry-After")) || 0));
    } catch (e) {
      if (e.name === "AbortError" || id !== requestId) return;
      cameraStatus = { available: false };
    }
    if (id !== requestId) return;
    renderRoutes();
    drawCameras();
    let note = $("#camera-coverage");
    if (!note) {
      note = document.createElement("div");
      note.id = "camera-coverage";
      $("#routes").after(note);
    }
    note.innerHTML = `<span class="small-print">Mapped fixed cameras only. Mobile traps excluded.</span><button type="button" id="camera-retry" ${retry ? "disabled" : ""}>${cameraStatus.available ? "Details & camera locations" : retry ? "Retry in " + retry + "s" : "Retry camera check"}</button>`;
    const button = $("#camera-retry");
    if (retry) {
      const until = Date.now() + retry * 1e3;
      const timer = setInterval(() => {
        if (id !== requestId || !button.isConnected) {
          clearInterval(timer);
          return;
        }
        const left = Math.ceil((until - Date.now()) / 1e3);
        button.textContent = left > 0 ? "Retry in " + left + "s" : "Retry camera check";
        if (left <= 0) {
          clearInterval(timer);
          button.disabled = false;
        }
      }, 1e3);
    }
    button.onclick = () => {
      if (cameraStatus.available) cameraDetails();
      else {
        button.disabled = true;
        cameraStatus = { loading: true };
        renderRoutes();
        checkCameras(id);
      }
    };
  }
  function tollLine(r) {
    if (!["car", "motorbike"].includes(mode) || !r.toll) return "";
    if (!r.toll.uses) return '<div class="route-toll free">' + NI("check") + "No toll roads on this route</div>";
    const roads = r.toll.roads.length ? " \xB7 " + esc(r.toll.roads.join(", ")) : "";
    return `<div class="route-toll">${NI("info")}<span>Uses toll roads \xB7 ${distance(r.toll.distance / 1e3)}${roads}${mode === "motorbike" ? "<small>Most highways are free for motorcycles; bridges and the Second Link still charge.</small>" : ""}</span></div>`;
  }
  function trafficLine(i) {
    if (mode !== "car" || i !== 0) return "";
    if (trafficInfo?.loading) return '<div class="route-traffic">Checking live traffic\u2026</div>';
    if (!trafficInfo?.available) return "";
    const delay = Math.round(trafficInfo.delaySeconds / 60);
    return `<div class="route-traffic ${delay >= 10 ? "heavy" : delay >= 3 ? "slow" : "clear"}"><b>${minutes(trafficInfo.durationSeconds)} with live traffic</b><small>${delay ? "+" + delay + " min delay" : "Traffic is flowing"} \xB7 arrive ${clock(trafficInfo.durationSeconds)}</small></div>`;
  }
  function renderRoutes() {
    $("#route-count").textContent = routeResults.length ? `${routeResults.length} route${routeResults.length === 1 ? "" : "s"}` : "No route selected";
    renderHandoff();
    if (!routeResults.length) {
      $("#routes").innerHTML = '<div class="route-empty">' + NI("route") + "<p>Choose where you start and where you're going, then tap <b>Find my way</b>.</p></div>";
      $("#journey-details").disabled = true;
      return;
    }
    $("#journey-details").disabled = false;
    const live = mode === "car" && trafficInfo?.available;
    $("#routes").innerHTML = routeResults.map((r, i) => `<button class="route-card ${chosen === i ? "selected" : ""}" data-route="${i}" aria-pressed="${chosen === i}"><div class="route-top"><span>${i === 0 ? "Fastest" : "Alternative " + (i + 1)}</span><span class="tag">${modeLabel[mode]}</span></div><div class="route-info"><strong>${minutes(r.duration).replace(/ min$/, " <small>min</small>")}</strong><span>\xB7 ${(r.distance / 1e3).toFixed(1)} km \xB7 arrive ~${clock(r.duration)}</span></div>${trafficLine(i)}${tollLine(r)}<div class="camera-summary">${["car", "motorbike"].includes(mode) ? cameraSummary(i) : ""}</div><div class="route-bottom">${live && i === 0 ? "Road estimate above; live time from TomTom" : "Road-speed estimate \xB7 no live traffic"}${["car", "motorbike"].includes(mode) && $("#avoid-tolls").checked ? " \xB7 Toll avoidance requested" : ""}${mode === "motorbike" ? " \xB7 Car road network" : ""}</div></button>`).join("");
    $$("[data-route]").forEach((b) => b.onclick = () => {
      chosen = +b.dataset.route;
      renderRoutes();
      drawRoutes();
      drawCameras();
    });
  }
  function drawRoutes() {
    roadLayer.clearLayers();
    routeResults.forEach((r, i) => {
      L.geoJSON(r.geometry, { style: { color: i === chosen ? "#8050db" : "#b5a4d3", weight: i === chosen ? 6 : 4, opacity: i === chosen ? 1 : 0.65 } }).addTo(roadLayer);
    });
    const active = routeResults[chosen];
    if (active) map.fitBounds(L.geoJSON(active.geometry).getBounds(), { padding: [35, 35] });
    const a = fieldPoint("#origin"), b = fieldPoint("#destination");
    [a, b].forEach((p, i) => {
      if (p) L.circleMarker([p.lat, p.lon], { radius: 8, color: "#fff", weight: 3, fillColor: i ? "#8050db" : "#408d7c", fillOpacity: 1 }).bindTooltip(esc(p.name)).addTo(roadLayer);
    });
    $("#map-state").textContent = `${{ car: "Driving", motorbike: "Riding", walk: "Walking", cycle: "Cycling" }[mode]} route \xB7 ${minutes(active.duration)} \xB7 arrive ~${clock(active.duration)}`;
  }
  async function findRoutes() {
    closeSearch();
    const a = fieldPoint("#origin"), b = fieldPoint("#destination");
    if (!a || !b) {
      const f = !a ? $("#origin") : $("#destination");
      f.focus();
      startSearch(f, true);
      toast("Please select an exact location from the suggestions for both ends of your journey.");
      return;
    }
    if (a.lat === b.lat && a.lon === b.lon) {
      toast("Choose two different locations.");
      return;
    }
    if (transitModes.includes(mode)) return transitPlan(a, b);
    invalidateRoute();
    const id = requestId;
    routeAbort = new AbortController();
    $("#routes").innerHTML = '<div class="route-empty loading-state">' + NI("route") + "<p>Calculating road routes\u2026</p></div>";
    $("#planform .primary").disabled = true;
    try {
      const data = await api("/api/route?" + new URLSearchParams({ fromLat: a.lat, fromLon: a.lon, toLat: b.lat, toLon: b.lon, mode, avoidTolls: $("#avoid-tolls").checked && ["car", "motorbike"].includes(mode) }), routeAbort.signal);
      if (id !== requestId) return;
      routeResults = data.routes;
      chosen = 0;
      cameraStatus = { loading: true };
      if (mode === "car" && trafficAvailable) trafficInfo = { loading: true };
      renderRoutes();
      drawRoutes();
      if (["car", "motorbike"].includes(mode)) checkCameras(id);
      if (mode === "car" && trafficAvailable) checkTraffic(id, a, b);
      if (matchMedia("(max-width:900px)").matches) $("#routes").scrollIntoView({ behavior: "smooth", block: "start" });
      if (!area || area.lat !== b.lat || area.lon !== b.lon) setArea(b, false);
    } catch (e) {
      if (e.name === "AbortError" || id !== requestId) return;
      $("#routes").innerHTML = `<div class="route-empty"><p>${esc(e.message)}</p><button id="retry-route">Retry route ${NI("arrow")}</button></div>`;
      retryAfter($("#retry-route"), e.retryAfter || 1, findRoutes);
    } finally {
      if (id === requestId) $("#planform .primary").disabled = false;
    }
  }
  // ---- Live traffic (TomTom, only when the site owner has configured a key on the server) ----
  async function checkTraffic(id, a, b) {
    try {
      const data = await api("/api/traffic?" + new URLSearchParams({ fromLat: a.lat, fromLon: a.lon, toLat: b.lat, toLon: b.lon }));
      if (id !== requestId) return;
      trafficInfo = data.available ? data : null;
    } catch {
      if (id !== requestId) return;
      trafficInfo = null;
    }
    renderRoutes();
  }
  async function setupTraffic() {
    try {
      const data = await (await fetch("/api/traffic?status=1")).json();
      trafficAvailable = !!data.available;
    } catch {
      trafficAvailable = false;
    }
    if (!trafficAvailable) return;
    trafficLayer = L.tileLayer("/api/traffic?tile={z}/{x}/{y}", { minZoom: 5, maxZoom: 19, maxNativeZoom: 18, opacity: 0.85, attribution: "Traffic \xA9 TomTom" });
    const toggle = document.createElement("button");
    toggle.id = "traffic-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-pressed", "false");
    toggle.innerHTML = NI("route") + "<span>Live traffic</span>";
    toggle.onclick = () => {
      const on = !map.hasLayer(trafficLayer);
      if (on) trafficLayer.addTo(map); else map.removeLayer(trafficLayer);
      toggle.setAttribute("aria-pressed", String(on));
      toggle.classList.toggle("active", on);
      if (on && map.getZoom() < 10) toast("Zoom in to see traffic on individual roads.");
    };
    $(".map-live-toolbar").append(toggle);
    setMode(mode);
    renderServices();
  }

  // ---- Hand-off to turn-by-turn navigation apps ----
  const ll = (p) => (+p.lat).toFixed(6) + "," + (+p.lon).toFixed(6);
  function googleUrl(a, b, travel) {
    const q = new URLSearchParams({ api: "1", destination: ll(b), travelmode: travel });
    if (a) q.set("origin", ll(a));
    return "https://www.google.com/maps/dir/?" + q;
  }
  const wazeUrl = (b) => "https://waze.com/ul?" + new URLSearchParams({ ll: ll(b), navigate: "yes" });
  const handoff = document.createElement("div");
  handoff.className = "handoff";
  $(".trip-actions").before(handoff);
  function renderHandoff() {
    const a = fieldPoint("#origin"), b = fieldPoint("#destination");
    const ready = b && (routeResults.length || transitModes.includes(mode) && a);
    handoff.hidden = !ready;
    if (!ready) return;
    const travel = { car: "driving", motorbike: "driving", walk: "walking", cycle: "bicycling", train: "transit", bus: "transit" }[mode];
    handoff.innerHTML = `<span>Start navigating</span>${["car", "motorbike"].includes(mode) ? `<a class="waze" href="${wazeUrl(b)}" target="_blank" rel="noopener">${NI("navigation")} Waze</a>` : ""}<a href="${googleUrl(a, b, travel)}" target="_blank" rel="noopener">${NI("map")} Google Maps${transitModes.includes(mode) ? " \xB7 times & fares" : ""}</a>`;
  }

  // ---- Public transport: nearby stations + official live vehicle positions ----
  const stopKinds = { train: ["station", "halt"], bus: ["bus_stop", "bus_station"] };
  const walkMins = (km) => Math.max(1, Math.round(km * 1.3 / 4.8 * 60));
  async function stationsNear(p, signal) {
    const data = await api("/api/nearby?" + new URLSearchParams({ lat: p.lat, lon: p.lon, category: "Transit", radius: 3 }), signal);
    const all = data.places || [], kind = stopKinds[mode];
    const match = all.filter((x) => !x.osmValue || kind.includes(x.osmValue));
    return (match.length ? match : all).slice(0, 3);
  }
  function stationList(title, from, list) {
    if (!list.length) return `<div class="transit-end"><b>${esc(title)}</b><p class="small-print">No mapped ${mode === "train" ? "stations" : "stops"} within 3 km of ${esc(from.name)}. Google Maps may still find a connection.</p></div>`;
    return `<div class="transit-end"><b>${esc(title)}</b>${list.map((x, i) => `<button type="button" class="transit-stop" data-stop="${esc(title)}|${i}">${NI(mode === "train" ? "train" : "bus")}<span><b>${esc(x.name)}</b><small>${distance(x.distance)} \xB7 about ${walkMins(x.distance)} min walk</small></span></button>`).join("")}</div>`;
  }
  async function transitPlan(a, b) {
    invalidateRoute();
    const id = requestId;
    routeAbort = new AbortController();
    $("#routes").innerHTML = '<div class="route-empty loading-state">' + NI(mode) + "<p>Finding " + (mode === "train" ? "stations" : "stops") + " and live vehicles\u2026</p></div>";
    $("#route-count").textContent = modeLabel[mode];
    const [from, to] = await Promise.allSettled([stationsNear(a, routeAbort.signal), stationsNear(b, routeAbort.signal)]);
    if (id !== requestId) return;
    const fromList = from.status === "fulfilled" ? from.value : [], toList = to.status === "fulfilled" ? to.value : [];
    const failed = from.status === "rejected" && to.status === "rejected";
    $("#routes").innerHTML = `<div class="transit-plan">${failed ? `<p class="small-print">${esc(from.reason?.message || "Stations could not be loaded.")}</p>` : stationList("Board near " + a.name, a, fromList) + stationList("Get off near " + b.name, b, toList)}<div id="live-vehicles" class="live-vehicles"></div><p class="small-print">Walking times are straight-line estimates. Timetables, transfers and fares open in Google Maps.</p></div>`;
    const lists = { ["Board near " + a.name]: fromList, ["Get off near " + b.name]: toList };
    $$("[data-stop]").forEach((btn) => btn.onclick = () => {
      const [t, i] = btn.dataset.stop.split("|"), st = lists[t][+i];
      map.setView([st.lat, st.lon], 17);
      $("#map").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    roadLayer.clearLayers();
    [[a, "#408d7c"], [b, "#8050db"]].forEach(([p, color]) => L.circleMarker([p.lat, p.lon], { radius: 8, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1 }).bindTooltip(esc(p.name)).addTo(roadLayer));
    [...fromList, ...toList].forEach((st) => L.marker([st.lat, st.lon], { title: st.name, icon: L.divIcon({ className: "place-map-pin transit-pin", html: NI(mode === "train" ? "train" : "bus"), iconSize: [29, 29], iconAnchor: [14, 14] }) }).bindTooltip(esc(st.name)).addTo(roadLayer));
    map.fitBounds(L.latLngBounds([[a.lat, a.lon], [b.lat, b.lon]]), { padding: [40, 40] });
    renderHandoff();
    if (matchMedia("(max-width:900px)").matches) $("#routes").scrollIntoView({ behavior: "smooth", block: "start" });
    showLiveVehicles(a, 2, id);
  }
  function vehicleAge(v) {
    if (v.ageSeconds === null) return "position time not given";
    return v.ageSeconds < 60 ? "updated " + v.ageSeconds + "s ago" : "updated " + Math.round(v.ageSeconds / 60) + " min ago";
  }
  async function showLiveVehicles(p, radiusKm, id = requestId) {
    clearInterval(transitTimer);
    const run = async () => {
      if (!transitModes.includes(mode) || id !== requestId) return clearInterval(transitTimer);
      let box = $("#live-vehicles");
      try {
        const data = await api("/api/transit?" + new URLSearchParams({ lat: p.lat, lon: p.lon, radius: radiusKm }));
        if (id !== requestId) return;
        transitVehicles = (data.vehicles || []).filter((v) => v.kind === mode);
        transitLayer.clearLayers();
        transitVehicles.forEach((v) => L.marker([v.lat, v.lon], { title: v.feed, icon: L.divIcon({ className: "vehicle-pin " + v.kind, html: NI(v.kind === "train" ? "train" : "bus") + (v.routeId ? `<b>${esc(v.routeId.slice(0, 6))}</b>` : ""), iconSize: [30, 30], iconAnchor: [15, 15] }) }).bindTooltip(`${esc(v.feed)}${v.routeId ? " \xB7 route " + esc(v.routeId) : ""}${v.plate ? " \xB7 " + esc(v.plate) : ""} \xB7 ${vehicleAge(v)}`).addTo(transitLayer));
        if (!box) return;
        if (!data.covered) {
          box.innerHTML = `<div class="live-head"><b>Live ${mode === "train" ? "trains" : "buses"}</b></div><p class="small-print">No official live feed covers this area yet. Covered: Klang Valley, Penang, Johor Bahru, Ipoh, Melaka, Seremban, Kuching and other BAS.MY cities, plus KTM.</p>`;
          return clearInterval(transitTimer);
        }
        box.innerHTML = `<div class="live-head"><b><i class="live-dot"></i>Live ${mode === "train" ? "KTM trains" : "buses"} within ${radiusKm} km</b><small>Refreshes every 30s</small></div>${transitVehicles.length ? transitVehicles.slice(0, 6).map((v) => `<div class="vehicle-row">${NI(v.kind === "train" ? "train" : "bus")}<span><b>${esc(v.feed)}${v.routeId ? " \xB7 " + esc(v.routeId) : ""}</b><small>${distance(v.distance)} away${v.speedKmh !== null ? " \xB7 " + v.speedKmh + " km/h" : ""} \xB7 ${vehicleAge(v)}</small></span></div>`).join("") : `<p class="small-print">No ${mode === "train" ? "trains" : "buses"} reporting within ${radiusKm} km right now.</p>`}<p class="small-print">Positions from data.gov.my. These feeds do not include arrival predictions.</p>`;
      } catch (e) {
        if (box && id === requestId) box.innerHTML = `<p class="small-print">Live positions unavailable: ${esc(e.message)}</p>`;
      }
    };
    await run();
    transitTimer = setInterval(() => { if (!document.hidden) run(); }, 3e4);
  }

  $("#planform").onsubmit = (e) => {
    e.preventDefault();
    findRoutes();
  };
  $("#avoid-tolls").onchange = () => {
    invalidateRoute();
    toast("Preference changed. Choose Find my way to calculate again.");
  };
  $("#swap").onclick = () => {
    const a = fieldPoint("#origin"), b = fieldPoint("#destination"), av = $("#origin").value, bv = $("#destination").value;
    ["#origin", "#destination"].forEach((id) => {
      delete $(id).dataset.lat;
      delete $(id).dataset.lon;
    });
    if (b) setField("#origin", b);
    else $("#origin").value = bv;
    if (a) setField("#destination", a);
    else $("#destination").value = av;
    invalidateRoute();
  };
  const modeExplore = document.createElement("button");
  modeExplore.id = "mode-explore";
  modeExplore.className = "journey-details";
  modeExplore.type = "button";
  $("#mode-note").after(modeExplore);
  modeExplore.onclick = () => {
    if (mode === "train" || mode === "bus") {
      category = "Transit";
      renderCategories();
    }
    if (area) {
      loadNearby();
      $(".discover").scrollIntoView({ behavior: "smooth" });
    } else {
      $("#place-search").focus();
      toast("Search for a town or place to explore around.");
    }
  };
  function setMode(next) {
    mode = next;
    const road = roadModes.includes(mode);
    ["#journey-details", "#share"].forEach((selector) => $(selector).hidden = !road);
    modeExplore.hidden = road;
    modeExplore.textContent = "Show stations & stops nearby \u2197";
    $("#planform .primary").firstChild.textContent = road ? "Find my way " : "Plan with public transport ";
    $(".route-heading h3").textContent = road ? "Your route, your choice" : "Your public transport plan";
    $(".routing-preferences").hidden = !["car", "motorbike"].includes(mode);
    $(".data-note").textContent = road ? (trafficAvailable && mode === "car" ? "Road estimates \xB7 live traffic on the fastest route" : "Road-speed estimates \xB7 open in Waze for live traffic") : "Official live positions \xB7 times & fares via Google Maps";
    invalidateRoute();
    $$("[data-mode]").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
      b.setAttribute("aria-pressed", b.dataset.mode === mode);
    });
    $("#avoid-tolls").disabled = !["car", "motorbike"].includes(mode);
    $("#mode-note").textContent = {
      car: "Real road routes with arrival time and toll-road check." + (trafficAvailable ? " Live traffic on the fastest route." : ""),
      motorbike: "Riding uses the car road network. Watch for roads closed to motorcycles, and use motorcycle lanes where provided.",
      walk: "Walking routes from OpenStreetMap. Path conditions and accessibility are not verified.",
      cycle: "Cycling routes from OpenStreetMap. Closures and cycling conditions are not verified.",
      train: "Finds stations near both ends, shows live KTM trains nearby, and opens timetables & fares in Google Maps.",
      bus: "Finds stops near both ends, shows live Rapid KL, Rapid Penang and BAS.MY buses nearby, and opens timetables in Google Maps."
    }[mode];
    if (transitModes.includes(mode)) {
      category = "Transit";
      renderCategories();
      loadNearby();
      if (area) showLiveVehicles(area, 2);
    }
  }
  $$("[data-mode]").forEach((b) => b.onclick = () => setMode(b.dataset.mode));
  function stepText(s) {
    const road = s.name || s.ref || "the road", type = s.type.replaceAll("_", " ");
    if (s.type === "depart") return "Start on " + road;
    if (s.type === "arrive") return "Arrive at your destination";
    if (s.toll) return stepTextPlain(s) + " (toll road)";
    return stepTextPlain(s);
  }
  function stepTextPlain(s) {
    const road = s.name || s.ref || "the road", type = s.type.replaceAll("_", " ");
    if (s.type === "roundabout" || s.type === "rotary") return "At the roundabout, continue towards " + road;
    const side = s.modifier ? s.modifier.replace("uturn", "U-turn").replace("slight ", "slightly ") : "";
    if (s.type === "on ramp") return "Take the ramp" + (side.includes("left") ? " on the left" : side.includes("right") ? " on the right" : "") + " onto " + road;
    if (s.type === "off ramp") return "Take the exit" + (side.includes("left") ? " on the left" : side.includes("right") ? " on the right" : "") + " towards " + road;
    if (s.type === "fork") return "Keep " + (side.includes("left") ? "left" : "right") + " at the fork onto " + road;
    if (s.type === "merge") return "Merge onto " + road;
    if (s.type === "new name" || s.type === "continue") return (side && side !== "straight" ? "Bear " + side : "Continue") + " onto " + road;
    if (s.type === "end of road") return "At the end of the road, turn " + (side || "") + " onto " + road;
    if (side === "straight") return "Go straight onto " + road;
    if (side === "uturn" || side === "U-turn") return "Make a U-turn onto " + road;
    return (s.type === "turn" ? "Turn" : type.charAt(0).toUpperCase() + type.slice(1)) + (side ? " " + side : "") + " onto " + road;
  }
  $("#journey-details").onclick = () => {
    const r = routeResults[chosen];
    if (!r) return;
    const tollNote = r.toll ? r.toll.uses ? `<p><b>Toll roads:</b> ${distance(r.toll.distance / 1e3)}${r.toll.roads.length ? " on " + esc(r.toll.roads.join(", ")) : ""}. Check current rates with the <a href="https://www.llm.gov.my/" target="_blank" rel="noopener">Malaysian Highway Authority \u2197</a>.</p>` : "<p><b>No toll roads</b> on this route.</p>" : "";
    modal("Your journey steps", `<div class="status-note">${minutes(r.duration)} \xB7 ${(r.distance / 1e3).toFixed(1)} km \xB7 arrive ~${clock(r.duration)}</div>${tollNote}<ol class="timeline">${r.steps.map((s) => `<li class="${s.toll ? "toll-step" : ""}">${esc(stepText(s))}${s.type === "arrive" ? "" : `<small>${distance(s.distance / 1e3)}</small>`}</li>`).join("")}</ol><p class="small-print">For voice guidance, use Start navigating \u2192 Waze or Google Maps.</p>${["car", "motorbike"].includes(mode) ? '<button id="fuel-tool" class="primary">Estimate fuel cost</button>' : ""}`);
    if (!$("#fuel-tool")) return;
    $("#fuel-tool").onclick = () => {
      modal("Journey cost estimate", `<p>Based on the selected ${(r.distance / 1e3).toFixed(1)} km road route. Enter your own current fuel price.</p><label>Fuel economy \xB7 litres per 100 km<input id="economy" type="number" min="1" max="50" step="0.1" value="${mode === "motorbike" ? 2.5 : 6.5}"></label><label>Fuel price \xB7 RM per litre<input id="fuel-price" type="number" min="0.1" max="30" step="0.01" placeholder="Enter current price"></label><button class="primary" id="calculate-fuel">Calculate fuel estimate</button><div id="fuel-result" aria-live="polite"></div><p>${r.toll?.uses ? "<b>This route uses toll roads.</b> Tolls are not included" : "No toll roads on this route"}. Parking and other costs are not included.</p>`);
      $("#calculate-fuel").onclick = () => {
        const e = +$("#economy").value, p = +$("#fuel-price").value;
        if (e < 1 || e > 50 || p < 0.1 || p > 30) {
          toast("Enter a valid fuel economy and price.");
          return;
        }
        $("#fuel-result").textContent = "Estimated fuel cost: RM" + (r.distance / 1e3 / 100 * e * p).toFixed(2);
      };
    };
  };
  $("#save").onclick = () => {
    const a = fieldPoint("#origin"), b = fieldPoint("#destination");
    if (!a || !b) {
      toast("Select exact starting and destination places before saving.");
      return;
    }
    if (saved.some((s) => s.from?.lat === a.lat && s.from?.lon === a.lon && s.to?.lat === b.lat && s.to?.lon === b.lon && s.mode === mode)) {
      toast("This journey is already saved.");
      return;
    }
    saved.unshift({ id: Date.now(), from: a, to: b, origin: a.name, destination: b.name, mode, avoidTolls: $("#avoid-tolls").checked });
    saved = saved.slice(0, 50);
    write("saved", saved);
    toast("Journey saved on this browser.");
  };
  function savedJourneys() {
    modal("Your saved journeys", saved.length ? saved.map((s, i) => `<div class="modal-item"><b>${esc(s.origin || s.from?.name)} \u2192 ${esc(s.destination || s.to?.name)}</b><small>${esc(s.mode || "car")} \xB7 ${s.from && s.to ? "Exact locations saved" : "Older saved journey; select exact places again"}</small><div><button data-load-trip="${i}">Open journey \u2197</button><button data-remove-trip="${i}">Remove</button></div></div>`).join("") : "<p>No saved journeys yet. Choose exact places and save your trip.</p>");
    $$("[data-load-trip]").forEach((b) => b.onclick = () => {
      const s = saved[+b.dataset.loadTrip];
      setMode(s.mode || "car");
      if (s.from && s.to) {
        setField("#origin", s.from);
        setField("#destination", s.to);
        $("#avoid-tolls").checked = !!s.avoidTolls;
        setArea(s.to);
      } else {
        $("#origin").value = s.origin || "";
        $("#destination").value = s.destination || "";
        ["#origin", "#destination"].forEach((id) => {
          delete $(id).dataset.lat;
          delete $(id).dataset.lon;
        });
      }
      $("#modal").close();
      $(".planner").scrollIntoView({ behavior: "smooth" });
      toast("Saved locations opened. Choose Find my way for current road estimates.");
    });
    $$("[data-remove-trip]").forEach((b) => b.onclick = () => {
      saved.splice(+b.dataset.removeTrip, 1);
      write("saved", saved);
      savedJourneys();
    });
  }
  $("#share").onclick = async () => {
    const r = routeResults[chosen];
    if (!r) {
      toast("Calculate a route before sharing.");
      return;
    }
    if (navigator.share && matchMedia("(pointer:coarse)").matches) {
      const b = fieldPoint("#destination");
      try {
        await navigator.share({ title: "Naviya journey", text: `${$("#origin").value} \u2192 ${$("#destination").value} \xB7 ${modeLabel[mode]} \xB7 about ${minutes(r.duration)}`, url: googleUrl(fieldPoint("#origin"), b, { car: "driving", motorbike: "driving", walk: "walking", cycle: "bicycling" }[mode]) });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    const b = fieldPoint("#destination");
    const text = `Naviya: ${$("#origin").value} \u2192 ${$("#destination").value}
${modeLabel[mode]} \xB7 ${(r.distance / 1e3).toFixed(1)} km \xB7 about ${minutes(r.duration)}${r.toll ? r.toll.uses ? " \xB7 uses toll roads" : " \xB7 no tolls" : ""}
${b ? googleUrl(fieldPoint("#origin"), b, { car: "driving", motorbike: "driving", walk: "walking", cycle: "bicycling" }[mode]) : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("Journey copied.");
    } catch {
      modal("Copy your journey", `<textarea readonly>${esc(text)}</textarea>`);
    }
  };
  function dayPlan() {
    modal("Your day, your places.", `<p>Saved on this browser. Reorder places or explore around your next stop. </p>${day.filter(inside).length >= 2 ? `<a class="primary day-route" href="${dayRouteUrl()}" target="_blank" rel="noopener">${NI("route")} Directions for the whole day \u2197</a>` : ""}${day.length ? day.map((p, i) => `<div class="day-item"><span>${i + 1}</span><b>${esc(p.name)}</b><button data-day-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(p.name)} earlier">\u2191</button><button data-day-open="${i}" aria-label="Explore ${esc(p.name)}">\u2197</button><button data-day-remove="${i}" aria-label="Remove ${esc(p.name)}">\xD7</button></div>`).join("") : '<div class="empty">Open any real place and add it to your day.</div>'}`);
    $$("[data-day-up]").forEach((b) => b.onclick = () => {
      const i = +b.dataset.dayUp;
      if (i > 0) [day[i - 1], day[i]] = [day[i], day[i - 1]];
      write("day", day);
      dayPlan();
    });
    $$("[data-day-remove]").forEach((b) => b.onclick = () => {
      day.splice(+b.dataset.dayRemove, 1);
      write("day", day);
      $("#day-count").textContent = day.length;
      dayPlan();
    });
    $$("[data-day-open]").forEach((b) => b.onclick = () => {
      const p = day[+b.dataset.dayOpen];
      $("#modal").close();
      if (inside(p)) setArea(p);
      else {
        $("#place-search").value = p.name;
        $("#place-search").focus();
        startSearch($("#place-search"), true);
      }
    });
  }
  function dayRouteUrl() {
    const stops = day.filter(inside).slice(0, 10);
    const q = new URLSearchParams({ api: "1", origin: ll(stops[0]), destination: ll(stops[stops.length - 1]), travelmode: "driving" });
    if (stops.length > 2) q.set("waypoints", stops.slice(1, -1).map(ll).join("|"));
    return "https://www.google.com/maps/dir/?" + q;
  }
  $("#itinerary-open").onclick = dayPlan;
  $("#day-count").textContent = day.length;
  function reportForm() {
    if (!area) {
      toast("Select an area before adding a road observation.");
      $("#place-search").focus();
      return;
    }
    modal("Share a local observation", `<p>This observation stays on your browser and expires after two hours. It is not broadcast as verified traffic.</p><form id="report-form"><label>What did you notice?<select id="incident-type"><option>Traffic jam</option><option>Construction</option><option>Accident</option><option>Road hazard</option><option>Flooding</option><option>Traffic signal fault</option></select></label><label>Location<input id="incident-location" required maxlength="120" value="${esc(area.name)}"></label><label>Details<textarea id="incident-detail" maxlength="400"></textarea></label><button class="primary">Save on this browser</button></form>`);
    $("#report-form").onsubmit = (e) => {
      e.preventDefault();
      const name = $("#incident-location").value.trim();
      if (!name) return;
      reports.unshift({ id: Date.now(), created: Date.now(), type: $("#incident-type").value, location: name, detail: $("#incident-detail").value.trim(), lat: area.lat, lon: area.lon });
      reports = reports.slice(0, 50);
      write("reports", reports);
      $("#modal").close();
      toast("Your observation was saved locally, not shared with other users.");
    };
  }
  function reportList() {
    reports = reports.filter((r) => Date.now() - r.created < 72e5);
    write("reports", reports);
    modal("Your road observations", `<div class="status-note">Device-local observations \xB7 No live traffic feed</div>${reports.length ? reports.map((r, i) => `<div class="modal-item"><b>${esc(r.type)} \xB7 ${esc(r.location)}</b><small>Unverified \xB7 ${Math.max(0, Math.floor((Date.now() - r.created) / 6e4))} min ago</small><p>${esc(r.detail)}</p><button data-remove-report="${i}">Remove</button></div>`).join("") : "<p>No active observations on this browser.</p>"}<button id="new-report" class="primary">Add an observation</button>`);
    $("#new-report").onclick = () => {
      $("#modal").close();
      reportForm();
    };
    $$("[data-remove-report]").forEach((b) => b.onclick = () => {
      reports.splice(+b.dataset.removeReport, 1);
      write("reports", reports);
      reportList();
    });
  }
  $("#report").onclick = reportForm;
  $("#community-report").onclick = reportForm;
  const services = () => [
    ["route", "Road routes & arrival times", "on", "Drive, ride, walk, cycle"],
    ["ticket", "Toll-road check", "on", "Shows if a route uses tolls; rates via LLM"],
    ["camera", "Fixed speed cameras", "on", "Mapped cameras near your route"],
    ["bus", "Live buses & KTM trains", "on", "Official data.gov.my positions"],
    ["calendar", "Timetables & fares", "link", "Opens in Google Maps"],
    trafficAvailable ? ["navigation", "Live traffic", "on", "Map overlay & delay on fastest route"] : ["navigation", "Live traffic", "link", "Open your route in Waze"],
    ["lanes", "Smart Lane status", "off", "No official feed \xB7 follow highway signs"]
  ];
  const statusText = { on: "Live", link: "Via app", off: "Not available" };
  const serviceList = () => `<ul class="service-list">${services().map(([icon, name, state, note]) => `<li>${NI(icon)}<span><b>${name}</b><small>${note}</small></span><em class="svc-${state}">${statusText[state]}</em></li>`).join("")}</ul>`;
  function renderServices() {
    const card = $(".smart-card");
    card.innerHTML = `<div class="sectiontop"><div class="card-title"><span class="smart-icon">Live services</span></div></div><h3>What's switched on.</h3>${serviceList()}<button id="smart-details" class="service-link">Sources & highway information \u2197</button>`;
    $("#smart-details").onclick = highwayStatus;
  }
  function highwayStatus() {
    modal("Highway & live information", `${serviceList()}<p><b>Toll rates</b> are published by the <a href="https://www.llm.gov.my/" target="_blank" rel="noopener">Malaysian Highway Authority (LLM) \u2197</a>. Naviya tells you whether a route uses toll roads, but does not guess prices.</p><p><b>Smart Lane</b> openings are announced by highway operators on the road and in their own apps, such as <a href="https://www.plus.com.my/" target="_blank" rel="noopener">PLUS \u2197</a>. There is no public data feed, so Naviya does not show a status.</p><p><b>Live traffic</b>${trafficAvailable ? " comes from TomTom. Turn it on with the Live traffic button on the map." : " is not built in yet. Open your route in Waze for live traffic and police/hazard reports."}</p>`);
  }
  renderServices();
  function privacy() {
    modal("Your journey, with clarity.", `<p>Search text and chosen map coordinates are sent through Naviya to Photon; route endpoints are sent to the road-routing provider. Driving-route geometry is sent to OpenStreetMap/Overpass (currently Private.coffee) to check mapped fixed cameras. In train and bus mode, the selected area is used by Naviya's server to filter official data.gov.my vehicle feeds; your location is not sent to data.gov.my. If live traffic is switched on, route endpoints are sent to TomTom. Navigation buttons open Waze or Google Maps, which then receive your destination under their own privacy policies. Search and route responses may be cached in server memory for up to one hour, without account identifiers. Shared service quotas store request counts, not search histories. Your account identity is not forwarded to those services. <a href="https://overpass.private.coffee/#privacy-policy" target="_blank" rel="noopener">Camera provider privacy information \u2197</a></p><p>Map tiles contact OpenStreetMap directly, exposing your IP address and viewed map area. Google Fonts is also used. Device location is requested only when you choose \u201CUse my location\u201D; the app does not track you in the background.</p><p>Saved journeys, day plans, observations and theme preferences stay in this browser. Some saved places may contain precise coordinates. Signing out does not clear device-local records. Account profiles and points are stored separately on the server.</p><div class="privacy-actions"><button id="export-local" class="primary">Export device data</button><button id="clear-local">Clear saved data on this device</button></div>`);
    $("#export-local").onclick = () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ savedJourneys: saved, dayPlan: day, observations: reports, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "naviya-device-data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    };
    $("#clear-local").onclick = () => {
      if (!confirm("Clear saved journeys, day plans and observations on this device? Export them first if you want a copy.")) return;
      saved = [];
      day = [];
      reports = [];
      write("saved", []);
      write("day", []);
      write("reports", []);
      $("#day-count").textContent = 0;
      $("#modal").close();
      toast("Local saved records cleared. Account points were not changed.");
    };
  }
  $("#privacy").onclick = privacy;
  function dataInfo() {
    modal("What Naviya can do today", `<div class="status-note">Real places, road routes and official live transit \xB7 Malaysia</div><p><b>Search & nearby:</b> Photon / OpenStreetMap across Peninsular Malaysia, Sabah and Sarawak. Nearby results are ranked by straight-line distance. Coverage can be incomplete and opening hours are not verified.</p><p><b>Routes:</b> OSRM road-network routing for driving, riding, walking and cycling, with arrival time and a toll-road check from OpenStreetMap road data. Riding uses the car road network. Toll rates are not estimated.</p><p><b>Speed cameras:</b> fixed cameras mapped in OpenStreetMap (via Overpass) within 50 m of your route. Direction and operation are unverified; mobile traps are excluded.</p><p><b>Public transport:</b> live bus and KTM train positions from the official <a href="https://developer.data.gov.my/realtime-api/gtfs-realtime" target="_blank" rel="noopener">data.gov.my GTFS Realtime API \u2197</a> (Rapid KL, MRT feeder, Rapid Penang, BAS.MY and KTMB), refreshed every 30 seconds. These feeds do not include arrival predictions, so timetables and fares open in Google Maps. LRT/MRT trains do not publish live positions yet.</p><p><b>Live traffic:</b> ${trafficAvailable ? "TomTom traffic flow and delay estimates." : "not built in. Use Start navigating \u2192 Waze."} <b>Smart Lane:</b> no public feed exists, so no status is shown.</p><p>Public services have usage limits and no uptime guarantee.</p><p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap attribution \u2197</a> \xB7 <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM \u2197</a> \xB7 <a href="https://data.gov.my/" target="_blank" rel="noopener">data.gov.my \u2197</a></p>`);
  }
  $("#data-info").onclick = dataInfo;
  $("#preview-info").onclick = dataInfo;
  $("#traffic-info").onclick = dataInfo;
  $("#nearby-open").onclick = () => {
    if (area) {
      loadNearby();
      $(".discover").scrollIntoView({ behavior: "smooth" });
    } else {
      $("#place-search").focus();
      toast("Search a Malaysian place or choose Search this area on the map.");
    }
  };
  $$("[data-view]").forEach((b) => b.onclick = () => {
    const view = b.dataset.view;
    if (view === "saved") savedJourneys();
    else if (view === "reports") reportList();
    else if (view === "smart") highwayStatus();
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });
  const connection = document.createElement("div");
  connection.id = "connection-note";
  connection.setAttribute("role", "status");
  $(".workspace").before(connection);
  function connectionState() {
    connection.hidden = navigator.onLine;
    connection.textContent = "You are offline. Reconnect for places, map tiles and routes. Saved journeys remain on this device.";
  }
  window.addEventListener("online", connectionState);
  window.addEventListener("offline", connectionState);
  connectionState();
  $("#region-west").onclick = () => map.fitBounds([[1.1, 99.5], [6.9, 104.8]], { padding: [15, 15] });
  $("#region-east").onclick = () => map.fitBounds([[0.8, 109.4], [7.5, 119.6]], { padding: [15, 15] });
  $("#map-state").textContent = "Zoom in for streets and mapped buildings. Select a search result to focus.";
  $("#map-reset").innerHTML = NI("locate");
  setMode("car");
  initialDiscovery();
  setupTraffic();
})();
