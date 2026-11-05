# Naviya Maps

**Every way. Every possibility.**

A Malaysian journey-planning and place-discovery website with a purple visual identity, light and dark modes, and a consistent local SVG icon system.

## Features

- Real Malaysian place search with autocomplete, addresses and coordinates. Try **TRX**, **IOI**, **KLCC** or **Sunway Pyramid**.
- OpenStreetMap place maps and mapped restaurants, hotels, transit, pharmacies, ATMs and other places within 3 km of a selected location.
- Six transport interfaces: driving, motorbike, train, bus, walking and cycling.
- Route-comparison interface, illustrative toll estimates, editable fuel-cost estimates, Smart Lane information and traffic overlays.
- Saved journeys, local incident reporting and a reorderable day-plan collection.
- ChatGPT sign-in on supported Sites hosting, profile editing, persistent account points and digital reward redemption.
- Responsive layouts, keyboard search navigation and 51 self-hosted Lucide SVG icons.

## What is real, and what is a prototype?

**Real:** place search via Photon/OpenStreetMap, selected-place maps, nearby mapped results, browser-local saved records, and account/points storage when deployed with the required authentication and D1 services.

**Illustrative:** route geometry, travel times, train/bus itineraries, toll rates, traffic conditions, camera markers, Smart Lane schedules/status and the original discovery catalogue. This is **not a production navigation service**. Selecting real places does not calculate a real journey route. Nearby distances are straight-line distances; business hours and availability are not verified.

Digital points unlock Naviya extras: a colour theme, a downloadable weekend planner and a personalised Explorer badge. They have no cash value. Merchant vouchers and transport credits are not offered.

## Run locally

Requires **Node.js 22.13 or newer**, npm and Python 3 for the integration test.

```bash
git clone https://github.com/Bunny-ecah/Naviya-Maps.git
cd Naviya-Maps
npm ci
npm run dev -- --port 4173
```

Open **http://127.0.0.1:4173**.

Portable development provides a simulated sign-in identity on loopback only. Visit `/signin` and continue to sign in with the development account. This mock identity is excluded from production builds.

### Prepare the local account database

Build once to generate the local Worker configuration, then apply the migration:

```bash
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nebulous_patriot.sql
npm run dev -- --port 4173
```

Apply migrations once, in order. Existing local database records and development sessions are excluded from Git.

## Validation

```bash
npm run build
node tests/place-search.test.mjs
```

With the local preview running and the database prepared:

```bash
python tests/account-integration.py
```

The integration test uses the simulated local account and verifies authentication, sign-out, origin protection, input validation, one-time bonuses, duplicate redemption and insufficient-balance checks. Do not point it at production.

## Stack and structure

| Area | Implementation |
| --- | --- |
| Server and pages | TypeScript, React, Vinext, Cloudflare Workers |
| Account storage | Cloudflare D1, Drizzle schema/migrations |
| Exploration interface | HTML, CSS, JavaScript |
| Place search | Photon with OpenStreetMap data |
| Icons | Local Lucide SVG sprite |

- `app/`: server-rendered account pages and API routes.
- `public/`: exploration interface, account assets and icon sprite.
- `lib/place-search.ts`: place normalization, provider cache and distance calculation.
- `db/` and `drizzle/`: database schema and migrations.
- `tests/`: place-search and local account checks.
- `scripts/`: development/build helpers and icon generation.

## Hosting

The full application requires a Worker-compatible runtime, a `DB` D1 binding and a supported authentication gateway. Hosted ChatGPT sign-in is provided by Sites; it is not a standalone email/password login system. The hosting manifest has no production project ID in this repository.

GitHub Pages can serve only the static exploration files. It cannot run `/api/search`, `/api/nearby`, account authentication or persistent rewards. Use the full server runtime for those features.

## Privacy and provider limits

Search queries are forwarded through the server to Photon without the signed-in account identity. Embedded place maps contact OpenStreetMap and expose the visitor IP and selected map area. Google Fonts is also used. The app does not request GPS location or collect passwords.

Saved journeys, incident reports, day plans and applied themes remain in the browser. Account profiles and the points ledger are stored in D1. Signing out does not clear device-local records.

Photon's public service is appropriate only for reasonable small-project usage and has no availability guarantee. A production launch should use a dedicated or self-hosted provider and verify all transport/highway data.

## Credits

- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright): map data, subject to ODbL and attribution requirements.
- [Photon](https://github.com/komoot/photon): place search.
- [Lucide](https://lucide.dev/): icons under the included [ISC licence](public/icons-LICENSE.txt).

Project-wide reuse licensing has not yet been selected.
