import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { importDatasetFromRoboflow } from "../services/import.js";

const importSchema = z.object({
  apiKey: z.string().min(1),
  workspace: z.string().min(1),
  project: z.string().min(1),
  name: z.string().min(1).optional().default("Imported Dataset"),
});

export async function datasetRoutes(fastify: FastifyInstance) {
  fastify.get("/", async () => {
    const datasets = await prisma.dataset.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { images: true } },
      },
    });
    return datasets.map((d) => ({
      id: d.id,
      name: d.name,
      source: d.source,
      roboflowProjectId: d.roboflowProjectId,
      workspaceId: d.workspaceId,
      createdAt: d.createdAt,
      imageCount: d._count.images,
    }));
  });

  fastify.get<{ Params: { id: string } }>("/:id/tags", async (request, reply) => {
    const tags = await prisma.tag.findMany({
      where: {
        imageTags: {
          some: { image: { datasetId: request.params.id } },
        },
      },
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" },
    });
    return tags.map((t) => t.name);
  });

  fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const dataset = await prisma.dataset.findUnique({
      where: { id: request.params.id },
      include: { _count: { select: { images: true } } },
    });
    if (!dataset) return reply.status(404).send({ error: "Dataset not found" });
    return {
      id: dataset.id,
      name: dataset.name,
      source: dataset.source,
      roboflowProjectId: dataset.roboflowProjectId,
      workspaceId: dataset.workspaceId,
      createdAt: dataset.createdAt,
      imageCount: dataset._count.images,
    };
  });

  fastify.post("/import", async (request, reply) => {
    const parsed = importSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const { apiKey, workspace, project, name } = parsed.data;

    try {
      const dataset = await importDatasetFromRoboflow(apiKey, workspace, project, name);
      return { id: dataset.id, name: dataset.name, message: "Import completed" };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: err instanceof Error ? err.message : "Import failed",
      });
    }
  });
}
