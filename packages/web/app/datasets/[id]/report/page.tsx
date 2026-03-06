"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchApi, type Dataset, type DatasetHealthReport, type ReportBucket } from "@/lib/api";
import { SaveSliceModal } from "@/components/SaveSliceModal";
import { filtersToSearchParams } from "@/lib/filters";

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div
      style={{
        background: "var(--border)",
        borderRadius: 10,
        padding: "1rem",
        minWidth: 180,
      }}
    >
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{label}</p>
      <strong style={{ fontSize: 24 }}>{value}</strong>
      {detail ? <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{detail}</p> : null}
    </div>
  );
}

function DistributionSection({
  title,
  items,
}: {
  title: string;
  items: ReportBucket[];
}) {
  return (
    <section style={{ background: "var(--border)", borderRadius: 10, padding: "1rem" }}>
      <h2 style={{ fontSize: 16, marginBottom: "1rem" }}>{title}</h2>
      {!items.length ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>No data available.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {items.slice(0, 8).map((item) => (
            <div key={item.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>{item.label}</span>
                <span style={{ color: "var(--muted)" }}>{item.count} ({item.percentage}%)</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 999 }}>
                <div
                  style={{
                    width: `${Math.min(100, item.percentage)}%`,
                    height: "100%",
                    background: "var(--accent)",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExportReportButton({ datasetId, format }: { datasetId: string; format: "json" | "md" }) {
  const handleExport = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const query = format === "md" ? "md" : "json";
    const res = await fetch(`${apiUrl}/api/datasets/${datasetId}/report/export?format=${query}`);
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "md" ? `dataset_health_report_${datasetId}.md` : `dataset_health_report_${datasetId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      style={{
        padding: "0.5rem 1rem",
        border: "1px solid var(--border)",
        borderRadius: 6,
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      Export {format === "md" ? "Markdown" : "JSON"}
    </button>
  );
}

export default function DatasetReportPage() {
  const params = useParams();
  const datasetId = params.id as string;

  const { data: dataset } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => fetchApi<Dataset>(`/api/datasets/${datasetId}`),
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["dataset-report", datasetId],
    queryFn: () => fetchApi<DatasetHealthReport>(`/api/datasets/${datasetId}/report`),
    enabled: !!datasetId,
  });

  return (
    <main style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto", display: "grid", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <Link href={`/datasets/${datasetId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 14 }}>
          Back to {dataset?.name ?? "Dataset"}
        </Link>
        <h1 style={{ flex: 1 }}>Health Report</h1>
        <ExportReportButton datasetId={datasetId} format="json" />
        <ExportReportButton datasetId={datasetId} format="md" />
      </div>

      {isLoading || !report ? (
        <p>Loading report...</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <StatCard label="Images" value={String(report.summary.imageCount)} />
            <StatCard
              label="Annotation Coverage"
              value={`${report.summary.annotationCoverageRate}%`}
              detail={`${report.summary.annotatedImageCount} annotated images`}
            />
            <StatCard label="Missing GPS" value={String(report.completeness.missingGps)} />
            <StatCard label="Missing Tags" value={String(report.completeness.missingTags)} />
          </div>

          <section style={{ background: "var(--border)", borderRadius: 10, padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: 16, marginBottom: 6 }}>Recommended Slices</h2>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>
                  Jump straight into risky slices and save them for later review.
                </p>
              </div>
            </div>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {report.recommendedSlices.map((slice) => {
                const query = filtersToSearchParams(slice.filters).toString();
                return (
                  <div
                    key={slice.id}
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "0.9rem",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                        <strong>{slice.title}</strong>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{slice.matchCount} images</span>
                      </div>
                      <p style={{ fontSize: 14, color: "var(--muted)" }}>{slice.reason}</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <Link
                        href={`/datasets/${datasetId}?${query}`}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          color: "inherit",
                          textDecoration: "none",
                          fontSize: 14,
                        }}
                      >
                        Open Slice
                      </Link>
                      <SaveSliceModal
                        datasetId={datasetId}
                        filters={slice.filters}
                        triggerLabel="Save Slice"
                        initialName={slice.title}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <DistributionSection title="Split Balance" items={report.distributions.splits} />
            <DistributionSection title="Time of Day" items={report.distributions.timeOfDay} />
            <DistributionSection title="Class Distribution" items={report.distributions.classes} />
            <DistributionSection title="Tag Distribution" items={report.distributions.tags} />
          </div>

          <section style={{ background: "var(--border)", borderRadius: 10, padding: "1rem" }}>
            <h2 style={{ fontSize: 16, marginBottom: "1rem" }}>Metadata Completeness</h2>
            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <StatCard label="Missing Timestamps" value={String(report.completeness.missingCapturedAt)} />
              <StatCard label="Missing GPS" value={String(report.completeness.missingGps)} />
              <StatCard label="Missing Tags" value={String(report.completeness.missingTags)} />
              <StatCard label="Missing Annotations" value={String(report.completeness.missingAnnotations)} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
