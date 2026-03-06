import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/test";

const { buildReportMarkdown, summarizeDatasetImages } = await import("./report.js");

const images = [
  {
    id: "1",
    hourOfDay: 22,
    capturedAt: new Date("2026-03-01T22:00:00.000Z"),
    gpsLat: 40.7,
    gpsLng: -74.0,
    split: "train",
    tags: [{ tag: { name: "outdoor" } }],
    annotationSummary: { hasAnnotations: true, classesJson: '["forklift","person"]' },
  },
  {
    id: "2",
    hourOfDay: 10,
    capturedAt: null,
    gpsLat: null,
    gpsLng: null,
    split: "valid",
    tags: [],
    annotationSummary: { hasAnnotations: false, classesJson: "[]" },
  },
  {
    id: "3",
    hourOfDay: null,
    capturedAt: new Date("2026-03-02T12:00:00.000Z"),
    gpsLat: 40.71,
    gpsLng: -74.01,
    split: null,
    tags: [{ tag: { name: "indoor" } }],
    annotationSummary: null,
  },
];

test("summarizeDatasetImages computes distributions and completeness", () => {
  const report = summarizeDatasetImages("dataset-1", "Demo Dataset", images);

  assert.equal(report.summary.imageCount, 3);
  assert.equal(report.summary.annotatedImageCount, 1);
  assert.equal(report.summary.annotationCoverageRate, 33.3);
  assert.equal(report.completeness.missingCapturedAt, 1);
  assert.equal(report.completeness.missingGps, 1);
  assert.equal(report.completeness.missingTags, 1);
  assert.equal(report.completeness.missingAnnotations, 2);
  assert.equal(report.completeness.missingAnnotationSummary, 1);
  assert.deepEqual(report.distributions.splits.map((bucket: { label: string }) => bucket.label), ["train", "unspecified", "valid"]);
  assert.deepEqual(report.distributions.classes.map((bucket: { label: string; count: number }) => [bucket.label, bucket.count]), [["forklift", 1], ["person", 1]]);
  assert.deepEqual(report.distributions.timeOfDay.map((bucket: { label: string }) => bucket.label), ["morning", "night", "unknown"]);
});

test("buildReportMarkdown includes reproducible slice links", () => {
  const markdown = buildReportMarkdown(
    {
      summary: {
        datasetId: "dataset-1",
        datasetName: "Demo Dataset",
        imageCount: 3,
        annotatedImageCount: 1,
        annotationCoverageRate: 33.3,
      },
      distributions: {
        splits: [],
        classes: [],
        tags: [],
        timeOfDay: [],
      },
      completeness: {
        missingCapturedAt: 1,
        missingGps: 1,
        missingTags: 1,
        missingAnnotations: 2,
        missingAnnotationSummary: 1,
      },
      recommendedSlices: [
        {
          id: "night",
          title: "Night Coverage",
          reason: "Inspect low-light images.",
          filters: { time_of_day: "night", classes: ["forklift"] },
          matchCount: 1,
        },
      ],
    },
    "/datasets/dataset-1"
  );

  assert.match(markdown, /Dataset Health Report: Demo Dataset/);
  assert.match(markdown, /Reproduce: \/datasets\/dataset-1\?time_of_day=night&classes=forklift/);
});
