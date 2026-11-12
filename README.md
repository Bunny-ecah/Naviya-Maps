# Naviya Maps

**Find your place. Across Malaysia.**

A Malaysian place-discovery and road-journey website with a purple identity, light/dark themes and self-hosted SVG icons.

## Phone and tablet layouts

The interface adapts across phone, tablet and desktop widths while retaining the same identity. Smaller screens have a map-first layout, larger touch controls, a fixed Map/Plan/Nearby/Saved/More navigation bar, scrollable place filters and bottom-sheet dialogs. The More menu exposes saved journeys, observations, highway information, privacy and account access. Input text is 16 px on mobile to avoid automatic input zoom; search overlays account for the visual viewport and the mobile navigation hides while typing. Device safe areas and reduced-motion preferences are respected. Sign-in, account and rewards pages are also responsive.

Verified in Chromium viewport previews at 320, 390, 768, 1024 and 1366 px, including horizontal-overflow checks, navigation/dialog actions, search result bounds and account input sizing. `public/responsive.css` contains shared responsive rules; `public/mobile-nav.js` provides the compact navigation. Physical-device and cross-browser validation is still recommended before a large public launch.

## Working features

- **Installable phone app (PWA)**: add to the home screen on Android and iPhone, opens full screen, starts offline from cache, with home-screen shortcuts (Malls near me, Petrol near me, Saved). `public/manifest.webmanifest`, `public/sw.js`, `public/app-shell.js`. Bump `VERSION` in `sw.js` on each release so phones pick up new files promptly.
- **Phone-first layout** (`public/mobile.css`): search and map on the first screen, search bar stays on top while scrolling, icon header, larger map with a full-screen mode (Back closes it), one-tap "my location" button, 44 px touch targets.
- **Recent searches** in the search box, and "near me" searches ask for location automatically.
- **Official fuel prices** in the fuel estimate (RON95, BUDI95, RON97, diesel) from data.gov.my, refreshed weekly (`app/api/fuel-price`).

