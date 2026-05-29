/** A geocoded place returned by the /api/geocode proxy. */
export interface GeocodeResult {
  /** Human-readable address label. */
  label: string;
  /** Longitude. */
  lng: number;
  /** Latitude. */
  lat: number;
}

/** Shape of the /api/geocode JSON response. */
export interface GeocodeResponse {
  results: GeocodeResult[];
  error?: string;
}
