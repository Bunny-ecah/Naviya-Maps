# Naviya readiness and provider setup

The ChatGPT Sites deployment is private to its owner. For a public website use `npm run deploy:public` (see README), which hosts Naviya on your own Cloudflare account without ChatGPT sign-in. Account profiles and rewards require the platform identity; journeys and day plans remain on the device.

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
| NAVIYA_GTFS_RT_URL | Optional. Base for GTFS Realtime vehicle positions, with a trailing slash. Default https://api.data.gov.my/gtfs-realtime/vehicle-position/ |
| NAVIYA_TOMTOM_KEY | Optional secret. Switches on live traffic (overlay and delay on the fastest driving route). Leave unset to use road-speed estimates only |

Default shared quotas count upstream calls, not cache hits: places 60/minute and 4,000/day; routing 30/minute and 1,000/day; cameras 6/minute and 100/day; transit 40/minute and 6,000/day (feeds cached 25 s); traffic 20/minute and 2,000/day. Traffic overlay tiles are proxied without the D1 quota, so watch TomTom tile usage. Search and nearby share the places allowance. Quotas use UTC minute/day buckets and are safety limits, not purchased provider capacity. Change them only to match an agreed provider allowance. Usage records contain bucket names, counts and expiry, never account IDs or search terms. Expired records are cleaned on subsequent requests. Caches contain provider responses in memory for up to one hour and do not link queries to account identities.

## Camera coverage

Counts include OSM highway=speed_camera nodes within 50 metres of the original driving route. A 70 m query corridor includes the 15 m line simplification tolerance. Counts are deduplicated by node ID. Direction and operation are unverified, so opposite-carriageway cameras may appear. Mobile traps, unmapped cameras and enforcement relations are excluded. Partial responses are rejected; a provider failure never becomes zero cameras. Provider map timestamp and check time appear under Details. Camera service live connectivity timed out during the Windows test; matching and API behavior pass deterministic tests. Recheck live connectivity in the hosted environment before advertising camera availability.

Sources: https://github.com/komoot/photon/blob/master/docs/api-v1.md and https://overpass.private.coffee/ . Public providers provide no uptime guarantee. A larger launch needs dedicated provider capacity and monitoring.

## Live transit and traffic

Train and bus mode reads official data.gov.my GTFS Realtime vehicle-position feeds (KTMB, Prasarana rapid-bus-kl / rapid-bus-mrtfeeder / rapid-bus-penang, and BAS.MY Johor, Melaka, Seremban A/B, Ipoh, Kangar, Alor Setar, Kota Bharu, Kuala Terengganu, Kuching). Only feeds whose area is near the selected place are fetched. Decoding is covered by deterministic tests; live connectivity could not be tested from the build environment, so check a Klang Valley journey in Bus mode after publishing. Positions older than 10 minutes are hidden.

Live traffic is off until NAVIYA_TOMTOM_KEY is set. With a key, the map gains a Live traffic toggle and the fastest driving route shows current time and delay.

## Unavailable features

Toll prices, verified Smart Lane activation, motorcycle-specific road restrictions, bus/train arrival predictions and live LRT/MRT positions need licensed or official feeds that do not exist publicly. Riding uses the car road network and is labelled that way. Road notes are local and unverified. No traffic colours, highway activation times or fares are invented.

## Validation and rollout

Run the Node test files in tests, TypeScript checks and the Sites build. The live-provider integration script is a single small validation pass, not a load test. Apply only pending migrations to local D1; Sites applies production migrations during publication. Two-account automated tests use an in-memory SQLite database; they never delete hosted data. Physical iPhone/Android testing and multi-account hosted sign-in require those real devices/accounts and have not been completed here.
