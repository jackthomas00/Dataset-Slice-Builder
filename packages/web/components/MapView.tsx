"use client";

import { useEffect, useState } from "react";
import type { Image } from "@/lib/api";

interface MapViewProps {
  images: Image[];
  onLatLngChange?: (lat: number, lng: number, radiusKm: number) => void;
}

export function MapView({ images, onLatLngChange }: MapViewProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<MapViewProps> | null>(null);

  useEffect(() => {
    import("./MapViewClient").then((mod) => setMapComponent(() => mod.MapViewClient));
  }, []);

  if (!MapComponent) return null;
  return <MapComponent images={images} onLatLngChange={onLatLngChange} />;
}
