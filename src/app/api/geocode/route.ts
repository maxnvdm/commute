import { NextResponse, type NextRequest } from "next/server";
import { getCity } from "@/config/cities";
import { mapNominatimResults, type NominatimItem } from "@/lib/nominatim";

/**
 * Geocoding proxy → Nominatim (OpenStreetMap).
 *
 * Runs server-side so we can set a proper User-Agent, bias results to the
 * active city's bounding box, and cache responses to respect Nominatim's usage
 * policy (<=1 req/sec). The client debounces; this layer caches.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Identify the app per Nominatim policy. Update the contact URL as needed.
const USER_AGENT = "CommuteHeatmap/0.1 (https://github.com/maxnvdm/commute)";
const MIN_QUERY_LENGTH = 3;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const cityId = req.nextUrl.searchParams.get("city");

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  const city = getCity(cityId);
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    addressdetails: "0",
    // Bias toward (but don't hard-restrict to) the active city.
    viewbox: city.bbox.join(","),
    bounded: "0",
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en",
      },
      // Cache identical lookups for a day to stay well under rate limits.
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { results: [], error: `Geocoding upstream error (${res.status})` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as NominatimItem[];
    return NextResponse.json({ results: mapNominatimResults(data) });
  } catch {
    return NextResponse.json(
      { results: [], error: "Geocoding request failed" },
      { status: 502 },
    );
  }
}
