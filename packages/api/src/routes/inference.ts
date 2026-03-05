import type { FastifyInstance } from "fastify";
import { z } from "zod";

const predictSchema = z.object({
  imageUrl: z.url(),
  confidence: z.number().min(0).max(1).optional(),
  iouThreshold: z.number().min(0).max(1).optional(),
  overlap: z.number().min(0).max(1).optional(),
});

interface NormalizedPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  className: string;
  confidence: number;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value > 1) return value / 100;
  if (value < 0) return 0;
  return value;
}

function normalizePredictions(payload: unknown): NormalizedPrediction[] {
  if (!payload || typeof payload !== "object") return [];

  const rawPredictions =
    (payload as { predictions?: unknown }).predictions ??
    (payload as { outputs?: { predictions?: unknown } }).outputs?.predictions ??
    (payload as { outputs?: Array<{ predictions?: unknown }> }).outputs?.[0]?.predictions;

  if (!Array.isArray(rawPredictions)) return [];

  return rawPredictions.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];

    const candidate = raw as Record<string, unknown>;
    const x = typeof candidate.x === "number" ? candidate.x : null;
    const y = typeof candidate.y === "number" ? candidate.y : null;
    const width = typeof candidate.width === "number" ? candidate.width : null;
    const height = typeof candidate.height === "number" ? candidate.height : null;

    if (x == null || y == null || width == null || height == null) return [];

    const className =
      (typeof candidate.class === "string" && candidate.class) ||
      (typeof candidate.class_name === "string" && candidate.class_name) ||
      (typeof candidate.label === "string" && candidate.label) ||
      "object";

    return [
      {
        x,
        y,
        width,
        height,
        className,
        confidence: normalizeConfidence(candidate.confidence),
      },
    ];
  });
}

async function sendPredictionRequest(endpoint: string, headers: Record<string, string>, body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const parsed = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  };
}

export async function inferenceRoutes(fastify: FastifyInstance) {
  fastify.post("/predict", async (request, reply) => {
    const parsed = predictSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: z.flattenError(parsed.error),
      });
    }

    const { imageUrl, confidence, iouThreshold, overlap } = parsed.data;
    const modelId = process.env.ROBOFLOW_MODEL_ID;
    const baseUrl = process.env.ROBOFLOW_INFERENCE_URL || "http://localhost:9001";
    const inferenceTask = process.env.ROBOFLOW_INFERENCE_TASK || "object_detection";
    const apiKey = process.env.ROBOFLOW_API_KEY;

    if (!modelId) {
      return reply.status(400).send({
        error: "Missing ROBOFLOW_MODEL_ID env var for inference routing",
      });
    }

    const endpoint = new URL(`/infer/${inferenceTask}`, baseUrl);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const body: Record<string, unknown> = {
      model_id: modelId,
      image: {
        type: "url",
        value: imageUrl,
      },
      confidence: confidence ?? 0.35,
      iou_threshold: iouThreshold ?? overlap ?? 0.5,
    };

    if (apiKey) {
      body.api_key = apiKey;
    }

    const result = await sendPredictionRequest(endpoint.toString(), headers, body);
    if (!result.ok) {
      fastify.log.warn(
        { endpoint: endpoint.toString(), status: result.status, body: result.body },
        "Inference upstream request failed",
      );
      return reply.status(502).send({
        error: "Inference request failed",
        endpoint: endpoint.toString(),
        upstream: { status: result.status, body: result.body },
      });
    }

    const predictions = normalizePredictions(result.body);
    return {
      endpoint: endpoint.toString(),
      predictions,
      raw: result.body,
    };
  });
}
