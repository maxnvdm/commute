import { NextResponse, type NextRequest } from "next/server";
import { createOpenRouteServiceProvider } from "@/lib/routing/openrouteservice";
import { TRAVEL_MODES, type TravelMode } from "@/lib/routing/types";
import { colorizeIsochrones, parseRanges } from "@/lib/isochrone";

/**
 * Isochrone proxy → OpenRouteService.
 *
 * Returns GeoJSON time-band polygons (colorized per band) for a destination.
 * The ORS key stays server-side. Responses are cached in-memory by rounded
 * destination + mode + ranges to stay under the free-tier quota (~500/day).
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 200;
// Results are deterministic per location/mode/ranges, so let the CDN cache them
// too (a day fresh, then served stale for a week while revalidating).
const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";
const cache = new Map<string, { at: number; data: unknown }>();

// ~110m rounding so nearby clicks reuse the same cached isochrone.
function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lng = Number(sp.get("lng"));
  const lat = Number(sp.get("lat"));
  const modeRaw = sp.get("mode");
  const mode: TravelMode = TRAVEL_MODES.includes(modeRaw as TravelMode)
    ? (modeRaw as TravelMode)
    : "driving";
  const ranges = parseRanges(sp.get("ranges"));

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json(
      { error: "Missing or invalid lng/lat" },
      { status: 400 },
    );
  }

  const key = `${roundCoord(lng)},${roundCoord(lat)}|${mode}|${ranges.join("-")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.data, {
      headers: { "x-cache": "HIT", "Cache-Control": CACHE_CONTROL },
    });
  }

  let provider;
  try {
    provider = createOpenRouteServiceProvider();
  } catch {
    return NextResponse.json(
      { error: "Isochrone service is not configured (missing ORS_API_KEY)." },
      { status: 503 },
    );
  }

  try {
    const raw = await provider.getIsochrones({ point: { lng, lat }, mode, ranges });
    const data = colorizeIsochrones(raw, ranges);

    if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
    cache.set(key, { at: Date.now(), data });

    return NextResponse.json(data, {
      headers: { "x-cache": "MISS", "Cache-Control": CACHE_CONTROL },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Isochrone request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
