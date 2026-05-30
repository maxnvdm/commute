# Commute Heatmap

A website where you enter a destination address (a new job, school, etc.) and
see a **heatmap of commute times** to that address from the surrounding area,
rendered as colored **isochrone time bands** on a map. The goal: help people
decide **where to live** to minimize their daily commute.

Built **free-first** (free tiers / open-source only) and **city-agnostic**
(cities are config-driven). First launch city: **Cape Town**.

See [`PLAN.md`](./PLAN.md) for the full vision, provider comparison, and roadmap.

## Tech stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **MapLibre GL JS** + **OpenFreeMap** tiles (no API key)
- **Nominatim** for geocoding (via a server-side proxy)
- **OpenRouteService** for isochrones (server-side proxy; v1)
- **Vitest** + Testing Library for unit tests
- Deploys free on **Vercel**

## Getting started

```bash
pnpm install
cp .env.example .env.local   # add your ORS_API_KEY when ready (see below)
pnpm dev                     # http://localhost:3000
```

The map and address search work without any API key. The isochrone heatmap
(M2, in progress) needs a free OpenRouteService key:

1. Sign up at https://openrouteservice.org/dev/#/signup
2. Put the key in `.env.local` as `ORS_API_KEY=...`
3. On Vercel, add the same as an environment variable.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run the dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Run unit tests once (Vitest) |
| `pnpm test:watch` | Vitest in watch mode |

## Project layout

```
src/
  app/
    page.tsx              # main UI: map + search, URL-synced state
    layout.tsx
    api/geocode/route.ts  # Nominatim proxy (server-side, cached)
  components/
    MapView.tsx           # MapLibre map + destination marker
    SearchBox.tsx         # debounced address autocomplete
  config/
    cities.ts             # city-agnostic config (Cape Town default)
  lib/
    geocode.ts            # geocode response types
    nominatim.ts          # pure Nominatim → result mapping (tested)
    url-state.ts          # shareable URL state encode/decode (tested)
    routing/
      types.ts            # RoutingProvider interface
      openrouteservice.ts # ORS isochrone provider (v1)
```

## Roadmap status

- [x] **M0 — Setup:** scaffold, MapLibre + OpenFreeMap map, CI (lint/typecheck/test/build)
- [x] **M1 — Address search:** geocode proxy + autocomplete, recenter + marker, shareable URL
- [x] **M2 — Isochrone heatmap (MVP):** ORS proxy + render colored time bands + legend (needs `ORS_API_KEY`)
- [x] **M3 — Modes & controls:** driving/walking/cycling toggle + adjustable max time, all encoded in the shareable URL
- [ ] **M4 — Polish & deploy:** loading/error states, caching, mobile, Vercel
- [ ] **M5/M6 (v2):** Valhalla traffic, OpenTripPlanner transit
