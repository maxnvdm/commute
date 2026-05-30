import { describe, expect, it } from "vitest";
import { DEFAULT_TRAVEL_MODE, parseTravelMode } from "./types";

describe("parseTravelMode", () => {
  it("accepts each valid mode", () => {
    expect(parseTravelMode("driving")).toBe("driving");
    expect(parseTravelMode("walking")).toBe("walking");
    expect(parseTravelMode("cycling")).toBe("cycling");
  });

  it("falls back to the default for invalid or missing values", () => {
    expect(parseTravelMode("teleport")).toBe(DEFAULT_TRAVEL_MODE);
    expect(parseTravelMode(null)).toBe(DEFAULT_TRAVEL_MODE);
    expect(parseTravelMode(undefined)).toBe(DEFAULT_TRAVEL_MODE);
  });
});
