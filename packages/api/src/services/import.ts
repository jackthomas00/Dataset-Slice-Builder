import { prisma } from "../lib/prisma.js";
import { fetchAllRoboflowImages } from "./roboflow.js";

export async function importDatasetFromRoboflow(
  apiKey: string,
  workspace: string,
  project: string,
  datasetName: string,
  onProgress?: (fetched: number, total: number) => void
) {
  const images = await fetchAllRoboflowImages(apiKey, workspace, project, onProgress);

  const dataset = await prisma.dataset.create({
    data: {
      name: datasetName,
      source: "roboflow",
      roboflowProjectId: project,
      workspaceId: workspace,
    },
  });

  const tagNameToId = new Map<string, string>();

  for (const img of images) {
    const url = `https://source.roboflow.com/${workspace}/${img.id}/original.jpg`;
    const split = img.split ?? null;
    const created = img.created;
    const capturedAt = created ? new Date(created) : null;
    const hourOfDay = capturedAt ? capturedAt.getUTCHours() : null;

    const hasAnnotations = !!(img.annotations?.count ?? 0);
    const classes = img.annotations?.classes ? Object.keys(img.annotations.classes) : [];
    const annotationType = hasAnnotations ? "bbox" : null;

    const image = await prisma.image.create({
      data: {
        datasetId: dataset.id,
        roboflowImageId: img.id,
        url,
        width: null,
        height: null,
        capturedAt,
        hourOfDay,
        split,
      },
    });

    await prisma.annotationSummary.create({
      data: {
        imageId: image.id,
        hasAnnotations,
        classesJson: JSON.stringify(classes),
        annotationType,
      },
    });

    const tags = img.tags ?? [];
    for (const tagName of tags) {
      if (!tagName) continue;
      let tagId = tagNameToId.get(tagName);
      if (!tagId) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {},
        });
        tagId = tag.id;
        tagNameToId.set(tagName, tagId);
      }
      await prisma.imageTag.upsert({
        where: { imageId_tagId: { imageId: image.id, tagId } },
        create: { imageId: image.id, tagId },
        update: {},
      });
    }
  }

  return dataset;
}
