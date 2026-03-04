"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState, useEffect } from "react";
import type { Image } from "@/lib/api";

interface ImageGridProps {
  images: Image[];
  total: number;
}

const CARD_SIZE = 200;
const GAP = 12;

export function ImageGrid({ images, total }: ImageGridProps) {
  const [columnCount, setColumnCount] = useState(4);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const update = () =>
      setColumnCount(Math.max(1, Math.floor(el.offsetWidth / (CARD_SIZE + GAP))));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowCount = Math.ceil(images.length / columnCount);
  const rows = Array.from({ length: rowCount }, (_, i) =>
    images.slice(i * columnCount, (i + 1) * columnCount)
  );

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_SIZE + GAP,
    overscan: 2,
  });

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
    <div
      ref={parentRef}
      style={{
        height: "70vh",
        overflow: "auto",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowImages = rows[virtualRow.index] ?? [];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${columnCount}, ${CARD_SIZE}px)`,
                gap: GAP,
                paddingBottom: GAP,
              }}
            >
              {rowImages.map((img) => (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--border)",
                    textDecoration: "none",
                    color: "inherit",
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
                  <div
                    style={{
                      padding: "0.5rem",
                      fontSize: 12,
                      color: "var(--muted)",
                    }}
                  >
                    {img.split && <span>{img.split}</span>}
                    {img.tags.length > 0 && (
                      <span style={{ marginLeft: 4 }}>{img.tags.join(", ")}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
