import { DEFAULT_CITY_ID } from "@/config/cities";
import { TRAVEL_MODES, type TravelMode } from "./routing/types";

/**
 * Shareable app state encoded in the URL query string so a link reproduces the
 * exact view: city, selected destination, and travel mode.
 */
export interface AppState {
  city: string;
  mode: TravelMode;
  dest?: { lng: number; lat: number; label: string };
}

const DEFAULT_MODE: TravelMode = "driving";

function parseMode(value: string | null): TravelMode {
  return TRAVEL_MODES.includes(value as TravelMode)
    ? (value as TravelMode)
    : DEFAULT_MODE;
}

/** Serializes app state into URL search params. */
export function encodeState(state: AppState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("city", state.city);
  params.set("mode", state.mode);
  if (state.dest) {
    params.set("lng", state.dest.lng.toFixed(6));
    params.set("lat", state.dest.lat.toFixed(6));
    params.set("label", state.dest.label);
  }
  return params;
}

/** Parses app state from URL search params, applying defaults for anything missing or invalid. */
export function decodeState(params: URLSearchParams): AppState {
  const city = params.get("city") || DEFAULT_CITY_ID;
  const mode = parseMode(params.get("mode"));

  const lngRaw = params.get("lng");
  const latRaw = params.get("lat");
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  const dest =
    lngRaw !== null &&
    latRaw !== null &&
    Number.isFinite(lng) &&
    Number.isFinite(lat)
      ? { lng, lat, label: params.get("label") ?? "" }
      : undefined;

  return { city, mode, dest };
}
