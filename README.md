# Naviya Maps

**Find your place. Across Malaysia.**

A Malaysian place-discovery and road-journey website with a purple identity, light/dark themes and self-hosted SVG icons.

## Working features

- General place and address search across Peninsular Malaysia, Sabah and Sarawak, powered by Photon/OpenStreetMap.
- A real, interactive OpenStreetMap map with markers for the places returned by the selected category.
- Nearby restaurants, cafes, malls, hotels, museums, attractions, rail/bus transit locations, pharmacies, ATMs, petrol, EV charging, hospitals, parking, prayer spaces and rest areas.
- Area selection through search or map movement, with **1, 3, 5 or 10 km** radius filters. Nearby distances are straight-line distances, not travel distances. The provider returns up to 40 mapped results; coverage is not exhaustive.
- Real **driving, walking and cycling** route geometry, road distances, estimated journey durations, available alternatives and route steps through OSRM services. Times use road-network speeds, without live traffic.
- Driving toll-avoidance requests where supported by the routing provider. An unsupported request produces an explicit error; it is never silently replaced with an ordinary route.
- Fuel-cost estimates based on actual calculated route distance and the user's entered fuel economy and price. Toll costs are not included.
- Exact-coordinate saved journeys, reorderable day plans and local road observations. Observations expire after two hours and are not broadcast to other users.
- Device location only when the visitor explicitly chooses **Use my location**. No background tracking.
- Account/profile pages, platform ChatGPT sign-in, a persistent D1 points ledger and digital reward redemption on supported hosting.

The earlier fixed sample catalogue, mock traffic overlay, simulated route choices and illustrative Smart Lane schedule have been removed from the running application.

## Services not connected

Live traffic, current toll prices, dedicated motorbike routing, train/bus journey schedules and fares, verified camera alerts and official Smart Lane activation are **not connected**. Their UI explains the unavailable state instead of generating results. Train and bus selections can discover mapped transit locations but do not produce invented itineraries.

Naviya is not a fully operational nationwide Waze replacement. Business listings and access conditions may be incomplete or outdated. There is no real-time vehicle tracking, spoken navigation or traffic-aware ETA. A full commercial launch requires dedicated service capacity, licensed/verified traffic and transport data, operational monitoring and field validation.

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
npm run dev -- --port 4173
```

Apply each migration once, in order. Production and preview databases are separate. No database migration is required specifically for nationwide place discovery or routing.

## Validation

```bash
node tests/place-search.test.mjs
node tests/road-routing.test.mjs
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
| Routing | OSRM car, foot and bike profiles |
| Icons | Local Lucide SVG sprite |

`public/malaysia.js` owns the nationwide map, search, discovery and journey interface. `app/api/search`, `app/api/nearby` and `app/api/route` provide the server endpoints. `lib/place-search.ts` and `lib/road-routing.ts` normalize provider data. `public/vendor` includes Leaflet and its licence. The icon licence is in `public/icons-LICENSE.txt`; `scripts/build-icons.mjs` regenerates the SVG sprite.

## Deployment and provider capacity

The full app needs a Worker-compatible runtime, a `DB` D1 binding and supported authentication dispatch. GitHub Pages cannot run its API or account system. Sites hosting is configured through `.openai/hosting.json`; GitHub export copies omit the production project ID.

The default Photon and OSRM public services are for reasonable small, non-commercial use and have no availability guarantee. Search and nearby results use bounded caches. Route requests use a short per-instance rate gate and bounded caches; this is not a global, cross-region commercial quota system. Configure dedicated router base URLs through `NAVIYA_ROUTER_CAR_URL`, `NAVIYA_ROUTER_WALK_URL` and `NAVIYA_ROUTER_CYCLE_URL` for production scale. Each base must expose the appropriate OSRM profile at `/route/v1/driving`. Dedicated search and traffic/transit integrations remain future infrastructure work.

## Privacy

Search queries and nearby coordinates are forwarded through Naviya to Photon. Route endpoints go to the routing provider. Account identity is not forwarded. Map tiles contact OpenStreetMap directly and expose the visitor IP and viewed map area. Google Fonts is also loaded.

Exact saved journey locations, day plans, observations and theme preferences are stored in the browser. Signing out does not erase those local records; Privacy controls can clear them. Server records consist of the account profile and points ledger. No application password is collected.

## Credits

- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright): map data and attribution requirements.
- [Photon](https://github.com/komoot/photon): general place search and nearby discovery.
- [OSRM](https://project-osrm.org/): road routing; respect public service limits.
- [Leaflet](https://leafletjs.com/): interactive maps, licence in `public/vendor/leaflet-LICENSE.txt`.
- [Lucide](https://lucide.dev/): SVG icons, ISC licence included.

Project-wide reuse licensing has not yet been selected.
