import test from "node:test";
import assert from "node:assert/strict";
import { filtersToApiQuery, filtersToSearchParams, normalizeFilters } from "./filters";

test("normalizeFilters canonicalizes URL form data", () => {
  const filters = normalizeFilters({
    tags: "outdoor, night",
    has_annotations: "true",
    page: "3",
    radius_km: "5",
  });

  assert.deepEqual(filters.tags, ["outdoor", "night"]);
  assert.equal(filters.has_annotations, true);
  assert.equal(filters.page, 3);
  assert.equal(filters.radius_km, 5);
});

test("filtersToSearchParams serializes arrays and booleans", () => {
  const params = filtersToSearchParams({
    tags: ["outdoor", "night"],
    has_annotations: false,
    page: 2,
  });

  assert.equal(params.toString(), "tags=outdoor%2Cnight&has_annotations=false&page=2");
});

test("filtersToApiQuery appends dataset id", () => {
  const query = filtersToApiQuery("dataset-1", { split: "train", classes: ["person"] });
  assert.equal(query, "split=train&classes=person&dataset_id=dataset-1");
});
