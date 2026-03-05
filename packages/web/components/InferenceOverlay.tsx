"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchApi, type Image, type InferenceResponse } from "@/lib/api";

interface InferenceOverlayProps {
  image: Image | null;
}

export function InferenceOverlay({ image }: InferenceOverlayProps) {
  const [confidence, setConfidence] = useState(0.35);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setImageDims(null);
  }, [image?.id]);

  const mutation = useMutation({
    mutationFn: async () =>
      fetchApi<InferenceResponse>("/api/inference/predict", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: image?.url,
          confidence,
        }),
      }),
  });

  const predictions = mutation.data?.predictions ?? [];

  const boxes = useMemo(() => predictions.map((pred, idx) => ({
    key: `${pred.className}-${idx}`,
    x: pred.x - pred.width / 2,
    y: pred.y - pred.height / 2,
    width: pred.width,
    height: pred.height,
    label: `${pred.className} ${Math.round(pred.confidence * 100)}%`,
  })), [predictions]);

  const overlayDims = imageDims ?? (image?.width && image?.height ? { width: image.width, height: image.height } : null);

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "0.75rem",
        marginBottom: "0.75rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "0.75rem",
        }}
      >
        <strong style={{ fontSize: 14 }}>Inference Overlay</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 12, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)" }}>{image ? "Image selected" : "No image selected"}</span>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            style={{
              padding: "0.35rem 0.7rem",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            {isExpanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {!isExpanded ? null : (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 12, marginBottom: "0.75rem" }}>
          <label htmlFor="confidence">Confidence</label>
          <input
            id="confidence"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            style={{
              width: 70,
              padding: "0.2rem 0.3rem",
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "inherit",
            }}
          />
          <button
            onClick={() => mutation.mutate()}
            disabled={!image || mutation.isPending}
            style={{
              padding: "0.35rem 0.7rem",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--border)",
              color: "inherit",
              cursor: !image || mutation.isPending ? "not-allowed" : "pointer",
              opacity: !image || mutation.isPending ? 0.6 : 1,
            }}
          >
            {mutation.isPending ? "Running..." : "Run"}
          </button>
        </div>
      )}

      {!image ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Select an image from the slice to run inference.</p>
      ) : isExpanded ? (
        <>
          <div
            style={{
              position: "relative",
              display: "inline-block",
              maxWidth: "100%",
              maxHeight: "55vh",
              overflow: "auto",
              borderRadius: 8,
            }}
          >
            <img
              src={image.url}
              alt=""
              onLoad={(e) =>
                setImageDims({
                  width: e.currentTarget.naturalWidth,
                  height: e.currentTarget.naturalHeight,
                })
              }
              style={{ display: "block", maxWidth: "100%", height: "auto" }}
            />
            {overlayDims && (
              <svg
                viewBox={`0 0 ${overlayDims.width} ${overlayDims.height}`}
                preserveAspectRatio="none"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              >
                {boxes.map((box) => (
                  <g key={box.key}>
                    <rect
                      x={box.x}
                      y={box.y}
                      width={box.width}
                      height={box.height}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth={2}
                      rx={4}
                    />
                    <rect x={box.x} y={Math.max(0, box.y - 20)} width={Math.max(90, box.label.length * 6)} height={18} fill="#22c55e" />
                    <text
                      x={box.x + 4}
                      y={Math.max(12, box.y - 7)}
                      fill="#052e16"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {box.label}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <span>{predictions.length} predictions</span>
            {mutation.data?.endpoint && <span>Endpoint: {mutation.data.endpoint}</span>}
            {mutation.error && <span style={{ color: "#ef4444" }}>{mutation.error.message}</span>}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          Overlay collapsed. Click <strong>Show</strong> to run inference on the selected image.
        </p>
      )}
    </section>
  );
}
