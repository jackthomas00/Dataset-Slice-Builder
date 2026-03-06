import { prisma } from "../lib/prisma.js";
import { buildImageWhere, type NormalizedFilters } from "../lib/filters.js";

interface ReportSourceImage {
  id: string;
  hourOfDay: number | null;
  capturedAt: Date | null;
  gpsLat: number | null;
  gpsLng: number | null;
  split: string | null;
  tags: Array<{ tag: { name: string } }>;
  annotationSummary: {
    hasAnnotations: boolean;
    classesJson: string | null;
  } | null;
}

export interface ReportBucket {
  label: string;
  count: number;
  percentage: number;
}

export interface RecommendedSlice {
  id: string;
  title: string;
  reason: string;
  filters: NormalizedFilters;
  matchCount: number;
}

export interface DatasetHealthReport {
  summary: {
    datasetId: string;
    datasetName: string;
    imageCount: number;
    annotatedImageCount: number;
    annotationCoverageRate: number;
  };
  distributions: {
    splits: ReportBucket[];
    classes: ReportBucket[];
    tags: ReportBucket[];
    timeOfDay: ReportBucket[];
  };
  completeness: {
    missingCapturedAt: number;
    missingGps: number;
    missingTags: number;
    missingAnnotations: number;
    missingAnnotationSummary: number;
  };
  recommendedSlices: RecommendedSlice[];
}

export interface DatasetReportSummary {
  summary: DatasetHealthReport["summary"];
  distributions: DatasetHealthReport["distributions"];
  completeness: DatasetHealthReport["completeness"];
  classCounts: Map<string, number>;
}

function percentage(count: number, total: number) {
  return total === 0 ? 0 : Number(((count / total) * 100).toFixed(1));
}

