import { describe, expect, it } from "vitest";
import { mapNominatimResults } from "./nominatim";

describe("mapNominatimResults", () => {
  it("maps valid items to GeocodeResult", () => {
    const out = mapNominatimResults([
      { display_name: "Cape Town, South Africa", lon: "18.4241", lat: "-33.9249" },
    ]);
    expect(out).toEqual([
      { label: "Cape Town, South Africa", lng: 18.4241, lat: -33.9249 },
    ]);
  });

  it("drops items with missing label or coordinates", () => {
    const out = mapNominatimResults([
      { lon: "1", lat: "2" }, // no display_name
      { display_name: "No coords" }, // no lon/lat
      { display_name: "Bad coords", lon: "abc", lat: "def" },
      { display_name: "Good", lon: "1.5", lat: "2.5" },
    ]);
    expect(out).toEqual([{ label: "Good", lng: 1.5, lat: 2.5 }]);
  });

  it("returns an empty array for non-array input", () => {
    // @ts-expect-error testing defensive runtime behavior
    expect(mapNominatimResults(null)).toEqual([]);
  });
});
