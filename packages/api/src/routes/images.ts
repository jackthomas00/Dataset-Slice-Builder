import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const querySchema = z.object({
  dataset_id: z.string().min(1),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  time_of_day: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius_km: z.coerce.number().positive().optional(),
  tags: z.string().optional(), // comma-separated
  split: z.string().optional(),
  has_annotations: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(24),
});

export async function imageRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query", details: z.flattenError(parsed.error) });
    }

    const {
      dataset_id,
      date_from,
      date_to,
      time_of_day,
      lat,
      lng,
      radius_km,
      tags,
      split,
      has_annotations,
      page,
      limit,
    } = parsed.data;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { datasetId: dataset_id };

    if (date_from || date_to) {
      where.capturedAt = {};
      if (date_from) (where.capturedAt as Record<string, Date>).gte = new Date(date_from);
      if (date_to) (where.capturedAt as Record<string, Date>).lte = new Date(date_to);
    }

    if (time_of_day) {
      const hourRanges: Record<string, { gte: number; lt: number } | { OR: Array<{ gte?: number; lt?: number }> }> = {
        morning: { gte: 5, lt: 12 },
        afternoon: { gte: 12, lt: 17 },
        evening: { gte: 17, lt: 21 },
        night: { OR: [{ gte: 21 }, { lt: 5 }] },
      };
      where.hourOfDay = hourRanges[time_of_day];
    }

    if (split) where.split = split;
    if (has_annotations === "true") {
      where.annotationSummary = { hasAnnotations: true };
    } else if (has_annotations === "false") {
      where.annotationSummary = { hasAnnotations: false };
    }

    if (tags) {
      const tagNames = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        where.tags = {
          some: {
            tag: { name: { in: tagNames } },
          },
        };
      }
    }

    if (lat != null && lng != null && radius_km != null) {
      const degPerKm = 1 / 111.32;
      const delta = radius_km * degPerKm;
      where.gpsLat = { gte: lat - delta, lte: lat + delta };
      where.gpsLng = { gte: lng - delta, lte: lng + delta };
    }

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
