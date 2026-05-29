"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MapView from "@/components/MapView";
import SearchBox from "@/components/SearchBox";
import { getCity } from "@/config/cities";
import type { GeocodeResult } from "@/lib/geocode";
import { decodeState, encodeState, type AppState } from "@/lib/url-state";

function HomeContent() {
  const searchParams = useSearchParams();
  // Initialize from the URL so shared links reproduce the view (no effect needed).
  const [state, setState] = useState<AppState>(() =>
    decodeState(new URLSearchParams(searchParams.toString())),
  );

  // Keep the URL in sync with state (shareable, no history spam).
  useEffect(() => {
    const params = encodeState(state);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [state]);

  const city = getCity(state.city);

  const handleSelect = useCallback((result: GeocodeResult) => {
    setState((prev) => ({
      ...prev,
      dest: { lng: result.lng, lat: result.lat, label: result.label },
    }));
  }, []);

  return (
    <main className="relative w-full flex-1">
      <MapView city={city} marker={state.dest ?? null} />

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
        </div>
      </div>
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
