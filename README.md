# Naviya Maps

**Find your place. Across Malaysia.**

A Malaysian place-discovery and road-journey website with a purple identity, light/dark themes and self-hosted SVG icons.

## Phone and tablet layouts

The interface adapts across phone, tablet and desktop widths while retaining the same identity. Smaller screens have a map-first layout, larger touch controls, a fixed Map/Plan/Nearby/Saved/More navigation bar, scrollable place filters and bottom-sheet dialogs. The More menu exposes saved journeys, observations, highway information, privacy and account access. Input text is 16 px on mobile to avoid automatic input zoom; search overlays account for the visual viewport and the mobile navigation hides while typing. Device safe areas and reduced-motion preferences are respected. Sign-in, account and rewards pages are also responsive.

Verified in Chromium viewport previews at 320, 390, 768, 1024 and 1366 px, including horizontal-overflow checks, navigation/dialog actions, search result bounds and account input sizing. `public/responsive.css` contains shared responsive rules; `public/mobile-nav.js` provides the compact navigation. Physical-device and cross-browser validation is still recommended before a large public launch.

## Working features

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
- **Start navigating** hand-off: open the chosen journey in Waze (live traffic, voice guidance) or Google Maps (all modes, including transit timetables and fares). Phones use the native share sheet for sharing.
- **Train and bus planner**: stations/stops near both ends with walking distance, plus **live KTM train and bus positions** from the official data.gov.my GTFS Realtime API (Rapid KL, MRT feeder, Rapid Penang, BAS.MY in nine cities and KTMB), refreshed every 30 seconds and drawn on the map.
- **Live traffic (optional)**: with a TomTom key configured on the server, a traffic-flow map overlay and current-traffic time/delay on the fastest driving route.
- Fuel-cost estimates based on the calculated route distance and the user's fuel economy and price (motorcycle default 2.5 L/100 km). Toll costs are not included.
- Day plans can open as a single multi-stop Google Maps route.
- A **Live services** panel (More menu on phones) that shows exactly what is switched on.
- Exact-coordinate saved journeys, reorderable day plans and local road observations. Observations expire after two hours and are not broadcast to other users.
- Device location only when the visitor explicitly chooses **Use my location**. No background tracking.
- Account/profile pages, platform ChatGPT sign-in, a persistent D1 points ledger and digital reward redemption on supported hosting.

The earlier fixed sample catalogue, mock traffic overlay, simulated route choices and illustrative Smart Lane schedule have been removed from the running application.

## What is still not available, and why

- **Toll prices**: LLM publishes rates, but there is no public data feed. Naviya shows whether a route uses tolls, never a guessed price.
- **Smart Lane activation**: highway operators announce it on signs and in their own apps; no public feed exists.
- **Arrival predictions for buses/trains**: data.gov.my publishes vehicle positions only. Timetables and fares open in Google Maps. LRT/MRT trains have no live position feed yet.
- **Live traffic without a key**: free public traffic data does not exist; visitors are pointed to Waze instead.
- **Motorcycle-specific restrictions**: no public router models roads closed to motorcycles. Riding routes are labelled as car-network routes.
- **Mobile speed traps**: only fixed cameras mapped in OpenStreetMap are shown.

Naviya is a planner, not a turn-by-turn navigation app; voice navigation is handed to Waze or Google Maps. Search returns up to 24 matches from the provider index and is not a complete national building registry. A full commercial launch requires dedicated service capacity, operational monitoring and field validation.

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

## Deployment and provider capacity

The full app needs a Worker-compatible runtime, a `DB` D1 binding and supported authentication dispatch. GitHub Pages cannot run its API or account system. Sites hosting is configured through `.openai/hosting.json`; GitHub export copies omit the production project ID.

The default Photon and OSRM public services are for reasonable small, non-commercial use and have no availability guarantee. Search and nearby results use bounded caches. Route requests use a short per-instance rate gate and bounded caches; this is not a global, cross-region commercial quota system. Configure dedicated router base URLs through `NAVIYA_ROUTER_CAR_URL`, `NAVIYA_ROUTER_WALK_URL` and `NAVIYA_ROUTER_CYCLE_URL` for production scale. Each base must expose the appropriate OSRM profile at `/route/v1/driving`. Live transit uses `https://api.data.gov.my/gtfs-realtime/vehicle-position/` by default (override with `NAVIYA_GTFS_RT_URL`). To switch on live traffic, add `NAVIYA_TOMTOM_KEY` as a secret in the hosting environment settings (TomTom offers a free developer tier; check their current limits). Without it, the app shows Waze hand-off instead.

## Privacy

Search queries and nearby coordinates are forwarded through Naviya to Photon. Route endpoints go to the routing provider, and to TomTom when live traffic is switched on. In train/bus mode the server filters the public data.gov.my feeds; visitor locations are not sent there. Waze and Google Maps receive a destination only when the visitor taps a Start navigating button. Account identity is not forwarded. Map tiles contact OpenStreetMap directly and expose the visitor IP and viewed map area. Google Fonts is also loaded.

Exact saved journey locations, day plans, observations and theme preferences are stored in the browser. Signing out does not erase those local records; Privacy controls can clear them. Server records consist of the account profile and points ledger. No application password is collected.

## Credits

- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright): map data and attribution requirements.
- [Photon](https://github.com/komoot/photon): general place search and nearby discovery.
- [OSRM](https://project-osrm.org/): road routing; respect public service limits.
- [Leaflet](https://leafletjs.com/): interactive maps, licence in `public/vendor/leaflet-LICENSE.txt`.
- [Lucide](https://lucide.dev/): SVG icons, ISC licence included.

Project-wide reuse licensing has not yet been selected.
