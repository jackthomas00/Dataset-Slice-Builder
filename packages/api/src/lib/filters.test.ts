import test from "node:test";
import assert from "node:assert/strict";
import { buildImageWhere, normalizeFilters } from "./filters.js";

test("normalizeFilters canonicalizes lists, booleans, numbers, and dates", () => {
  const filters = normalizeFilters({
    date_from: "2026-03-01",
    tags: "outdoor, warehouse",
    classes: ["forklift", "person"],
    has_annotations: "false",
    lat: "40.7",
    lng: "-74.0",
    radius_km: "2.5",
    page: "2",
    limit: "150",
  });

  assert.equal(filters.date_from, "2026-03-01T00:00:00.000Z");
  assert.deepEqual(filters.tags, ["outdoor", "warehouse"]);
  assert.deepEqual(filters.classes, ["forklift", "person"]);
  assert.equal(filters.has_annotations, false);
  assert.equal(filters.lat, 40.7);
  assert.equal(filters.lng, -74);
  assert.equal(filters.radius_km, 2.5);
  assert.equal(filters.page, 2);
  assert.equal(filters.limit, 100);
});

test("buildImageWhere uses top-level OR for night filters and relation filters for annotations", () => {
  const where = buildImageWhere("dataset-1", {
    time_of_day: "night",
    has_annotations: false,
    classes: ["person"],
  });

  assert.equal(where.datasetId, "dataset-1");
  assert.ok(Array.isArray(where.AND));
  assert.deepEqual(where.AND?.[0], {
    OR: [{ hourOfDay: { gte: 21 } }, { hourOfDay: { lt: 5 } }],
  });
  assert.deepEqual(where.AND?.[1], {
    OR: [
      { annotationSummary: { is: { hasAnnotations: false } } },
      { annotationSummary: { is: null } },
    ],
  });
  assert.deepEqual(where.AND?.[2], {
    annotationSummary: {
      is: {
        OR: [{ classesJson: { contains: '"person"' } }],
      },
    },
  });
});
