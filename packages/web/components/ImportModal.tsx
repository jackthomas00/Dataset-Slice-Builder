"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

interface ImportModalProps {
  triggerLabel?: string;
}

export function ImportModal({ triggerLabel = "Import from Roboflow" }: ImportModalProps) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [project, setProject] = useState("");
  const [name, setName] = useState("");

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      fetchApi<{ id: string; name: string }>("/api/datasets/import", {
        method: "POST",
        body: JSON.stringify({
          apiKey,
          workspace,
          project,
          name: name || "Imported Dataset",
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setOpen(false);
      setApiKey("");
      setWorkspace("");
      setProject("");
      setName("");
    },
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "0.5rem 1rem",
          background: "var(--accent)",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 500,
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
              maxWidth: 400,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "1rem" }}>Import from Roboflow</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <label>
                <span style={{ display: "block", marginBottom: 4, fontSize: 14 }}>API Key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
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
              <label>
                <span style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Workspace</span>
                <input
                  type="text"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  required
                  placeholder="e.g. my-workspace"
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
              <label>
                <span style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Project</span>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  required
                  placeholder="e.g. my-project"
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
              <label>
                <span style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
                  Dataset name (optional)
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Imported Dataset"
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
                  {mutation.isPending ? "Importing..." : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