- General place and address search across Peninsular Malaysia, Sabah and Sarawak, powered by Photon/OpenStreetMap.
- **Smart search** that understands kinds of places in English and Bahasa Melayu: `mall`, `restoran`, `kedai makan dekat PJ`, `petrol near me`, `klinik di Shah Alam`, `jb mall`, `surau`, `tandas`, `R&R` and more (`lib/search-intent.ts`). These return the nearest real places of that kind around the named town, your location, the selected area or the map on screen, with distances. Short forms are expanded (KL, JB, PJ, KK, 1U, jln, tmn, kg). Names that look like categories ("Masjid Jamek", "Taman Universiti") still find the named place first. Tapping the search box shows quick-search chips; "Nearest first" is on by default.
- Search-type filters for **buildings/offices**, towns/areas, streets/addresses and shops/places. Named offices, towers, commercial/residential buildings and indexed numbered addresses are supported where mapped. Optional location preference prioritizes the selected area without replacing nationwide coverage.
- Search suggestions render in a viewport-aware overlay, with separate scrollable rows and keyboard selection. They do not inherit the swap-button layout or sit behind the journey form.
- A real, interactive OpenStreetMap map with markers for the places returned by the selected category.
- Nearby restaurants, cafes, malls, offices, mapped buildings, schools, universities, hotels, museums, attractions, rail/bus transit locations, pharmacies, ATMs, petrol, EV charging, hospitals, parking, prayer spaces and rest areas.
- Area selection through search or map movement, with **1, 3, 5 or 10 km** radius filters. Nearby distances are straight-line distances, not travel distances. The provider returns up to 40 mapped results; coverage is not exhaustive.
- Real **driving, riding (motorcycle), walking and cycling** route geometry, road distances, journey durations, **arrival times**, alternatives and readable turn instructions through OSRM services. Riding uses the car road network and says so.
- **Toll-road check** on every driving/riding route: whether it uses tolled roads, for how far and on which highways (from OpenStreetMap `toll` road classes). Toll rates are not estimated; the journey dialog links to LLM. Riding routes note that most highways are toll-free for motorcycles.
- Toll-avoidance requests where supported by the routing provider. An unsupported request produces an explicit error; it is never silently replaced with an ordinary route.
- **In-app turn-by-turn navigation** (`public/trip.js`): follows your GPS, shows the next turn with distance, speaks instructions in English or Bahasa Melayu, recalculates after a wrong turn, keeps the screen on, shows live arrival time, and lets you add stops or share your ETA (WhatsApp / share sheet) mid-trip. **Preview drive** simulates the trip at 4× speed for checking a route at a desk.
- **Home & Work**: set from any place's details; one tap "Go home" / "Go to work" routes from where you are.
- **Stops along the way** (`app/api/along-route`): R&R, petrol, surau/masjid and EV chargers along the route with km and expected time; add one as a stop (up to 3 via points).
- **Prayer times on the trip** (`public/prayer.js`): Subuh, Zohor, Asar, Maghrib and Isyak that begin during the journey, where you will be, and the next surau or R&R. Calculated on the device with JAKIM parameters (18°/18°, Shafi'i Asar, ihtiyat); matches e-Solat for Kuala Lumpur in testing, may differ by a minute.
- **Bahasa Melayu**: BM/EN switch in the header and More menu (`public/i18n.js`).
- **Train and bus planner**: stations/stops near both ends with walking distance, plus **live KTM train and bus positions** from the official data.gov.my GTFS Realtime API (Rapid KL, MRT feeder, Rapid Penang, BAS.MY in nine cities and KTMB), refreshed every 30 seconds and drawn on the map.
- **Live traffic (optional)**: with a TomTom key configured on the server, a traffic-flow map overlay and current-traffic time/delay on the fastest driving route.
- Fuel-cost estimates based on the calculated route distance and the user's fuel economy and price (motorcycle default 2.5 L/100 km). Toll costs are not included.
- Day plans can be navigated stop by stop ("Navigate the day").
- A **Live services** panel (More menu on phones) that shows exactly what is switched on.
- Exact-coordinate saved journeys, reorderable day plans and local road observations. Observations expire after two hours and are not broadcast to other users.
- Device location only when the visitor explicitly chooses **Use my location**. No background tracking.
- Account/profile pages, platform ChatGPT sign-in, a persistent D1 points ledger and digital reward redemption on supported hosting.

The earlier fixed sample catalogue, mock traffic overlay, simulated route choices and illustrative Smart Lane schedule have been removed from the running application.

## What is still not available, and why

- **Toll prices**: LLM publishes rates, but there is no public data feed. Naviya shows whether a route uses tolls, never a guessed price.
- **Smart Lane activation**: highway operators announce it on signs and in their own apps; no public feed exists.
- **Arrival predictions for buses/trains**: data.gov.my publishes vehicle positions only. Naviya shows stops and live positions and can walk you to the nearest stop; LRT/MRT trains have no live position feed yet.
- **Live traffic without a key**: free public traffic data does not exist; route times use road speeds until a provider key is configured.
- **Motorcycle-specific restrictions**: no public router models roads closed to motorcycles. Riding routes are labelled as car-network routes.
- **Mobile speed traps**: only fixed cameras mapped in OpenStreetMap are shown.

- **Shared road reports and flood alerts**: reports stay on the device until accounts, moderation and a shared store are added; no open JPS/Public Infobanjir API is published for flood alerts.

Navigation runs in the browser, so keep Naviya open on screen while driving (phones pause web pages in the background). Use a phone holder and do not interact while moving. Search returns up to 24 matches from the provider index and is not a complete national building registry. A full commercial launch requires dedicated service capacity, operational monitoring and field validation.

## Run locally

Requires **Node.js 22.13+**, npm, and Python 3 for optional integration tests.

```bash
npm ci
npm run dev -- --port 4173
```

Open **http://127.0.0.1:4173**. Portable development provides a simulated sign-in identity on loopback only; hosted authentication remains platform-owned and the local mock is excluded from production.

### Prepare local account storage

```bash
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nebulous_patriot.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_smooth_alex_wilder.sql
npm run dev -- --port 4173
```

Apply each migration once, in order (`0000`, then `0001`, which adds the shared request-allowance table). Production and preview databases are separate. Search and routing still work without `0001`; the terminal then shows a one-time warning that quotas are skipped.

## Validation

```bash
node tests/place-search.test.mjs
node tests/road-routing.test.mjs
node tests/transit-and-tolls.test.mjs
node tests/search-intent.test.mjs
node tests/provider-missing-table.test.mjs
node tests/along-route.test.mjs
npm run build
```

With a prepared local database and preview server:

```bash
python tests/account-integration.py
python tests/malaysia-integration.py
```

Integration scripts target the local preview only. The Malaysia integration check contacts real map and routing services; do not run it repeatedly or against production. Public providers can be temporarily unavailable.

## Stack

| Area | Implementation |
| --- | --- |
| Server | TypeScript, React, Vinext, Cloudflare Workers |
| Accounts | Platform ChatGPT authentication, Cloudflare D1, Drizzle migrations |
| Exploration | HTML, CSS, JavaScript, locally bundled Leaflet |
| Place data | OpenStreetMap via Photon |
| Routing | OSRM car, foot and bike profiles (riding uses car) |
| Live transit | data.gov.my GTFS Realtime vehicle positions (built-in protobuf decoder) |
| Live traffic | TomTom Traffic, optional, server-side key |
| Icons | Local Lucide SVG sprite |

`public/malaysia.js` owns the nationwide map, search, discovery and journey interface. `app/api/search`, `app/api/nearby`, `app/api/route`, `app/api/transit` and `app/api/traffic` provide the server endpoints. `lib/place-search.ts`, `lib/road-routing.ts` and `lib/gtfs-realtime.ts` normalize provider data. `public/journey.css` styles the route, transit and live-services additions. `public/vendor` includes Leaflet and its licence. The icon licence is in `public/icons-LICENSE.txt`; `scripts/build-icons.mjs` regenerates the SVG sprite.

## Publish as a public website (your own Cloudflare account)

```bash
npm ci
npm run deploy:public
```

The first run opens a browser to log in to Cloudflare (a free account is enough), creates the `naviya-db` D1 database, builds, creates the tables and deploys. It prints the address, for example `https://naviya.<your-name>.workers.dev/explore.html`. Run the same command after every update. Settings live in `naviya.public.json` (no secrets): the worker name, database name, and optional provider addresses.

On this self-hosted site:

- ChatGPT sign-in is not available, so account and points pages are hidden, and any `oai-authenticated-*` header sent by a visitor is removed (`lib/public-hosting.ts`).
- Before sharing widely, set a map tile provider in `naviya.public.json`. For example, with a free MapTiler key: `"NAVIYA_TILE_URL": "https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=YOUR_KEY"` and `"NAVIYA_TILE_ATTRIBUTION": "© MapTiler © OpenStreetMap contributors"`. Without it, the community OpenStreetMap tiles are used, which suit light traffic only. Restrict the key to your site's domain in the provider's dashboard.
- For more traffic, point `NAVIYA_PHOTON_URL`, `NAVIYA_ROUTER_*_URL` and `NAVIYA_OVERPASS_URL` at dedicated services. The public demo services have no guarantee and can block heavy use.
- Optional live traffic: `npm run deploy:public -- --secret NAVIYA_TOMTOM_KEY` (asks you to paste the key).
- Privacy policy and terms: `/privacy.html`.
- Your own domain: add the domain to the same Cloudflare account (buy it under Domains → Register, or point an existing domain's nameservers to Cloudflare), then list it in `naviya.public.json`, for example `"customDomains": ["naviya.my", "www.naviya.my"]`, and run `npm run deploy:public`. Visiting `/` opens the map.

## Deployment and provider capacity

The full app needs a Worker-compatible runtime, a `DB` D1 binding and supported authentication dispatch. GitHub Pages cannot run its API or account system. Sites hosting is configured through `.openai/hosting.json`; GitHub export copies omit the production project ID.

The default Photon and OSRM public services are for reasonable small, non-commercial use and have no availability guarantee. Search and nearby results use bounded caches. Route requests use a short per-instance rate gate and bounded caches; this is not a global, cross-region commercial quota system. Configure dedicated router base URLs through `NAVIYA_ROUTER_CAR_URL`, `NAVIYA_ROUTER_WALK_URL` and `NAVIYA_ROUTER_CYCLE_URL` for production scale. Each base must expose the appropriate OSRM profile at `/route/v1/driving`. Live transit uses `https://api.data.gov.my/gtfs-realtime/vehicle-position/` by default (override with `NAVIYA_GTFS_RT_URL`). To switch on live traffic, add `NAVIYA_TOMTOM_KEY` as a secret in the hosting environment settings (TomTom offers a free developer tier; check their current limits). Without it, routes use road-speed estimates.

## Privacy

Search queries and nearby coordinates are forwarded through Naviya to Photon. Route endpoints go to the routing provider, and to TomTom when live traffic is switched on. In train/bus mode the server filters the public data.gov.my feeds; visitor locations are not sent there. During navigation the GPS position stays on the device except as a new starting point when Naviya recalculates a route; route geometry is sent to Overpass to find stops along the way. Prayer times are calculated on the device. Account identity is not forwarded. Map tiles contact OpenStreetMap directly and expose the visitor IP and viewed map area. Google Fonts is also loaded.

Exact saved journey locations, day plans, observations and theme preferences are stored in the browser. Signing out does not erase those local records; Privacy controls can clear them. Server records consist of the account profile and points ledger. No application password is collected.

## Credits

- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright): map data and attribution requirements.
- [Photon](https://github.com/komoot/photon): general place search and nearby discovery.
- [OSRM](https://project-osrm.org/): road routing; respect public service limits.
- [Leaflet](https://leafletjs.com/): interactive maps, licence in `public/vendor/leaflet-LICENSE.txt`.
- [Lucide](https://lucide.dev/): SVG icons, ISC licence included.

Project-wide reuse licensing has not yet been selected.
