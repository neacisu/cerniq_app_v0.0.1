import type { FastifyInstance, FastifyRequest } from "fastify";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { buildWebhookProvenanceContext } from "../lib/provenance.js";
import { verifyTimelinesAIWebhookSignature } from "@cerniq/integrations/timelinesai";
import { verifyInstantlyWebhookSignature } from "@cerniq/integrations/instantly";
import { verifyResendWebhook } from "@cerniq/integrations/resend";

declare module "fastify" {
  interface FastifyRequest {
    /** Setat doar pentru rutele din acest modul (parser JSON cu buffer). */
    rawBody?: Buffer;
  }
}

function headersToRecord(req: FastifyRequest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") {
      out[k] = v;
    } else if (Array.isArray(v) && v[0]) {
      out[k] = v[0];
    }
  }
  return out;
}

function getHeader(req: FastifyRequest, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (typeof v === "string") {
    return v;
  }
  if (Array.isArray(v)) {
    return v[0];
  }
  return undefined;
}

/** Fastify `parseAs: "buffer"` poate livra `Buffer` sau alte reprezentări în funcție de versiune/plugin. */
function bodyToBuffer(body: unknown): Buffer {
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof body === "string") {
    return Buffer.from(body, "utf8");
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  return Buffer.from(String(body));
}

/**
 * Rute webhook Etapa 2: semnătură verificată, apoi job în coada BullMQ corespunzătoare.
 * Prefix înregistrare: `/api/v1/webhooks`.
 */
export async function webhooksRoutes(app: FastifyInstance) {
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    const buf = bodyToBuffer(body);
    Object.assign(req, { rawBody: buf });
    try {
      const json = JSON.parse(buf.toString("utf8"));
      done(null, json);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      e.statusCode = 400;
      done(e, undefined);
    }
  });

  const timelinesQueue = createQueue(QUEUES.WEBHOOK_TIMELINESAI_INGEST);
  const instantlyQueue = createQueue(QUEUES.WEBHOOK_INSTANTLY_INGEST);
  const resendQueue = createQueue(QUEUES.WEBHOOK_RESEND_INGEST);

  app.post("/timelinesai", async (request, reply) => {
    const secret = process.env.TIMELINESAI_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return reply.status(503).send({ success: false, error: "Webhook not configured" });
    }
    const raw = request.rawBody;
    if (!raw) {
      return reply.status(500).send({ success: false, error: "raw body missing" });
    }
    const sig =
      getHeader(request, "x-timelines-signature") ?? getHeader(request, "X-Timelines-Signature");
    if (!verifyTimelinesAIWebhookSignature(raw, sig, secret)) {
      request.log.warn("TimelinesAI webhook: invalid signature");
      return reply.status(401).send({ success: false, error: "Invalid signature" });
    }
    await timelinesQueue.add("ingest", {
      source: "timelinesai",
      body: request.body,
      receivedAt: new Date().toISOString(),
      ...buildWebhookProvenanceContext(request.body, "timelinesai"),
    });
    return reply.status(200).send({ success: true, accepted: true });
  });

  app.post("/instantly", async (request, reply) => {
    const secret = process.env.INSTANTLY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return reply.status(503).send({ success: false, error: "Webhook not configured" });
    }
    const raw = request.rawBody;
    if (!raw) {
      return reply.status(500).send({ success: false, error: "raw body missing" });
    }
    if (
      !verifyInstantlyWebhookSignature(
        raw,
        request.headers as Record<string, string | string[] | undefined>,
        secret,
      )
    ) {
      request.log.warn("Instantly webhook: invalid signature");
      return reply.status(401).send({ success: false, error: "Invalid signature" });
    }
    await instantlyQueue.add("ingest", {
      source: "instantly",
      body: request.body,
      receivedAt: new Date().toISOString(),
      ...buildWebhookProvenanceContext(request.body, "instantly"),
    });
    return reply.status(200).send({ success: true, accepted: true });
  });

  app.post("/resend", async (request, reply) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return reply.status(503).send({ success: false, error: "Webhook not configured" });
    }
    const raw = request.rawBody;
    if (!raw) {
      return reply.status(500).send({ success: false, error: "raw body missing" });
    }
    const hdrs = headersToRecord(request);
    try {
      await verifyResendWebhook(raw.toString("utf8"), hdrs, secret);
    } catch {
      request.log.warn("Resend webhook: invalid signature (Svix verification failed)");
      return reply.status(401).send({ success: false, error: "Invalid signature" });
    }
    await resendQueue.add("ingest", {
      source: "resend",
      body: request.body,
      receivedAt: new Date().toISOString(),
      ...buildWebhookProvenanceContext(request.body, "resend"),
    });
    return reply.status(200).send({ success: true, accepted: true });
  });
}
