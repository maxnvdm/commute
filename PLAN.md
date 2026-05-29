# Commute Heatmap — Project Plan

## 1. Vision

A website where a user enters a destination address (e.g. a new job or
school) and sees a **heatmap of commute times** to that address from the
surrounding area, rendered as colored **isochrone time bands** on a map.

The goal is to help people decide **where to live** in order to minimize
their daily commute — "if I move to this neighbourhood, my drive is ~20 min;
over there it's 45 min."

## 2. Core principle: free first

Cost is the top constraint. Every v1 component is chosen to run on a free
tier or free/open-source software, with no credit card required. Paid /
self-hosted upgrades are deferred to later phases and clearly marked.

## 3. Features

### v1 (must-have)
- Address search box with autocomplete → resolves to a lat/lng.
- Interactive map centered on the destination.
- Isochrone heatmap: colored bands for e.g. 10 / 20 / 30 / 45 / 60 min.
- Travel mode toggle: **driving, walking, cycling**.
- Adjustable max time / band thresholds.
- Legend + hover tooltips showing the time band.
- Shareable URL (destination + mode + settings encoded in the link).

### v2 (nice-to-have)
- **Time-of-day / rush-hour** awareness (traffic-aware driving).
- **Public transit** mode.
- Neighbourhood overlay (name + average commute per area).
- Compare two destinations side by side.
- Saved searches / favourites.

## 4. Why isochrone bands (vs. other heatmap styles)

| Approach | Pros | Cons |
|---|---|---|
| **Isochrone bands** (chosen) | One API call per query; clean "where to move" zones; cheap | Bands not individual neighbourhoods |
| Neighbourhood polygons | Matches "neighbourhoods" wording | Needs boundary data + 1 routing call per area |
| Grid heatmap | Smoothest gradient | Many routing calls = blows free quota |

Isochrones give the clearest answer with the fewest API calls, which keeps
us inside free quotas. Neighbourhood naming can be layered on top in v2.

## 5. Routing / isochrone provider comparison

The single most important cost decision. Comparison of free options:

| Provider | Free tier | Modes | Time-of-day traffic | Self-host? | Notes |
|---|---|---|---|---|---|
| **OpenRouteService (chosen for v1)** | ~500 isochrone req/day, free API key | car, walk, bike, HGV | No (no live traffic) | Optional | Native isochrone endpoint — exactly what we need, no infra |
| Mapbox Isochrone | 100k req/mo free | car, walk, bike | Limited | No | Generous, but needs card on file; ToS limits |
| Valhalla (self-hosted) | Free (your server) | car, walk, bike | Time-dependent driving | Required | Best for v2 traffic; needs OSM extract + hosting |
| OpenTripPlanner (self-hosted) | Free (your server) | **transit** + walk/bike | Yes (schedules) | Required | The free path to transit; needs GTFS feeds |
| Google Routes/Distance Matrix | $200/mo credit then paid | all + transit | Yes (best) | No | Most accurate but not free long-term |
| TravelTime API | Small free trial | all + transit | Yes | No | Purpose-built isochrones, but trial only |

**Decision:** Start with **OpenRouteService** (zero infra, free, covers
driving/walking/cycling + isochrones). Migrate driving to **self-hosted
Valhalla** in v2 for time-of-day traffic, and add **OpenTripPlanner** for
transit. Code will isolate the routing call behind an interface so the
provider can be swapped without touching the UI.

> Action for Max: confirm OpenRouteService free tier is acceptable for v1.
> If we expect heavy traffic, we jump straight to self-hosted Valhalla.

## 6. Other data sources (all free)

- **Map tiles:** OpenFreeMap (free, no API key) via MapLibre GL JS.
  Fallback: MapTiler free tier or raster OSM tiles.
- **Geocoding / address autocomplete:** Nominatim (OpenStreetMap).
  Respect usage policy (≤1 req/sec, cache results). Fallback: ORS geocoding.
