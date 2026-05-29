import { describe, expect, it } from "vitest";
import { decodeState, encodeState, type AppState } from "./url-state";

describe("url-state", () => {
  it("round-trips full state through encode/decode", () => {
    const state: AppState = {
      city: "cape-town",
      mode: "cycling",
      dest: { lng: 18.4241, lat: -33.9249, label: "City Centre" },
    };
    const decoded = decodeState(encodeState(state));
    expect(decoded.city).toBe("cape-town");
    expect(decoded.mode).toBe("cycling");
    expect(decoded.dest?.label).toBe("City Centre");
    expect(decoded.dest?.lng).toBeCloseTo(18.4241, 5);
    expect(decoded.dest?.lat).toBeCloseTo(-33.9249, 5);
  });

  it("applies defaults for empty params", () => {
    const decoded = decodeState(new URLSearchParams());
    expect(decoded.city).toBe("cape-town");
    expect(decoded.mode).toBe("driving");
    expect(decoded.dest).toBeUndefined();
  });

  it("falls back to driving for an invalid mode", () => {
    const decoded = decodeState(new URLSearchParams("mode=teleport"));
    expect(decoded.mode).toBe("driving");
  });

  it("omits destination when coordinates are missing or invalid", () => {
    expect(decodeState(new URLSearchParams("lng=18.4")).dest).toBeUndefined();
    expect(decodeState(new URLSearchParams("lng=x&lat=y")).dest).toBeUndefined();
  });
});
