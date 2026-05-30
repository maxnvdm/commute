"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView from "@/components/MapView";
import SearchBox from "@/components/SearchBox";
import Legend from "@/components/Legend";
import Controls from "@/components/Controls";
import { getCity } from "@/config/cities";
import type { GeocodeResult } from "@/lib/geocode";
import { rangesForMaxTime } from "@/lib/isochrone";
import type { IsochroneResult, TravelMode } from "@/lib/routing/types";
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
  // Bumped by the Retry button to re-run the fetch effect after a failure.
  const [reloadKey, setReloadKey] = useState(0);

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
          ranges: rangesForMaxTime(state.maxTime).join(","),
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
  }, [state.dest, state.mode, state.maxTime, reloadKey]);

  const city = getCity(state.city);
  const ranges = rangesForMaxTime(state.maxTime);

  const handleSelect = useCallback((result: GeocodeResult) => {
    setState((prev) => ({
      ...prev,
      dest: { lng: result.lng, lat: result.lat, label: result.label },
    }));
  }, []);

  const handleModeChange = useCallback((mode: TravelMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const handleMaxTimeChange = useCallback((maxTime: number) => {
    setState((prev) => ({ ...prev, maxTime }));
  }, []);

  const handleRetry = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <main className="relative w-full flex-1 h-[100dvh]">
      <MapView
        city={city}
        marker={state.dest ?? null}
        isochrones={isochrones}
      />

      <div className="pointer-events-none absolute left-4 top-4 z-10 w-[calc(100%-2rem)] sm:w-80">
        <div className="pointer-events-auto rounded-lg bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/95">
          <h1 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Commute Heatmap · {city.name}
          </h1>
          <SearchBox city={state.city} onSelect={handleSelect} />
          {state.dest && (
            <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
              📍{" "}
              {state.dest.label ||
                `${state.dest.lat.toFixed(4)}, ${state.dest.lng.toFixed(4)}`}
            </p>
          )}
          <Controls
            mode={state.mode}
            maxTime={state.maxTime}
            onModeChange={handleModeChange}
            onMaxTimeChange={handleMaxTimeChange}
          />
          {isoLoading && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Loading commute times…
            </p>
          )}
          {isoError && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-red-600 dark:text-red-400">{isoError}</p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isoLoading}
                className="rounded border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {isochrones && isochrones.features.length > 0 && (
        <div className="pointer-events-none absolute bottom-6 right-4 z-10">
          <div className="pointer-events-auto">
            <Legend ranges={ranges} />
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
