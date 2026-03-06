"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchApi, type Dataset, type ImagesResponse } from "@/lib/api";
import { FilterPanel } from "@/components/FilterPanel";
import { ImageGrid } from "@/components/ImageGrid";
import { MapView } from "@/components/MapView";
import { SaveSliceModal } from "@/components/SaveSliceModal";
import { ExportButton } from "@/components/ExportButton";
import { InferenceOverlay } from "@/components/InferenceOverlay";
import { filtersToApiQuery, filtersToSearchParams, searchParamsToFilters } from "@/lib/filters";

export default function DatasetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const datasetId = params.id as string;
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const { data: dataset } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => fetchApi<Dataset>(`/api/datasets/${datasetId}`),
  });

  const filters = searchParamsToFilters(searchParams);
  const queryString = filtersToApiQuery(datasetId, filters);

  const { data: imagesData, isLoading } = useQuery({
    queryKey: ["images", datasetId, queryString],
    queryFn: () => fetchApi<ImagesResponse>(`/api/images?${queryString}`),
    enabled: !!datasetId,
  });

  useEffect(() => {
    if (!imagesData?.images?.length) {
      setSelectedImageId(null);
      return;
    }

    const imageStillVisible = selectedImageId
      ? imagesData.images.some((img) => img.id === selectedImageId)
      : false;

    if (!imageStillVisible) setSelectedImageId(imagesData.images[0].id);
  }, [imagesData, selectedImageId]);

  const selectedImage = useMemo(
    () => imagesData?.images.find((img) => img.id === selectedImageId) ?? null,
    [imagesData, selectedImageId]
  );

  return (
    <main style={{ padding: "1rem", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <Link
          href="/"
          style={{ color: "var(--muted)", textDecoration: "none", fontSize: 14 }}
        >
          Back
        </Link>
        <h1 style={{ flex: 1 }}>{dataset?.name ?? "Dataset"}</h1>
        <Link
          href={`/datasets/${datasetId}/report`}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "inherit",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Health Report
        </Link>
        <Link
          href={`/datasets/${datasetId}/slices`}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "inherit",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Saved Slices
        </Link>
        <SaveSliceModal datasetId={datasetId} filters={filters} />
        <ExportButton datasetId={datasetId} filters={filters} images={imagesData?.images ?? []} />
      </div>

      <div style={{ display: "flex", gap: "1.5rem", minHeight: 600 }}>
        <aside style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <FilterPanel datasetId={datasetId} />
          {imagesData && imagesData.images.some((img) => img.gpsLat != null && img.gpsLng != null) && (
            <div>
              <h3 style={{ marginBottom: "0.5rem", fontSize: 14, fontWeight: 600 }}>Map</h3>
              <MapView
                images={imagesData.images}
                onLatLngChange={(lat, lng, radiusKm) => {
                  const nextFilters = {
                    ...filters,
                    lat,
                    lng,
                    radius_km: radiusKm,
                    page: undefined,
                  };
                  const next = filtersToSearchParams(nextFilters);
                  router.push(`?${next.toString()}`);
                }}
              />
            </div>
          )}
        </aside>
        <div style={{ flex: 1, minWidth: 0 }}>
          {imagesData && (
            <div
              style={{
                marginBottom: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <span style={{ color: "var(--muted)", fontSize: 14 }}>
                {imagesData.total} images
                {imagesData.totalPages > 1 && ` · Page ${imagesData.page} of ${imagesData.totalPages}`}
              </span>
              {imagesData.totalPages > 1 && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      const next = filtersToSearchParams({
                        ...filters,
                        page: Math.max(1, imagesData.page - 1),
                      });
                      router.push(`?${next.toString()}`);
                    }}
                    disabled={imagesData.page <= 1}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: 12,
                      background: "var(--border)",
                      border: "none",
                      borderRadius: 4,
                      color: "inherit",
                      cursor: imagesData.page <= 1 ? "not-allowed" : "pointer",
                      opacity: imagesData.page <= 1 ? 0.5 : 1,
                    }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => {
                      const next = filtersToSearchParams({
                        ...filters,
                        page: Math.min(imagesData.totalPages, imagesData.page + 1),
                      });
                      router.push(`?${next.toString()}`);
                    }}
                    disabled={imagesData.page >= imagesData.totalPages}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: 12,
                      background: "var(--border)",
                      border: "none",
                      borderRadius: 4,
                      color: "inherit",
                      cursor: imagesData.page >= imagesData.totalPages ? "not-allowed" : "pointer",
                      opacity: imagesData.page >= imagesData.totalPages ? 0.5 : 1,
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
          {isLoading ? (
            <p>Loading images...</p>
          ) : (
            <>
              <InferenceOverlay image={selectedImage} />
              <ImageGrid
                images={imagesData?.images ?? []}
                total={imagesData?.total ?? 0}
                selectedImageId={selectedImageId}
                onSelectImage={(image) => setSelectedImageId(image.id)}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
