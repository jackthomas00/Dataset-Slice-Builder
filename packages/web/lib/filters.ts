export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface DatasetFilters {
  date_from?: string;
  date_to?: string;
  time_of_day?: TimeOfDay;
  lat?: number;
  lng?: number;
  radius_km?: number;
  tags?: string[];
  classes?: string[];
  split?: string;
  has_annotations?: boolean;
  page?: number;
  limit?: number;
}

function parseList(value: string | string[] | undefined): string[] | undefined {
  if (value == null) return undefined;
  const items = Array.isArray(value) ? value : value.split(",");
  const normalized = items.map((item) => item.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function parseNumber(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | boolean | null | undefined): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseDateValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function formatDateForQuery(value: string) {
  return value.includes("T") ? value.slice(0, 10) : value;
}

export function normalizeFilters(input: Record<string, unknown>): DatasetFilters {
  const normalized: DatasetFilters = {};

  const dateFrom = typeof input.date_from === "string" ? parseDateValue(input.date_from) : undefined;
  if (dateFrom) normalized.date_from = dateFrom;

  const dateTo = typeof input.date_to === "string" ? parseDateValue(input.date_to) : undefined;
  if (dateTo) normalized.date_to = dateTo;

  if (
    input.time_of_day === "morning" ||
    input.time_of_day === "afternoon" ||
    input.time_of_day === "evening" ||
    input.time_of_day === "night"
  ) {
    normalized.time_of_day = input.time_of_day;
  }

  const lat = parseNumber(input.lat as string | number | null | undefined);
  const lng = parseNumber(input.lng as string | number | null | undefined);
  const radiusKm = parseNumber(input.radius_km as string | number | null | undefined);
  if (lat != null) normalized.lat = lat;
  if (lng != null) normalized.lng = lng;
  if (radiusKm != null && radiusKm > 0) normalized.radius_km = radiusKm;

  const tags = parseList(input.tags as string | string[] | undefined);
  if (tags) normalized.tags = tags;

  const classes = parseList(input.classes as string | string[] | undefined);
  if (classes) normalized.classes = classes;

  if (typeof input.split === "string" && input.split.trim()) normalized.split = input.split.trim();

  const hasAnnotations = parseBoolean(input.has_annotations as string | boolean | null | undefined);
  if (hasAnnotations != null) normalized.has_annotations = hasAnnotations;

  const page = parseNumber(input.page as string | number | null | undefined);
  if (page != null && page >= 1) normalized.page = Math.floor(page);

  const limit = parseNumber(input.limit as string | number | null | undefined);
  if (limit != null && limit >= 1) normalized.limit = Math.floor(limit);

  return normalized;
}

export function searchParamsToFilters(searchParams: URLSearchParams | { entries(): IterableIterator<[string, string]> }): DatasetFilters {
  return normalizeFilters(Object.fromEntries(searchParams.entries()));
}

export function filtersToSearchParams(filters: DatasetFilters) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) searchParams.set(key, value.join(","));
      continue;
    }
    if (typeof value === "boolean") {
      searchParams.set(key, String(value));
      continue;
    }
    if ((key === "date_from" || key === "date_to") && typeof value === "string") {
      searchParams.set(key, formatDateForQuery(value));
      continue;
    }
    searchParams.set(key, String(value));
  }

  return searchParams;
}

export function filtersToApiQuery(datasetId: string, filters: DatasetFilters) {
  const searchParams = filtersToSearchParams(filters);
  searchParams.set("dataset_id", datasetId);
  return searchParams.toString();
}
