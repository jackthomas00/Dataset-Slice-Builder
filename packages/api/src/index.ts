import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { datasetRoutes } from "./routes/datasets.js";
import { imageRoutes } from "./routes/images.js";
import { sliceRoutes } from "./routes/slices.js";

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });
await fastify.register(healthRoutes, { prefix: "/api" });
await fastify.register(datasetRoutes, { prefix: "/api/datasets" });
await fastify.register(imageRoutes, { prefix: "/api/images" });
await fastify.register(sliceRoutes, { prefix: "/api/slices" });

const start = async () => {
  try {
    await fastify.listen({ port: 4000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
