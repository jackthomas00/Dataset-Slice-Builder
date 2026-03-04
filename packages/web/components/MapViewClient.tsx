"use client";

import { useRef, useEffect } from "react";
import type { Image } from "@/lib/api";

interface MapViewClientProps {
  images: Image[];
  onLatLngChange?: (lat: number, lng: number, radiusKm: number) => void;
}

export function MapViewClient({ images, onLatLngChange }: MapViewClientProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || !mapRef.current) return;
      const DefaultIcon = L.default.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.default.Marker.prototype.options.icon = DefaultIcon;

      const map = L.default.map(mapRef.current!).setView([40, -74], 3);
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const markers: L.Marker[] = [];
      const imagesWithGps = images.filter((img) => img.gpsLat != null && img.gpsLng != null);

      imagesWithGps.forEach((img) => {
        const marker = L.default
          .marker([img.gpsLat!, img.gpsLng!])
          .addTo(map)
          .bindPopup(`<a href="${img.url}" target="_blank">View image</a>`);
        markers.push(marker);
      });

      if (imagesWithGps.length > 0) {
        const bounds = L.default.latLngBounds(
          imagesWithGps.map((img) => [img.gpsLat!, img.gpsLng!] as L.LatLngTuple)
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      }

      map.on("click", (e: L.LeafletMouseEvent) => {
        if (circleRef.current) map.removeLayer(circleRef.current);
        const circle = L.default.circle(e.latlng, {
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.1,
          radius: 5000,
        }).addTo(map);
        circleRef.current = circle;
        onLatLngChange?.(e.latlng.lat, e.latlng.lng, 5);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [images, onLatLngChange]);

  return (
    <div
      ref={mapRef}
      style={{
        height: 300,
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--border)",
      }}
    />
  );
}
