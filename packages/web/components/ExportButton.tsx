"use client";

import type { Image } from "@/lib/api";
import type { DatasetFilters } from "@/lib/filters";

interface ExportButtonProps {
  datasetId: string;
  filters: DatasetFilters;
  images: Image[];
}

export function ExportButton({ datasetId, filters, images }: ExportButtonProps) {
  const handleExport = () => {
    const manifest = {
      datasetId,
      filters,
      exportedAt: new Date().toISOString(),
      imageCount: images.length,
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        width: img.width,
        height: img.height,
        capturedAt: img.capturedAt,
        gpsLat: img.gpsLat,
        gpsLng: img.gpsLng,
        split: img.split,
        tags: img.tags,
        hasAnnotations: img.hasAnnotations,
        classes: img.classes,
      })),
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slice_manifest_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={images.length === 0}
      style={{
        padding: "0.5rem 1rem",
        border: "1px solid var(--border)",
        borderRadius: 6,
        background: "transparent",
        color: "inherit",
        cursor: images.length === 0 ? "not-allowed" : "pointer",
        fontSize: 14,
        opacity: images.length === 0 ? 0.5 : 1,
      }}
    >
      Export Manifest
    </button>
  );
}
