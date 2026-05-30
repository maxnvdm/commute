"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  // Index of the keyboard-highlighted option, or -1 when none is active.
  const [activeIndex, setActiveIndex] = useState(-1);
  // Set when the user picks a result, so we don't immediately re-search the label.
  const skipNextRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

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
        setActiveIndex(-1);
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
        setActiveIndex(-1);
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

  // Close the dropdown when clicking/focusing outside the component.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function handleSelect(result: GeocodeResult) {
    skipNextRef.current = true;
    setQuery(result.label);
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(result);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || results.length === 0) {
      // Allow ArrowDown to reopen an existing result list.
      if (e.key === "ArrowDown" && results.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
        break;
      case "Enter":
        if (activeIndex >= 0 && activeIndex < results.length) {
          e.preventDefault();
          handleSelect(results[activeIndex]);
        }
        break;
    }
  }

  const showList = open && results.length > 0;
  const activeId =
    activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div ref={rootRef} className="relative w-full">
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search a destination address…"
        aria-label="Destination address"
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-zinc-400">…</span>
      )}
      <ul
        id={listboxId}
        role="listbox"
        aria-label="Address results"
        hidden={!showList}
        className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
      >
        {results.map((r, i) => (
          <li
            key={`${r.lat},${r.lng},${i}`}
            id={`${listboxId}-opt-${i}`}
            role="option"
            aria-selected={i === activeIndex}
          >
            <button
              type="button"
              tabIndex={-1}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`block w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-200 ${
                i === activeIndex
                  ? "bg-blue-50 dark:bg-zinc-700"
                  : "hover:bg-blue-50 dark:hover:bg-zinc-700"
              }`}
            >
              {r.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
