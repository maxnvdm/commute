/**
 * Routing provider abstraction.
 *
 * All isochrone access goes through this interface so the underlying provider
 * (OpenRouteService for v1, self-hosted Valhalla / OpenTripPlanner in v2) can
 * be swapped without touching the UI or API routes.
 */

export type TravelMode = "driving" | "walking" | "cycling";

export const TRAVEL_MODES: TravelMode[] = ["driving", "walking", "cycling"];

export const DEFAULT_TRAVEL_MODE: TravelMode = "driving";

/** Parses an untrusted value into a TravelMode, falling back to the default. */
export function parseTravelMode(value: string | null | undefined): TravelMode {
  return TRAVEL_MODES.includes(value as TravelMode)
    ? (value as TravelMode)
    : DEFAULT_TRAVEL_MODE;
}

export interface LngLat {
  lng: number;
  lat: number;
}

export interface IsochroneRequest {
  /** Destination point the isochrones are computed *to/from*. */
  point: LngLat;
  mode: TravelMode;
  /** Time bands in minutes, ascending, e.g. [10, 20, 30, 45, 60]. */
  ranges: number[];
  /** Optional departure time for traffic-aware providers (v2). Ignored in v1. */
  departAt?: Date;
}

/** GeoJSON FeatureCollection of isochrone time-band polygons. */
export type IsochroneResult = GeoJSON.FeatureCollection;

export interface RoutingProvider {
  /** Identifier for logging/diagnostics, e.g. "openrouteservice". */
  readonly name: string;
  getIsochrones(req: IsochroneRequest): Promise<IsochroneResult>;
}
