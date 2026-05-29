"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { City } from "@/config/cities";
import type { IsochroneResult } from "@/lib/routing/types";

// Free vector tiles, no API key required. Fallback options: MapTiler free tier.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const ISO_SOURCE = "isochrones";
const ISO_FILL = "iso-fill";
const ISO_OUTLINE = "iso-outline";
const EMPTY_FC: IsochroneResult = { type: "FeatureCollection", features: [] };

interface MapViewProps {
  city: City;
  /** Selected destination to mark and fly to; null clears the marker. */
  marker?: { lng: number; lat: number } | null;
  /** Colorized isochrone bands to render; null clears them. */
  isochrones?: IsochroneResult | null;
}

export default function MapView({ city, marker, isochrones }: MapViewProps) {
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

  // Render / update / clear the isochrone bands once the style is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const data = isochrones ?? EMPTY_FC;
      const source = map.getSource(ISO_SOURCE) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (source) {
        source.setData(data);
        return;
      }
      map.addSource(ISO_SOURCE, { type: "geojson", data });
      map.addLayer({
        id: ISO_FILL,
        type: "fill",
        source: ISO_SOURCE,
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.4 },
      });
      map.addLayer({
        id: ISO_OUTLINE,
        type: "line",
        source: ISO_SOURCE,
        paint: { "line-color": ["get", "color"], "line-width": 1 },
      });
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [isochrones]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