function parseClasses(classesJson: string | null | undefined): string[] {
  if (!classesJson) return [];
  try {
    const parsed = JSON.parse(classesJson) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function sortBuckets(entries: Map<string, number>, total: number): ReportBucket[] {
  return [...entries.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({
      label,
      count,
      percentage: percentage(count, total),
    }));
}

function getTimeOfDayLabel(hour: number | null): string {
  if (hour == null) return "unknown";
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

async function countForFilters(datasetId: string, filters: NormalizedFilters) {
  return prisma.image.count({ where: buildImageWhere(datasetId, filters) });
}

function roundedClusterKey(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function summarizeDatasetImages(
  datasetId: string,
  datasetName: string,
  images: ReportSourceImage[]
): DatasetReportSummary {
  const total = images.length;
  const splitCounts = new Map<string, number>();
  const classCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const timeCounts = new Map<string, number>();

  let annotatedImageCount = 0;
  let missingCapturedAt = 0;
  let missingGps = 0;
  let missingTags = 0;
  let missingAnnotations = 0;
  let missingAnnotationSummary = 0;

  for (const image of images) {
    splitCounts.set(image.split ?? "unspecified", (splitCounts.get(image.split ?? "unspecified") ?? 0) + 1);

    const timeLabel = getTimeOfDayLabel(image.hourOfDay);
    timeCounts.set(timeLabel, (timeCounts.get(timeLabel) ?? 0) + 1);

    if (!image.capturedAt) missingCapturedAt += 1;
    if (image.gpsLat == null || image.gpsLng == null) missingGps += 1;
    if (image.tags.length === 0) missingTags += 1;

    if (!image.annotationSummary) {
      missingAnnotationSummary += 1;
      missingAnnotations += 1;
    } else {
      if (image.annotationSummary.hasAnnotations) annotatedImageCount += 1;
      else missingAnnotations += 1;

      for (const className of parseClasses(image.annotationSummary.classesJson)) {
        classCounts.set(className, (classCounts.get(className) ?? 0) + 1);
      }
    }

    for (const tag of image.tags) {
      tagCounts.set(tag.tag.name, (tagCounts.get(tag.tag.name) ?? 0) + 1);
    }
  }

  return {
    summary: {
      datasetId,
      datasetName,
      imageCount: total,
      annotatedImageCount,
      annotationCoverageRate: percentage(annotatedImageCount, total),
    },
    distributions: {
      splits: sortBuckets(splitCounts, total),
      classes: sortBuckets(classCounts, total),
      tags: sortBuckets(tagCounts, total),
      timeOfDay: sortBuckets(timeCounts, total),
    },
    completeness: {
      missingCapturedAt,
      missingGps,
      missingTags,
      missingAnnotations,
      missingAnnotationSummary,
    },
    classCounts,
  };
}

export async function buildRecommendedSlices(
  datasetId: string,
  images: ReportSourceImage[],
  classCounts: Map<string, number>
): Promise<RecommendedSlice[]> {
  const candidates: RecommendedSlice[] = [];

  const addCandidate = async (id: string, title: string, reason: string, filters: NormalizedFilters) => {
    const matchCount = await countForFilters(datasetId, filters);
    if (matchCount > 0) candidates.push({ id, title, reason, filters, matchCount });
  };

  await addCandidate(
    "night",
    "Night Coverage",
    "Inspect low-light images where model performance often drops and metadata quality can shift.",
    { time_of_day: "night" }
  );

  await addCandidate(
    "no_annotations",
    "Missing Annotations",
    "Review images that lack annotations to confirm whether labels are actually missing or intentionally absent.",
    { has_annotations: false }
  );

  const splitCounts = new Map<string, number>();
  for (const image of images) {
    splitCounts.set(image.split ?? "unspecified", (splitCounts.get(image.split ?? "unspecified") ?? 0) + 1);
  }
  const mostCommonSplit = [...splitCounts.entries()]
    .filter(([label]) => label !== "unspecified")
    .sort((a, b) => b[1] - a[1])[0];
  if (mostCommonSplit) {
    await addCandidate(
      `split_${mostCommonSplit[0]}`,
      `${mostCommonSplit[0]} Split`,
      "Focus on the dominant split to check whether metadata balance is masking issues in the rest of the dataset.",
      { split: mostCommonSplit[0] }
    );
  }

  const rareClass = [...classCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
  if (rareClass) {
    await addCandidate(
      `class_${rareClass[0]}`,
      `Rare Class: ${rareClass[0]}`,
      "Inspect the sparsest class slice to see whether limited coverage is likely to hurt training and evaluation quality.",
      { classes: [rareClass[0]] }
    );
  }

  const gpsClusters = new Map<string, number>();
  for (const image of images) {
    const key = roundedClusterKey(image.gpsLat, image.gpsLng);
    if (!key) continue;
    gpsClusters.set(key, (gpsClusters.get(key) ?? 0) + 1);
  }
  const dominantCluster = [...gpsClusters.entries()].sort((a, b) => b[1] - a[1])[0];
  if (dominantCluster) {
    const [lat, lng] = dominantCluster[0].split(",").map(Number);
    await addCandidate(
      "gps_cluster",
      "Dominant GPS Cluster",
      "Inspect the densest location cluster to catch location bias and repeated capture conditions.",
      { lat, lng, radius_km: 2 }
    );
  }

  return candidates.sort((a, b) => b.matchCount - a.matchCount || a.title.localeCompare(b.title)).slice(0, 6);
}

export function buildReportMarkdown(report: DatasetHealthReport, basePath: string) {
  const lines = [
    `# Dataset Health Report: ${report.summary.datasetName}`,
    "",
    "## Summary",
    `- Dataset ID: ${report.summary.datasetId}`,
    `- Images: ${report.summary.imageCount}`,
    `- Annotated images: ${report.summary.annotatedImageCount}`,
    `- Annotation coverage: ${report.summary.annotationCoverageRate}%`,
    "",
    "## Completeness",
    `- Missing timestamps: ${report.completeness.missingCapturedAt}`,
    `- Missing GPS: ${report.completeness.missingGps}`,
    `- Missing tags: ${report.completeness.missingTags}`,
    `- Missing annotations: ${report.completeness.missingAnnotations}`,
    `- Missing annotation summary: ${report.completeness.missingAnnotationSummary}`,
    "",
    "## Top Findings",
  ];

  for (const slice of report.recommendedSlices) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(slice.filters)) {
      if (value == null) continue;
      if (Array.isArray(value)) query.set(key, value.join(","));
      else query.set(key, String(value));
    }
    lines.push(`- **${slice.title}** (${slice.matchCount} images): ${slice.reason}`);
    lines.push(`  - Reproduce: ${basePath}?${query.toString()}`);
  }

  return `${lines.join("\n")}\n`;
}

export async function generateDatasetHealthReport(datasetId: string): Promise<DatasetHealthReport | null> {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: { id: true, name: true },
  });

  if (!dataset) return null;

  const images = await prisma.image.findMany({
    where: { datasetId },
    select: {
      id: true,
      hourOfDay: true,
      capturedAt: true,
      gpsLat: true,
      gpsLng: true,
      split: true,
      tags: { select: { tag: { select: { name: true } } } },
      annotationSummary: {
        select: {
          hasAnnotations: true,
          classesJson: true,
        },
      },
    },
  });

  const summary = summarizeDatasetImages(dataset.id, dataset.name, images);
  const recommendedSlices = await buildRecommendedSlices(dataset.id, images, summary.classCounts);

  return {
    summary: summary.summary,
    distributions: summary.distributions,
    completeness: summary.completeness,
    recommendedSlices,
  };
}
