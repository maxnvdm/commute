import type { GeocodeResult } from "./geocode";

/** Raw item shape from the Nominatim search API (jsonv2). */
export interface NominatimItem {
  display_name?: string;
  lon?: string;
  lat?: string;
}

/**
 * Maps raw Nominatim results into our normalized GeocodeResult shape,
 * dropping any items with missing or non-numeric coordinates. Pure function so
 * it can be unit-tested without hitting the network.
 */
export function mapNominatimResults(items: NominatimItem[]): GeocodeResult[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const lng = Number(item.lon);
      const lat = Number(item.lat);
      if (!item.display_name || !Number.isFinite(lng) || !Number.isFinite(lat)) {
        return null;
      }
      return { label: item.display_name, lng, lat } satisfies GeocodeResult;
    })
    .filter((r): r is GeocodeResult => r !== null);
}
