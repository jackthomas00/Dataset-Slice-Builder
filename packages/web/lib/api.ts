const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const body = err as { error?: string; upstream?: { status?: number; body?: unknown } };
    const msg = body.error || "API error";
    const upstream = body.upstream;
    const detail =
      upstream?.body && typeof upstream.body === "object" && "detail" in upstream.body
        ? String((upstream.body as { detail: unknown }).detail)
        : upstream?.body
          ? JSON.stringify(upstream.body)
          : upstream?.status
            ? `Upstream status: ${upstream.status}`
            : undefined;
    throw new Error(detail ? `${msg}: ${detail}` : msg);
  }
  return res.json() as Promise<T>;
}

export interface Dataset {
  id: string;
  name: string;
  source: string;
  roboflowProjectId: string | null;
  workspaceId: string | null;
  createdAt: string;
  imageCount: number;
}

export interface Image {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  capturedAt: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  split: string | null;
  tags: string[];
  hasAnnotations: boolean;
  classes: string[];
}

export interface ImagesResponse {
  images: Image[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SavedSlice {
  id: string;
  datasetId: string;
  name: string;
  filterJson: string;
  createdAt: string;
}

export interface InferencePrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  className: string;
  confidence: number;
}

export interface InferenceResponse {
  endpoint: string;
  predictions: InferencePrediction[];
  raw: unknown;
}
