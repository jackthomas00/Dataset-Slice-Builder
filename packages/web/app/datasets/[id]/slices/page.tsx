"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchApi, type Dataset, type SavedSlice } from "@/lib/api";

export default function SlicesPage() {
  const params = useParams();
  const datasetId = params.id as string;

  const { data: dataset } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => fetchApi<Dataset>(`/api/datasets/${datasetId}`),
  });

  const { data: slices } = useQuery({
    queryKey: ["slices", datasetId],
    queryFn: () =>
      fetchApi<SavedSlice[]>(`/api/slices?dataset_id=${datasetId}`),
    enabled: !!datasetId,
  });

  const handleExport = async (sliceId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${apiUrl}/api/slices/${sliceId}/export`);
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slice_${sliceId}_manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href={`/datasets/${datasetId}`}
          style={{ color: "var(--muted)", textDecoration: "none", fontSize: 14 }}
        >
          ← Back to {dataset?.name ?? "Dataset"}
        </Link>
      </div>

      <h1>Saved Slices</h1>
      <p style={{ marginTop: "0.5rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
        {dataset?.name}
      </p>

      {!slices?.length ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 8,
            padding: "3rem",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          No saved slices yet. Create filters on the dataset page and click "Save Slice".
        </div>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {slices.map((slice) => (
            <li
              key={slice.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem",
                background: "var(--border)",
                borderRadius: 8,
              }}
            >
              <div>
                <strong>{slice.name}</strong>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {new Date(slice.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleExport(slice.id)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "var(--accent)",
                  border: "none",
                  borderRadius: 6,
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Export
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
