import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const BASE = "http://localhost/api/isochrone";

function reqFor(query: string): NextRequest {
  return new NextRequest(`${BASE}?${query}`);
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ORS_API_KEY;
});

describe("GET /api/isochrone", () => {
  it("returns 400 for missing coordinates", async () => {
    const res = await GET(reqFor("mode=driving"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for out-of-range coordinates", async () => {
    const res = await GET(reqFor("lng=200&lat=-33.9&mode=driving"));
    expect(res.status).toBe(400);
  });

  it("returns 503 when ORS_API_KEY is not configured", async () => {
    delete process.env.ORS_API_KEY;
    const res = await GET(reqFor("lng=18.42&lat=-33.92&mode=driving&ranges=10,20"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/ORS_API_KEY/);
  });

  describe("with a configured key", () => {
    beforeEach(() => {
      process.env.ORS_API_KEY = "test-key";
    });

    it("serves a MISS then a HIT from the in-memory cache (one upstream call)", async () => {
      const fetchMock = vi.fn(async () =>
        new Response(
          JSON.stringify({
            type: "FeatureCollection",
            features: [
              { type: "Feature", properties: { value: 600 }, geometry: null },
            ],
          }),
          { status: 200 },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      // Use coords distinct from other tests so the shared module cache is clean.
      const q = "lng=19.111&lat=-34.111&mode=driving&ranges=10,20";
      const first = await GET(reqFor(q));
      expect(first.status).toBe(200);
      expect(first.headers.get("x-cache")).toBe("MISS");
      expect(first.headers.get("Cache-Control")).toContain("s-maxage");

      const second = await GET(reqFor(q));
      expect(second.headers.get("x-cache")).toBe("HIT");
      // Only the first request hit ORS; the second was served from cache.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("returns 502 when the upstream provider fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("err", { status: 500 })),
      );
      const res = await GET(reqFor("lng=20.222&lat=-30.222&mode=driving&ranges=10"));
      expect(res.status).toBe(502);
    });
  });
});
