# Departure Time — Design Spec

**Date:** 2026-06-09  
**Status:** Approved

## Goal

Allow users to set a departure time so the isochrone reflects typical traffic conditions at that time of day. Uses Mapbox Isochrone API (supports historic traffic via `depart_at`) alongside the existing OpenRouteService provider.

---

## Architecture

### Provider selection

Two routing providers coexist behind the existing `RoutingProvider` interface:

- **ORS** — used when `departTime === "any"` (default, no Mapbox token required)
- **Mapbox** — used when any specific time slot is selected

The API route (`/api/isochrone`) reads the `dep` query param, constructs the request, and picks the provider. Both call `provider.getIsochrones(req)` identically.

### Departure time representation

`DepartTime` is a union type: `"any" | "0800" | "0900" | "1200" | "1700" | "1800"`.

String codes rather than `Date` objects — simpler URL encoding, no serialization ambiguity.

The Mapbox provider converts a code to a full ISO 8601 datetime by combining it with the next Monday's date (e.g. `2026-06-15T08:00`). Monday is used as a representative weekday. Mapbox uses historic traffic averages, so public holidays have no meaningful impact.

---

## New type

```ts
// src/lib/routing/types.ts (addition)
export type DepartTime = "any" | "0800" | "0900" | "1200" | "1700" | "1800";
export const DEPART_TIMES: DepartTime[] = ["any", "0800", "0900", "1200", "1700", "1800"];
export const DEFAULT_DEPART_TIME: DepartTime = "any";

/** Parses an untrusted value into a DepartTime, falling back to the default. */
export function parseDepartTime(value: string | null | undefined): DepartTime {
  return DEPART_TIMES.includes(value as DepartTime)
    ? (value as DepartTime)
    : DEFAULT_DEPART_TIME;
}

export const DEPART_TIME_LABELS: Record<DepartTime, string> = {
  any:  "Any time",
  "0800": "8:00 AM",
  "0900": "9:00 AM",
  "1200": "12:00 PM",
  "1700": "5:00 PM",
  "1800": "6:00 PM",
};
```

---

## UI — Controls

A "Departure time" button group is added to `Controls.tsx` below "Max commute time", using the same style as the travel mode selector.

```
[ Any time ] [ 8:00 AM ] [ 9:00 AM ] [ 12:00 PM ] [ 5:00 PM ] [ 6:00 PM ]
```

New props on `Controls`:
```ts
departTime: DepartTime;
onDepartTimeChange: (t: DepartTime) => void;
```

Selecting any slot other than "Any time" triggers a refetch via the existing `state` → `useEffect` dependency chain.

---

## State & URL encoding

`AppState` in `url-state.ts` gains:
```ts
departTime: DepartTime;
```

- `encodeState`: adds `dep=<value>` (omitted or `dep=any` both map to default)
- `decodeState`: parses `dep` param, falls back to `"any"` for missing/invalid values

Shared links preserve the selected departure time.

---

## API route — `/api/isochrone`

1. Reads new `dep` query param (defaults to `"any"`)
2. Chooses provider:
   - `dep === "any"` → ORS (existing path, unchanged)
   - else → Mapbox provider
3. Cache key gains `|dep=<value>` suffix to prevent ORS/Mapbox cache collisions

Error: if `MAPBOX_TOKEN` is unset and `dep !== "any"`, returns 503:
```json
{ "error": "Departure time routing requires a Mapbox token (MAPBOX_TOKEN)" }
```
No silent fallback to ORS — the different isochrone shapes would confuse the user.

---

## Mapbox provider — `src/lib/routing/mapbox.ts`

**Endpoint:** `GET https://api.mapbox.com/isochrone/v1/mapbox/{profile}/{lng},{lat}`

**Query params:** `contours_minutes`, `polygons=true`, `depart_at`, `access_token`

**Profile mapping:**
| TravelMode | Mapbox profile |
|---|---|
| driving | driving-traffic |
| walking | walking |
| cycling | cycling |

**Response normalization:** Mapbox returns `properties.contour` (minutes) instead of `properties.value` (seconds). The provider normalizes before returning: `properties.value = contour * 60`. This lets `colorizeIsochrones` work without modification.

**Factory:** `createMapboxProvider()` reads `MAPBOX_TOKEN` env var, throws if missing (caller handles the 503).

**`nextMondayAt(code)`** helper: returns an ISO 8601 string for the next Monday on or after today at the given time, e.g. `nextMondayAt("0800")` → `"2026-06-15T08:00"`. If today is Monday, uses today's date.

---

## Testing

| File | What's tested |
|---|---|
| `src/lib/routing/mapbox.test.ts` | Correct URL construction with `depart_at`; response normalization (`contour → value`); fetch error propagation |
| `src/lib/url-state.test.ts` | `dep` param round-trips; invalid values fall back to `"any"` |
| `src/lib/routing/types.test.ts` | `parseDepartTime` helper (analogous to `parseTravelMode`) |

No changes to existing ORS tests.

---

## Environment

Add to `.env.example`:
```
# Mapbox public token — required for departure-time isochrones (free tier: 100k req/month)
# Get one at https://account.mapbox.com/
MAPBOX_TOKEN=
```

---

## Out of scope

- Day-of-week picker (weekday assumed; historic traffic averages out holidays)
- Live/real-time traffic (Mapbox `depart_at` uses historic patterns only)
- Replacing ORS (kept as the default, no-token path)
