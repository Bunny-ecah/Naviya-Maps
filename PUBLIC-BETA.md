# Naviya public beta

The map is usable without an account. Account profiles and reward balances require the platform-provided identity; saved journeys and day plans remain on the current device.

## Fixed-camera counts

Driving routes query OpenStreetMap highway=speed_camera nodes through Overpass. Each alternative is checked independently within a 50 m corridor. Nodes are deduplicated by OSM ID. A simplified query line uses a wider 70 m corridor; final matching uses the original route. Zero means no mapped nodes found, never no cameras. Opposite-carriageway cameras may be included; direction and operation are unverified. Mobile traps and average-speed enforcement relations are excluded. Map timestamp and check timestamp are returned. Partial Overpass responses are rejected. Failure never blocks road routing or becomes a zero count.

## Deployment capacity

NAVIYA_OVERPASS_URL can point to a dedicated Overpass interpreter. NAVIYA_ROUTER_CAR_URL, NAVIYA_ROUTER_WALK_URL and NAVIYA_ROUTER_CYCLE_URL configure routing providers. Use trusted HTTPS endpoints. Default public providers have no service guarantee. In-memory caches and throttles are per Worker isolate; before a high-traffic launch, provision provider capacity and an edge-wide quota/rate-limit policy. The current release is a public beta, not a verified live navigation or enforcement service.

## Still unavailable

Live traffic, toll prices, verified Smart Lane activation, motorcycle-specific routes and scheduled train/bus itineraries need licensed or official feeds. Do not present simulated substitutes. Validate real multi-user sign-in and reward isolation in the hosted environment before a wider launch.
