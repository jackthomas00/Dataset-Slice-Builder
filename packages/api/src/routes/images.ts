import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { buildImageWhere, getPagination, normalizeFilters } from "../lib/filters.js";

const querySchema = z.object({
  dataset_id: z.string().min(1),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  time_of_day: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  lat: z.union([z.string(), z.number()]).optional(),
  lng: z.union([z.string(), z.number()]).optional(),
  radius_km: z.union([z.string(), z.number()]).optional(),
  tags: z.string().optional(),
  classes: z.string().optional(),
  split: z.string().optional(),
  has_annotations: z.union([z.enum(["true", "false"]), z.boolean()]).optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export async function imageRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query", details: z.flattenError(parsed.error) });
    }

    const { dataset_id, ...rawFilters } = parsed.data;
    const filters = normalizeFilters(rawFilters);
    const { page, limit } = getPagination(filters);
    const skip = (page - 1) * limit;
    const where = buildImageWhere(dataset_id, filters);

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy: { capturedAt: "desc" },
        include: {
          annotationSummary: true,
          tags: { include: { tag: true } },
        },
      }),
      prisma.image.count({ where }),
    ]);

    return {
      images: images.map((img) => ({
        id: img.id,
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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const image = await prisma.image.findUnique({
      where: { id: request.params.id },
      include: {
        dataset: true,
        annotationSummary: true,
        tags: { include: { tag: true } },
      },
    });

    if (!image) return reply.status(404).send({ error: "Image not found" });

    return {
      id: image.id,
      url: image.url,
      width: image.width,
      height: image.height,
      capturedAt: image.capturedAt,
      gpsLat: image.gpsLat,
      gpsLng: image.gpsLng,
      split: image.split,
      datasetId: image.datasetId,
      tags: image.tags.map((t) => t.tag.name),
      hasAnnotations: image.annotationSummary?.hasAnnotations ?? false,
      classes: image.annotationSummary?.classesJson
        ? (JSON.parse(image.annotationSummary.classesJson) as string[])
        : [],
    };
  });
}
