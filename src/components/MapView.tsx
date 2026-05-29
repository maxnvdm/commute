"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { City } from "@/config/cities";

// Free vector tiles, no API key required. Fallback options: MapTiler free tier.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

interface MapViewProps {
  city: City;
  /** Selected destination to mark and fly to; null clears the marker. */
  marker?: { lng: number; lat: number } | null;
}

export default function MapView({ city, marker }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Initialize the map once on mount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: city.center,
      zoom: city.zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount-only: city changes are handled in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the city changes (e.g. via a future city picker).
  useEffect(() => {
    mapRef.current?.flyTo({ center: city.center, zoom: city.zoom });
  }, [city.center, city.zoom]);

  // Place / move / clear the destination marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!marker) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: "#2563eb" });
    }
    markerRef.current.setLngLat([marker.lng, marker.lat]).addTo(map);
    map.flyTo({ center: [marker.lng, marker.lat], zoom: Math.max(map.getZoom(), 12) });
  }, [marker]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
