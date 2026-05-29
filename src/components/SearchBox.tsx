"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodeResponse, GeocodeResult } from "@/lib/geocode";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

interface SearchBoxProps {
  /** Active city id, used to bias geocoding results. */
  city: string;
  onSelect: (result: GeocodeResult) => void;
}

export default function SearchBox({ city, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Set when the user picks a result, so we don't immediately re-search the label.
  const skipNextRef = useRef(false);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }

    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (q.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as GeocodeResponse;
        setResults(data.results ?? []);
        setOpen(true);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, city]);

  function handleSelect(result: GeocodeResult) {
    skipNextRef.current = true;
    setQuery(result.label);
    setResults([]);
    setOpen(false);
    onSelect(result);
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search a destination address…"
        aria-label="Destination address"
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-zinc-400">…</span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lng},${i}`}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-blue-50 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
