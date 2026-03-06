import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { buildImageWhere, normalizeFilters } from "../lib/filters.js";

const createSliceSchema = z.object({
  datasetId: z.string().min(1),
  name: z.string().min(1),
  filterJson: z.unknown(),
});

export async function sliceRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    const datasetId = (request.query as { dataset_id?: string }).dataset_id;
    if (!datasetId) {
      return reply.status(400).send({ error: "dataset_id is required" });
    }

    const slices = await prisma.savedSlice.findMany({
      where: { datasetId },
      orderBy: { createdAt: "desc" },
    });
    return slices;
  });

  fastify.post("/", async (request, reply) => {
    const parsed = createSliceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: z.flattenError(parsed.error) });
    }

    const slice = await prisma.savedSlice.create({
      data: {
        datasetId: parsed.data.datasetId,
        name: parsed.data.name,
        filterJson: JSON.stringify(normalizeFilters(parsed.data.filterJson)),
      },
    });
    return slice;
  });

  fastify.get<{ Params: { id: string } }>("/:id/export", async (request, reply) => {
    const slice = await prisma.savedSlice.findUnique({
      where: { id: request.params.id },
      include: { dataset: true },
    });

    if (!slice) return reply.status(404).send({ error: "Slice not found" });

    const filters = normalizeFilters(JSON.parse(slice.filterJson) as Record<string, unknown>);
    const where = buildImageWhere(slice.datasetId, filters);

    const images = await prisma.image.findMany({
      where,
      include: {
        annotationSummary: true,
        tags: { include: { tag: true } },
      },
    });

    const manifest = {
      sliceId: slice.id,
      sliceName: slice.name,
      datasetId: slice.datasetId,
      datasetName: slice.dataset.name,
      filters,
      exportedAt: new Date().toISOString(),
      imageCount: images.length,
      images: images.map((img) => ({
        id: img.id,
        roboflowImageId: img.roboflowImageId,
        url: img.url,
        width: img.width,
        height: img.height,
        capturedAt: img.capturedAt,
        gpsLat: img.gpsLat,
        gpsLng: img.gpsLng,
        split: img.split,
        tags: img.tags.map((t) => t.tag.name),
        hasAnnotations: img.annotationSummary?.hasAnnotations ?? false,
        classes: img.annotationSummary?.classesJson
          ? (JSON.parse(img.annotationSummary.classesJson) as string[])
          : [],
      })),
    };

    return reply
      .header("Content-Disposition", `attachment; filename="${slice.name.replace(/\s/g, "_")}_manifest.json"`)
      .send(manifest);
  });
}
