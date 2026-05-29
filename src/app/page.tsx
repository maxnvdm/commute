"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView from "@/components/MapView";
import SearchBox from "@/components/SearchBox";
import Legend from "@/components/Legend";
import { getCity } from "@/config/cities";
import type { GeocodeResult } from "@/lib/geocode";
import { DEFAULT_RANGES } from "@/lib/isochrone";
import type { IsochroneResult } from "@/lib/routing/types";
import { decodeState, encodeState, type AppState } from "@/lib/url-state";

function HomeContent() {
  const searchParams = useSearchParams();
  // Initialize from the URL so shared links reproduce the view (no effect needed).
  const [state, setState] = useState<AppState>(() =>
    decodeState(new URLSearchParams(searchParams.toString())),
  );
  const [isochrones, setIsochrones] = useState<IsochroneResult | null>(null);
  const [isoLoading, setIsoLoading] = useState(false);
  const [isoError, setIsoError] = useState<string | null>(null);

  // Keep the URL in sync with state (shareable, no history spam).
  useEffect(() => {
    const params = encodeState(state);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [state]);

  // Fetch isochrone bands whenever the destination or mode changes.
  useEffect(() => {
    const dest = state.dest;
    if (!dest) return;

    const controller = new AbortController();
    let active = true;

    (async () => {
      // Yield once so these setState calls aren't synchronous within the effect.
      await Promise.resolve();
      if (!active) return;
      setIsoLoading(true);
      setIsoError(null);
      try {
        const params = new URLSearchParams({
          lng: String(dest.lng),
          lat: String(dest.lat),
          mode: state.mode,
        });
        const res = await fetch(`/api/isochrone?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setIsoError(data?.error ?? "Couldn't load commute times.");
          setIsochrones(null);
        } else {
          setIsochrones(data as IsochroneResult);
        }
      } catch (err) {
        if (active && !(err instanceof DOMException && err.name === "AbortError")) {
          setIsoError("Couldn't load commute times.");
        }
      } finally {
        if (active) setIsoLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [state.dest, state.mode]);

  const city = getCity(state.city);

  const handleSelect = useCallback((result: GeocodeResult) => {
    setState((prev) => ({
      ...prev,
      dest: { lng: result.lng, lat: result.lat, label: result.label },
    }));
  }, []);

  return (
    <main className="relative w-full flex-1">
      <MapView
        city={city}
        marker={state.dest ?? null}
        isochrones={isochrones}
      />

      <div className="pointer-events-none absolute left-4 top-4 z-10 w-80 max-w-[calc(100%-2rem)]">
        <div className="pointer-events-auto rounded-lg bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/95">
          <h1 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Commute Heatmap · {city.name}
          </h1>
          <SearchBox city={state.city} onSelect={handleSelect} />
          {state.dest?.label && (
            <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
              📍 {state.dest.label}
            </p>
          )}
          {isoLoading && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Loading commute times…
            </p>
          )}
          {isoError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {isoError}
            </p>
          )}
        </div>
      </div>

      {isochrones && isochrones.features.length > 0 && (
        <div className="pointer-events-none absolute bottom-6 right-4 z-10">
          <div className="pointer-events-auto">
            <Legend ranges={DEFAULT_RANGES} />
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
