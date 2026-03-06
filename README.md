# Dataset Health Reports for Roboflow Users

Dataset Slice Builder now aims to do two things well:

1. Let users create reproducible dataset slices from Roboflow metadata.
2. Help users understand dataset quality issues quickly enough to act on them.

## What This Project Does

- Import Roboflow dataset metadata into a local Postgres-backed app.
- Filter images by time of day, date range, GPS radius, tags, classes, split, and annotation presence.
- Save slices and export manifests.
- Run optional local inference overlays on selected images.
- Generate dataset health reports with recommended slices and shareable report exports.

## Why This Is Useful To The Roboflow Community

Roboflow users often need to answer practical questions before retraining or debugging:

- Are labels missing from a meaningful portion of the dataset?
- Is one split carrying most of the data?
- Are rare classes underrepresented?
- Is the dataset biased toward one location or time of day?
- Which slice should I inspect first?

The health report layer turns the app from a browsing tool into a dataset QA workflow.

## Implemented Health Report Scope

### Backend

- `GET /api/datasets/:id/report`
- `GET /api/datasets/:id/report/export?format=json|md`
- Shared filter normalization for image queries, saved slices, and exports
- Recommended slices generated from current metadata

### Frontend

- Dataset-level Health Report page
- Summary cards for image count, annotation coverage, and metadata gaps
- Distribution views for splits, classes, tags, and time of day
- One-click jump from a recommendation into the filtered dataset view
- One-click save of recommended slices
- JSON and Markdown report export

## Current Community-Friendly Workflow

1. Seed or import a dataset.
2. Open the dataset page.
3. Open the Health Report.
4. Review recommended slices like night coverage, missing annotations, rare class, or dominant GPS cluster.
5. Jump into the slice, inspect thumbnails or inference overlays, then save/export the slice.
6. Export the full dataset health report as JSON or Markdown to share findings.

## Next Logical Improvements

- Add comparison mode between two saved slices.
- Add split-level drift summaries for tags/classes/time of day.
- Add duplicate or near-duplicate detection once embeddings are available.
- Add import progress and background processing for larger datasets.
- Add end-to-end browser tests once a local Node toolchain is available in the environment.
