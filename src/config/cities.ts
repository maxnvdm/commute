/**
 * City-agnostic configuration.
 *
 * The app is built city-agnostic from day one: adding a new metro is a data
 * change here, not a code change. Each city drives the default map view, the
 * geocoding viewbox, and (later) which regional routing data to use.
 */

export interface City {
  /** Stable slug used in URLs and lookups, e.g. "cape-town". */
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** Country, for disambiguation in the picker. */
  country: string;
  /** Default map center as [lng, lat] (MapLibre order). */
  center: [number, number];
  /** Default map zoom level. */
  zoom: number;
  /** Bounding box [minLng, minLat, maxLng, maxLat] used to bias geocoding. */
  bbox: [number, number, number, number];
}

export const CITIES: City[] = [
  {
    id: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    center: [18.4241, -33.9249],
    zoom: 11,
    bbox: [18.3, -34.1, 18.7, -33.7],
  },
];

export const DEFAULT_CITY_ID = "cape-town";

/** Returns the default city (Cape Town), falling back to the first entry. */
export function getDefaultCity(): City {
  return CITIES.find((c) => c.id === DEFAULT_CITY_ID) ?? CITIES[0];
}

/** Resolves a city by id, falling back to the default when unknown/missing. */
export function getCity(id: string | null | undefined): City {
  if (!id) return getDefaultCity();
  return CITIES.find((c) => c.id === id) ?? getDefaultCity();
}
