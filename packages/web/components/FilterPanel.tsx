"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { fetchApi } from "@/lib/api";

interface FilterPanelProps {
  datasetId: string;
}

export function FilterPanel({ datasetId }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: tags } = useQuery({
    queryKey: ["tags", datasetId],
    queryFn: () => fetchApi<string[]>(`/api/datasets/${datasetId}/tags`),
    enabled: !!datasetId,
  });

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`?${next.toString()}`);
    },
    [router, searchParams]
  );

  const timeOfDay = searchParams.get("time_of_day") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const split = searchParams.get("split") ?? "";
  const hasAnnotations = searchParams.get("has_annotations") ?? "";
  const tagsFilter = searchParams.get("tags") ?? "";
  const lat = searchParams.get("lat") ?? "";
  const lng = searchParams.get("lng") ?? "";
  const radiusKm = searchParams.get("radius_km") ?? "10";

  return (
    <div
      style={{
        background: "var(--border)",
        borderRadius: 8,
        padding: "1rem",
        position: "sticky",
        top: "1rem",
      }}
    >
      <h3 style={{ marginBottom: "1rem", fontSize: 14, fontWeight: 600 }}>Filters</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
            Time of day
          </span>
          <select
            value={timeOfDay}
            onChange={(e) => setFilter("time_of_day", e.target.value || null)}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "inherit",
            }}
          >
            <option value="">Any</option>
            <option value="morning">Morning (5–12)</option>
            <option value="afternoon">Afternoon (12–17)</option>
            <option value="evening">Evening (17–21)</option>
            <option value="night">Night (21–5)</option>
          </select>
        </label>

        <label>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
            Date from
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setFilter("date_from", e.target.value || null)}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "inherit",
            }}
          />
        </label>

        <label>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
            Date to
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setFilter("date_to", e.target.value || null)}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "inherit",
            }}
          />
        </label>

        <label>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
            Split
          </span>
          <select
            value={split}
            onChange={(e) => setFilter("split", e.target.value || null)}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "inherit",
            }}
          >
            <option value="">Any</option>
            <option value="train">Train</option>
            <option value="valid">Valid</option>
            <option value="test">Test</option>
          </select>
        </label>

        <label>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
            Has annotations
          </span>
          <select
            value={hasAnnotations}
            onChange={(e) => setFilter("has_annotations", e.target.value || null)}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "inherit",
            }}
          >
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        <label>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
            GPS Lat
          </span>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setFilter("lat", e.target.value || null)}
            placeholder="e.g. 40.7"
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "inherit",
            }}
          />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
            GPS Lng
          </span>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setFilter("lng", e.target.value || null)}
            placeholder="e.g. -74.0"
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "inherit",
            }}
          />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
            Radius (km)
          </span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={radiusKm}
            onChange={(e) => setFilter("radius_km", e.target.value || null)}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "inherit",
            }}
          />
        </label>
        {tags && tags.length > 0 && (
          <label>
            <span style={{ display: "block", marginBottom: 4, fontSize: 12, color: "var(--muted)" }}>
              Tags (comma-separated)
            </span>
            <input
              type="text"
              value={tagsFilter}
              onChange={(e) => setFilter("tags", e.target.value || null)}
              placeholder="e.g. warehouse, outdoor"
              style={{
                width: "100%",
                padding: "0.5rem",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "inherit",
              }}
            />
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              Available: {tags.join(", ")}
            </p>
          </label>
        )}

        <button
          onClick={() => {
            const next = new URLSearchParams();
            next.set("dataset_id", datasetId);
            router.push(`/datasets/${datasetId}`);
          }}
          style={{
            padding: "0.5rem",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
