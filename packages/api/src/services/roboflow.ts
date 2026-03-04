const ROBOFLOW_BASE = "https://api.roboflow.com";

export interface RoboflowImageSearchResult {
  id: string;
  name?: string;
  created?: number;
  split?: string;
  tags?: string[];
  annotations?: {
    count?: number;
    classes?: Record<string, number>;
  };
  labels?: string[];
}

export interface RoboflowImageDetails {
  image: {
    id: string;
    name: string;
    annotation?: {
      width: number;
      height: number;
      boxes?: Array<{ label: string; x: number; y: number; width: number; height: number }>;
    };
    labels: string[];
    split: string;
    tags: string[];
    created: number;
    urls: {
      original: string;
      thumb?: string;
      annotation?: string;
    };
  };
}

export interface RoboflowSearchResponse {
  offset: number;
  total: number;
  results: RoboflowImageSearchResult[];
}

export async function searchRoboflowImages(
  apiKey: string,
  workspace: string,
  project: string,
  offset = 0,
  limit = 100
): Promise<RoboflowSearchResponse> {
  const url = `${ROBOFLOW_BASE}/${workspace}/${project}/search?api_key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offset,
      limit,
      in_dataset: true,
      fields: ["id", "name", "created", "split", "tags", "annotations", "labels"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Roboflow API error: ${res.status} ${text}`);
  }

  return res.json() as Promise<RoboflowSearchResponse>;
}

export async function getRoboflowImageDetails(
  apiKey: string,
  workspace: string,
  project: string,
  imageId: string
): Promise<RoboflowImageDetails> {
  const url = `${ROBOFLOW_BASE}/${workspace}/${project}/images/${imageId}?api_key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Roboflow API error: ${res.status} ${text}`);
  }

  return res.json() as Promise<RoboflowImageDetails>;
}

export async function fetchAllRoboflowImages(
  apiKey: string,
  workspace: string,
  project: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<RoboflowImageSearchResult[]> {
  const all: RoboflowImageSearchResult[] = [];
  let offset = 0;
  const limit = 100;
  let total = 0;

  do {
    const resp = await searchRoboflowImages(apiKey, workspace, project, offset, limit);
    total = resp.total;
    all.push(...resp.results);
    offset += resp.results.length;
    onProgress?.(all.length, total);
  } while (all.length < total);

  return all;
}
