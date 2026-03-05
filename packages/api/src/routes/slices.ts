import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createSliceSchema = z.object({
  datasetId: z.string().min(1),
  name: z.string().min(1),
  filterJson: z.string().min(1),
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
      data: parsed.data,
    });
    return slice;
  });

  fastify.get<{ Params: { id: string } }>("/:id/export", async (request, reply) => {
    const slice = await prisma.savedSlice.findUnique({
      where: { id: request.params.id },
      include: { dataset: true },
    });

    if (!slice) return reply.status(404).send({ error: "Slice not found" });

    const filters = JSON.parse(slice.filterJson) as Record<string, unknown>;

    const where: Record<string, unknown> = { datasetId: slice.datasetId };

    if (filters.date_from) {
      (where as Record<string, Record<string, Date>>).capturedAt = {
        gte: new Date(filters.date_from as string),
      };
    }
    if (filters.date_to) {
      where.capturedAt = where.capturedAt ?? {};
      (where.capturedAt as Record<string, Date>).lte = new Date(filters.date_to as string);
    }
    if (filters.time_of_day) {
      const hourRanges: Record<string, unknown> = {
        morning: { gte: 5, lt: 12 },
        afternoon: { gte: 12, lt: 17 },
        evening: { gte: 17, lt: 21 },
        night: { OR: [{ gte: 21 }, { lt: 5 }] },
      };
      where.hourOfDay = hourRanges[filters.time_of_day as string];
    }
    if (filters.split) where.split = filters.split;
    if (filters.has_annotations === true) {
      where.annotationSummary = { hasAnnotations: true };
    } else if (filters.has_annotations === false) {
      where.annotationSummary = { hasAnnotations: false };
    }
    if (filters.tags && Array.isArray(filters.tags) && (filters.tags as string[]).length > 0) {
      where.tags = {
        some: { tag: { name: { in: filters.tags as string[] } } },
      };
    }

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
      filters: filters,
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
