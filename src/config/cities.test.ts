import { describe, expect, it } from "vitest";
import { CITIES, DEFAULT_CITY_ID, getCity, getDefaultCity } from "./cities";

describe("cities config", () => {
  it("includes Cape Town as the default city", () => {
    const def = getDefaultCity();
    expect(def.id).toBe("cape-town");
    expect(DEFAULT_CITY_ID).toBe("cape-town");
  });

  it("every city has a well-formed shape", () => {
    for (const c of CITIES) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.country.length).toBeGreaterThan(0);
      expect(c.center).toHaveLength(2);
      expect(c.bbox).toHaveLength(4);
      expect(c.zoom).toBeGreaterThan(0);
      // bbox is [minLng, minLat, maxLng, maxLat]
      expect(c.bbox[0]).toBeLessThan(c.bbox[2]);
      expect(c.bbox[1]).toBeLessThan(c.bbox[3]);
    }
  });

  it("getCity falls back to the default for unknown or missing ids", () => {
    expect(getCity("does-not-exist").id).toBe("cape-town");
    expect(getCity(null).id).toBe("cape-town");
    expect(getCity(undefined).id).toBe("cape-town");
  });

  it("getCity resolves a known id", () => {
    expect(getCity("cape-town").name).toBe("Cape Town");
  });
});
