import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OpenRouteServiceProvider,
  createOpenRouteServiceProvider,
} from "./openrouteservice";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ORS_API_KEY;
});

describe("OpenRouteServiceProvider.getIsochrones", () => {
  it("posts ranges in seconds, the mapped profile, and the API key", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({ type: "FeatureCollection", features: [] }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenRouteServiceProvider("test-key");
    await provider.getIsochrones({
      point: { lng: 18.42, lat: -33.92 },
      mode: "cycling",
      ranges: [10, 30],
    });

    const [url, init] = fetchMock.mock.calls[0];
    // Profile maps cycling -> cycling-regular and is part of the URL path.
    expect(String(url)).toContain("cycling-regular");
    expect(init?.headers).toMatchObject({ Authorization: "test-key" });
    const body = JSON.parse(init!.body as string);
    expect(body.range_type).toBe("time");
    // minutes -> seconds conversion.
    expect(body.range).toEqual([600, 1800]);
    expect(body.locations).toEqual([[18.42, -33.92]]);
  });

  it("throws on a non-ok upstream response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 403 })),
    );
    const provider = new OpenRouteServiceProvider("test-key");
    await expect(
      provider.getIsochrones({
        point: { lng: 0, lat: 0 },
        mode: "driving",
        ranges: [10],
      }),
    ).rejects.toThrow(/403/);
  });
});

describe("createOpenRouteServiceProvider", () => {
  it("throws a helpful error when ORS_API_KEY is missing", () => {
    delete process.env.ORS_API_KEY;
    expect(() => createOpenRouteServiceProvider()).toThrow(/ORS_API_KEY/);
  });

  it("builds a provider when the key is present", () => {
    process.env.ORS_API_KEY = "abc";
    expect(createOpenRouteServiceProvider().name).toBe("openrouteservice");
  });
});
