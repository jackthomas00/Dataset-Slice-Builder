"use client";

import type { Image } from "@/lib/api";

interface ImageGridProps {
  images: Image[];
  total: number;
  selectedImageId?: string | null;
  onSelectImage?: (image: Image) => void;
}

export function ImageGrid({ images, total, selectedImageId, onSelectImage }: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          color: "var(--muted)",
          border: "1px dashed var(--border)",
          borderRadius: 8,
        }}
      >
        No images match the current filters.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "0.5rem", color: "var(--muted)", fontSize: 12 }}>Showing {images.length} of {total}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
          width: "100%",
        }}
      >
        {images.map((img) => (
            <div
              key={img.id}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 8,
                overflow: "hidden",
                background: selectedImageId === img.id ? "rgba(34, 197, 94, 0.16)" : "var(--border)",
                border: selectedImageId === img.id ? "1px solid #22c55e" : "1px solid transparent",
                color: "inherit",
              }}
            >
              <button
                onClick={() => onSelectImage?.(img)}
                style={{
                  border: "none",
                  padding: 0,
                  margin: 0,
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    aspectRatio: "1",
                    background: "var(--border)",
                    position: "relative",
                  }}
                >
                  <img
                    src={img.url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              </button>
              <div
                style={{
                  padding: "0.5rem",
                  minHeight: 48,
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                {img.split && <span>{img.split}</span>}
                {img.tags.length > 0 && (
                  <span style={{ marginLeft: 4 }}>{img.tags.join(", ")}</span>
                )}
                <a
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: 6,
                    color: "inherit",
                    textDecoration: "underline",
                  }}
                >
                  open
                </a>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
