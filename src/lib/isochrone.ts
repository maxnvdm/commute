import type { IsochroneResult } from "./routing/types";

/** Default time bands in minutes (confirmed in PLAN.md §12). */
export const DEFAULT_RANGES = [10, 20, 30, 45, 60];

/** Selectable max-commute-time options (minutes) for the UI control. */
export const MAX_TIME_OPTIONS = [30, 45, 60, 90];
export const DEFAULT_MAX_TIME = 60;

/**
 * Nice, predictable band sets keyed by max time. Keeping these fixed (rather
 * than scaling arbitrarily) gives readable legends and stays within ORS limits.
 */
const RANGE_PRESETS: Record<number, number[]> = {
  30: [10, 20, 30],
  45: [15, 30, 45],
  60: [10, 20, 30, 45, 60],
  90: [15, 30, 45, 60, 90],
};

/** Returns the band set for a max time, falling back to the default bands. */
export function rangesForMaxTime(maxMinutes: number): number[] {
  return RANGE_PRESETS[maxMinutes] ?? [...DEFAULT_RANGES];
}

/** Guardrails to keep us inside ORS free-tier limits and a readable legend. */
export const MAX_RANGES = 6;
export const MAX_MINUTES = 60;

/**
 * Green (short commute) → red (long commute) ramp. Index into this with
 * colorForBand so the palette scales to any band count.
 */
export const BAND_PALETTE = [
  "#1a9850",
  "#66bd63",
  "#a6d96a",
  "#fee08b",
  "#fdae61",
  "#f46d43",
  "#d73027",
];

/** Picks a palette color for band `index` out of `total` bands. */
export function colorForBand(index: number, total: number): string {
  if (total <= 1) return BAND_PALETTE[0];
  const clamped = Math.min(Math.max(index, 0), total - 1);
  const pos = clamped / (total - 1);
  return BAND_PALETTE[Math.round(pos * (BAND_PALETTE.length - 1))];
}

/**
 * Parses a comma-separated minutes string (e.g. "10,20,30") into a sorted,
 * de-duplicated, bounded list. Falls back to DEFAULT_RANGES when empty/invalid.
 */
export function parseRanges(csv: string | null | undefined): number[] {
  if (!csv) return [...DEFAULT_RANGES];
  const parsed = csv
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= MAX_MINUTES);
  const unique = Array.from(new Set(parsed)).sort((a, b) => a - b);
  return unique.length > 0 ? unique.slice(0, MAX_RANGES) : [...DEFAULT_RANGES];
}

/** Maps an ORS isochrone `value` (seconds) to its band color. */
export function colorForValueSeconds(value: number, ranges: number[]): string {
  const idx = ranges.findIndex((minutes) => minutes * 60 >= value - 1);
  const band = idx === -1 ? ranges.length - 1 : idx;
  return colorForBand(band, ranges.length);
}

/**
 * Returns a copy of the FeatureCollection with a `color` property added to each
 * feature (so the map can style via ["get", "color"]) and features ordered
 * largest-first so smaller, hotter bands render on top.
 */
export function colorizeIsochrones(
  fc: IsochroneResult,
  ranges: number[],
): IsochroneResult {
  const features = [...fc.features]
    .sort(
      (a, b) =>
        Number(b.properties?.value ?? 0) - Number(a.properties?.value ?? 0),
    )
    .map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        color: colorForValueSeconds(Number(f.properties?.value ?? 0), ranges),
      },
    }));
  return { ...fc, features };
}

export interface LegendItem {
  minutes: number;
  color: string;
}

/** Builds legend entries (one per band) for the UI. */
export function legendItems(ranges: number[]): LegendItem[] {
  return ranges.map((minutes, i) => ({
    minutes,
    color: colorForBand(i, ranges.length),
  }));
}
