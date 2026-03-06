"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import type { DatasetFilters } from "@/lib/filters";

interface SaveSliceModalProps {
  datasetId: string;
  filters: DatasetFilters;
  triggerLabel?: string;
  initialName?: string;
}

export function SaveSliceModal({
  datasetId,
  filters,
  triggerLabel = "Save Slice",
  initialName = "",
}: SaveSliceModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      fetchApi<{ id: string }>("/api/slices", {
        method: "POST",
        body: JSON.stringify({
          datasetId,
          name: name || "Untitled Slice",
          filterJson: filters,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slices", datasetId] });
      setOpen(false);
      setName(initialName);
    },
  });

  return (
    <>
      <button
        onClick={() => {
          setName(initialName);
          setOpen(true);
        }}
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
        {triggerLabel}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1.5rem",
              width: "100%",
              maxWidth: 360,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "1rem" }}>Save Slice</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <label>
                <span style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Slice name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Night + Warehouse"
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    background: "var(--border)",
                    border: "none",
                    borderRadius: 6,
                    color: "inherit",
                  }}
                />
              </label>
              {mutation.error && (
                <p style={{ color: "#ef4444", fontSize: 14 }}>{mutation.error.message}</p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: 6,
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {mutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
