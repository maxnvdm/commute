import type {
  IsochroneRequest,
  IsochroneResult,
  RoutingProvider,
  TravelMode,
} from "./types";

/**
 * OpenRouteService isochrone provider (v1).
 *
 * Uses the native isochrones endpoint: one request returns all requested time
 * bands as GeoJSON polygons. Free tier is ~500 requests/day with a free API
 * key (no card required). The key is read server-side only — see .env.example.
 *
 * NOTE: live calls require ORS_API_KEY to be set. Until then this provider is
 * wired but un-exercised; the geocoding/search path (M1) works without it.
 */

const ORS_ISOCHRONES_URL = "https://api.openrouteservice.org/v2/isochrones";

const ORS_PROFILE: Record<TravelMode, string> = {
  driving: "driving-car",
  walking: "foot-walking",
  cycling: "cycling-regular",
};

export class OpenRouteServiceProvider implements RoutingProvider {
  readonly name = "openrouteservice";

  constructor(private readonly apiKey: string) {}

  async getIsochrones(req: IsochroneRequest): Promise<IsochroneResult> {
    const profile = ORS_PROFILE[req.mode];
    const res = await fetch(`${ORS_ISOCHRONES_URL}/${profile}`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations: [[req.point.lng, req.point.lat]],
        // ORS expects ranges in seconds; our API speaks minutes.
        range: req.ranges.map((minutes) => minutes * 60),
        range_type: "time",
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouteService isochrone request failed (${res.status})`);
    }

    return (await res.json()) as IsochroneResult;
  }
}

/** Builds the v1 provider from environment configuration. */
export function createOpenRouteServiceProvider(): OpenRouteServiceProvider {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ORS_API_KEY is not set. Get a free key at https://openrouteservice.org/dev/#/signup and add it to .env.local (see .env.example).",
    );
  }
  return new OpenRouteServiceProvider(apiKey);
}
