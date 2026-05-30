import { describe, expect, it } from "vitest";
import {
  BAND_PALETTE,
  DEFAULT_RANGES,
  colorForBand,
  colorForValueSeconds,
  colorizeIsochrones,
  legendItems,
  parseRanges,
  rangesForMaxTime,
} from "./isochrone";
import type { IsochroneResult } from "./routing/types";

describe("parseRanges", () => {
  it("returns defaults for empty/invalid input", () => {
    expect(parseRanges(null)).toEqual(DEFAULT_RANGES);
    expect(parseRanges("")).toEqual(DEFAULT_RANGES);
    expect(parseRanges("abc,-5,0")).toEqual(DEFAULT_RANGES);
  });

  it("parses, sorts, de-dupes and bounds", () => {
    expect(parseRanges("30,10,20,10")).toEqual([10, 20, 30]);
    expect(parseRanges("5,15,25,35,45,55,65,75")).toHaveLength(6);
  });

  it("drops values over the max minutes", () => {
    expect(parseRanges("10,90,20")).toEqual([10, 20]);
  });
});

describe("rangesForMaxTime", () => {
  it("returns the preset for a known max time, ending at that max", () => {
    expect(rangesForMaxTime(60)).toEqual([10, 20, 30, 45, 60]);
    expect(rangesForMaxTime(30)).toEqual([10, 20, 30]);
    expect(rangesForMaxTime(90).at(-1)).toBe(90);
  });

  it("falls back to default ranges for an unknown max time", () => {
    expect(rangesForMaxTime(17)).toEqual(DEFAULT_RANGES);
  });
});

describe("colorForBand", () => {
  it("maps first band to the coolest color and last to the hottest", () => {
    expect(colorForBand(0, 5)).toBe(BAND_PALETTE[0]);
    expect(colorForBand(4, 5)).toBe(BAND_PALETTE[BAND_PALETTE.length - 1]);
  });
});

describe("colorForValueSeconds", () => {
  it("maps a band boundary in seconds to its band color", () => {
    const ranges = [10, 20, 30];
    expect(colorForValueSeconds(600, ranges)).toBe(colorForBand(0, 3));
    expect(colorForValueSeconds(1200, ranges)).toBe(colorForBand(1, 3));
    expect(colorForValueSeconds(1800, ranges)).toBe(colorForBand(2, 3));
  });
});

describe("colorizeIsochrones", () => {
  it("adds a color to each feature and orders largest band first", () => {
    const fc: IsochroneResult = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: { value: 600 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: { value: 1800 } },
      ],
    };
    const out = colorizeIsochrones(fc, [10, 20, 30]);
    // largest value first (rendered at the bottom)
    expect(out.features[0].properties?.value).toBe(1800);
    expect(out.features[1].properties?.value).toBe(600);
    expect(out.features[0].properties?.color).toBe(colorForBand(2, 3));
    expect(out.features[1].properties?.color).toBe(colorForBand(0, 3));
  });
});

describe("legendItems", () => {
  it("returns one entry per range with a color", () => {
    const items = legendItems([10, 20, 30]);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ minutes: 10, color: colorForBand(0, 3) });
  });
});