- **Base map library:** MapLibre GL JS (open-source fork of Mapbox GL).

## 7. Tech stack

- **Framework:** Next.js (React). One codebase, deploys free on Vercel.
- **Map:** MapLibre GL JS + OpenFreeMap.
- **Backend:** Next.js API routes act as a thin proxy to ORS/Nominatim so
  the API key stays server-side and we can cache + rate-limit.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS (fast, no design overhead).
- **Hosting:** Vercel free tier (frontend + serverless API routes).
- **Caching:** in-memory + optional Vercel KV / simple file cache for
  repeated isochrone queries to stay under free quotas.

## 8. Geographic scope

**First launch city: Cape Town, South Africa.** The app is built
**city-agnostic** from day one — cities are config-driven (name, default
map center/zoom, bounding box) so adding new metros is a data change, not a
code change. Cape Town is the first entry in that config and the default
demo, but nothing is hard-coded to it.

v1 works **anywhere ORS covers** (global) but is rate-limited by the free
tier, so it's tuned per city. v2 self-hosting can target each metro with a
regional OSM extract + that metro's GTFS feeds, added incrementally as we
scale to more areas/cities.

A `cities` config (e.g. `cities.ts` / JSON) drives a city picker; the URL
encodes the active city so links are city-aware and shareable.

## 9. Architecture (v1)

```
Browser (Next.js + MapLibre)
  │  1. user types address
  ▼
/api/geocode  ──► Nominatim ──► lat/lng + suggestions
  │  2. user picks destination, mode, max time
  ▼
/api/isochrone ──► OpenRouteService ──► GeoJSON time-band polygons
  │  (server caches by destination+mode+params)
  ▼
MapLibre renders polygons as colored heatmap layers + legend
```

Routing access is wrapped in a `RoutingProvider` interface
(`getIsochrones(point, mode, ranges, departAt?)`) with an
`OpenRouteServiceProvider` impl for v1 and `ValhallaProvider` /
`OpenTripPlannerProvider` impls for v2.

## 10. Milestones

- **M0 — Setup:** Next.js + TS + Tailwind scaffold, MapLibre map with
  OpenFreeMap tiles rendering. Repo CI / lint.
- **M1 — Address search:** geocode proxy + autocomplete box; map recenters
  on selected destination with a marker.
- **M2 — Isochrone heatmap (core):** ORS proxy + render driving time bands
  with legend and configurable thresholds. *This is the MVP.*
- **M3 — Modes & controls:** walking/cycling toggle, adjustable max time,
  shareable URL state.
- **M4 — Polish & deploy:** loading/error states, caching, rate-limit
  handling, mobile layout, deploy to Vercel.
- **M5 (v2) — Traffic:** self-host Valhalla for time-of-day driving.
- **M6 (v2) — Transit:** self-host OpenTripPlanner + GTFS for a metro.

## 11. Risks & mitigations

- **Free quota exhaustion (ORS 500/day):** aggressive server-side caching
  by rounded destination + params; show a friendly limit message.
- **Nominatim rate limits / ToS:** cache geocodes, debounce autocomplete,
  set a proper User-Agent; consider ORS geocoding as backup.
- **No live traffic in v1:** clearly label times as "typical/free-flow";
  set expectations in the UI; traffic arrives in v2 via Valhalla.
- **Transit is infra-heavy:** explicitly deferred; isolate behind provider
  interface so it slots in cleanly later.
- **API key exposure:** keep keys server-side in Next.js API routes only.

## 12. Decisions (confirmed with Max)

1. **Routing provider:** OpenRouteService free tier for v1. ✅
2. **First city:** Cape Town, but built **city-agnostic** with a cities
   config so we can scale to more areas/cities without code changes. ✅
3. **Default time bands:** 10 / 20 / 30 / 45 / 60 min. ✅
4. **Deployment:** ship a **public URL on Vercel** as part of v1. ✅
