# Naviya readiness and provider setup

The hosted site is private to its owner. Preserve this audience when deploying. Account profiles and rewards require the platform identity; journeys and day plans remain on the device.

## Working and tested

- Real Photon/OSM search, including a Malls filter and focused mall lookup for short searches. TRX finds The Exchange TRX without a hardcoded place catalog.
- Nearby discovery checked in Kuala Lumpur, George Town, Kota Kinabalu and Kuching. Only 12 cards appear initially; all returned places stay on the map.
- Real driving, walking and cycling geometry, exact endpoints, duration sorting, toll-avoidance error handling and nonblocking camera lookup.
- Two-user API isolation, one-time point awards, duplicate reward redemption, scoped account-data export and deletion, request size limits and cross-origin write rejection.
- Provider response cache, duplicate-request coalescing, cooldown on provider errors and shared D1 request allowances across Worker instances.

## Provider configuration

Set runtime values using Sites environment settings, never browser code or tracked secrets. No paid subscriptions or accounts have been provisioned.

| Variable | Expected value |
| --- | --- |
| NAVIYA_PHOTON_URL | HTTPS base of a Photon-compatible service, with a trailing slash. Default https://photon.komoot.io/ |
| NAVIYA_OVERPASS_URL | Full HTTPS interpreter endpoint. Default https://overpass.private.coffee/api/interpreter |
| NAVIYA_ROUTER_CAR_URL | HTTPS OSRM-compatible base for driving |
| NAVIYA_ROUTER_WALK_URL | HTTPS OSRM-compatible base for walking |
| NAVIYA_ROUTER_CYCLE_URL | HTTPS OSRM-compatible base for cycling |

Default shared quotas count upstream calls, not cache hits: places 60/minute and 4,000/day; routing 30/minute and 1,000/day; cameras 6/minute and 100/day. Search and nearby share the places allowance. Quotas use UTC minute/day buckets and are safety limits, not purchased provider capacity. Change them only to match an agreed provider allowance. Usage records contain bucket names, counts and expiry, never account IDs or search terms. Expired records are cleaned on subsequent requests. Caches contain provider responses in memory for up to one hour and do not link queries to account identities.

## Camera coverage

Counts include OSM highway=speed_camera nodes within 50 metres of the original driving route. A 70 m query corridor includes the 15 m line simplification tolerance. Counts are deduplicated by node ID. Direction and operation are unverified, so opposite-carriageway cameras may appear. Mobile traps, unmapped cameras and enforcement relations are excluded. Partial responses are rejected; a provider failure never becomes zero cameras. Provider map timestamp and check time appear under Details. Camera service live connectivity timed out during the Windows test; matching and API behavior pass deterministic tests. Recheck live connectivity in the hosted environment before advertising camera availability.

Sources: https://github.com/komoot/photon/blob/master/docs/api-v1.md and https://overpass.private.coffee/ . Public providers provide no uptime guarantee. A larger launch needs dedicated provider capacity and monitoring.

## Unavailable features

Live traffic, toll prices, verified Smart Lane activation, motorcycle-specific routes, and scheduled train/bus itineraries need licensed or official feeds. Train and bus currently offer station/stop discovery. Road notes are local and unverified. No traffic colors, highway activation times or fares are invented.

## Validation and rollout

Run the Node test files in tests, TypeScript checks and the Sites build. The live-provider integration script is a single small validation pass, not a load test. Apply only pending migrations to local D1; Sites applies production migrations during publication. Two-account automated tests use an in-memory SQLite database; they never delete hosted data. Physical iPhone/Android testing and multi-account hosted sign-in require those real devices/accounts and have not been completed here.
