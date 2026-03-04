"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchApi, type Dataset } from "@/lib/api";
import { ImportModal } from "@/components/ImportModal";

export default function HomePage() {
  const { data: datasets, isLoading } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => fetchApi<Dataset[]>("/api/datasets"),
  });

  return (
    <main style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Dataset Slice Builder</h1>
        <ImportModal />
      </div>
      <p style={{ marginBottom: "1.5rem", color: "var(--muted)" }}>
        Filter and slice Roboflow datasets by metadata (time-of-day, GPS, tags)
      </p>

      {isLoading ? (
        <p>Loading datasets...</p>
      ) : !datasets?.length ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 8,
            padding: "3rem",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          <p>No datasets yet. Import one from Roboflow to get started.</p>
          <ImportModal triggerLabel="Import from Roboflow" />
        </div>
      ) : (
        <ul style={{ listStyle: "none", display: "grid", gap: "0.75rem" }}>
          {datasets.map((d) => (
            <li key={d.id}>
              <Link
                href={`/datasets/${d.id}`}
                style={{
                  display: "block",
                  padding: "1rem 1.25rem",
                  background: "var(--border)",
                  borderRadius: 8,
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <strong>{d.name}</strong>
                <span style={{ marginLeft: "0.5rem", color: "var(--muted)" }}>
                  {d.imageCount} images
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
