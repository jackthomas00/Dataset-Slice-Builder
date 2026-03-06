import { z } from "zod";

export const filterInputSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  time_of_day: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  lat: z.union([z.string(), z.number()]).optional(),
  lng: z.union([z.string(), z.number()]).optional(),
  radius_km: z.union([z.string(), z.number()]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  classes: z.union([z.string(), z.array(z.string())]).optional(),
  split: z.string().optional(),
  has_annotations: z.union([z.string(), z.boolean()]).optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface NormalizedFilters {
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

function parseNumber(value: string | number | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | boolean | undefined): boolean | undefined {
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

export function normalizeFilters(input: unknown): NormalizedFilters {
  const parsed = filterInputSchema.parse(input);
  const normalized: NormalizedFilters = {};

  const dateFrom = parseDateValue(parsed.date_from);
  if (dateFrom) normalized.date_from = dateFrom;

  const dateTo = parseDateValue(parsed.date_to);
  if (dateTo) normalized.date_to = dateTo;

  if (parsed.time_of_day) normalized.time_of_day = parsed.time_of_day;

  const lat = parseNumber(parsed.lat);
  const lng = parseNumber(parsed.lng);
  const radiusKm = parseNumber(parsed.radius_km);
  if (lat != null) normalized.lat = lat;
  if (lng != null) normalized.lng = lng;
  if (radiusKm != null && radiusKm > 0) normalized.radius_km = radiusKm;

  const tags = parseList(parsed.tags);
  if (tags) normalized.tags = tags;

  const classes = parseList(parsed.classes);
  if (classes) normalized.classes = classes;

  if (parsed.split?.trim()) normalized.split = parsed.split.trim();

  const hasAnnotations = parseBoolean(parsed.has_annotations);
  if (hasAnnotations != null) normalized.has_annotations = hasAnnotations;

  const page = parseNumber(parsed.page);
  if (page != null && page >= 1) normalized.page = Math.floor(page);

  const limit = parseNumber(parsed.limit);
  if (limit != null && limit >= 1) normalized.limit = Math.min(100, Math.floor(limit));

  return normalized;
}

export function buildImageWhere(datasetId: string, filters: NormalizedFilters) {
  const and: Array<Record<string, unknown>> = [];

  if (filters.date_from || filters.date_to) {
    const capturedAt: Record<string, Date> = {};
    if (filters.date_from) capturedAt.gte = new Date(filters.date_from);
    if (filters.date_to) capturedAt.lte = new Date(filters.date_to);
    and.push({ capturedAt });
  }

  if (filters.time_of_day) {
    if (filters.time_of_day === "night") {
      and.push({
        OR: [
          { hourOfDay: { gte: 21 } },
          { hourOfDay: { lt: 5 } },
        ],
      });
    } else {
      const hourRanges: Record<Exclude<TimeOfDay, "night">, { gte: number; lt: number }> = {
        morning: { gte: 5, lt: 12 },
        afternoon: { gte: 12, lt: 17 },
        evening: { gte: 17, lt: 21 },
      };
      and.push({ hourOfDay: hourRanges[filters.time_of_day] });
    }
  }

  if (filters.split) and.push({ split: filters.split });

  if (filters.has_annotations === true) {
    and.push({ annotationSummary: { is: { hasAnnotations: true } } });
  } else if (filters.has_annotations === false) {
    and.push({
      OR: [
        { annotationSummary: { is: { hasAnnotations: false } } },
        { annotationSummary: { is: null } },
      ],
    });
  }

  if (filters.tags?.length) {
    and.push({
      tags: {
        some: {
          tag: { name: { in: filters.tags } },
        },
      },
    });
  }

  if (filters.classes?.length) {
    and.push({
      annotationSummary: {
        is: {
          OR: filters.classes.map((className) => ({
            classesJson: { contains: `"${className}"` },
          })),
        },
      },
    });
  }

  if (filters.lat != null && filters.lng != null && filters.radius_km != null) {
    const degPerKm = 1 / 111.32;
    const delta = filters.radius_km * degPerKm;
    and.push({ gpsLat: { gte: filters.lat - delta, lte: filters.lat + delta } });
    and.push({ gpsLng: { gte: filters.lng - delta, lte: filters.lng + delta } });
  }

  return and.length > 0 ? { datasetId, AND: and } : { datasetId };
}

export function getPagination(filters: NormalizedFilters) {
  return {
    page: filters.page ?? 1,
    limit: filters.limit ?? 24,
  };
}
