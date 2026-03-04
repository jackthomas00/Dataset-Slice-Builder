const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || "API error");
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
