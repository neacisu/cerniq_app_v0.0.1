import type { FastifyInstance, FastifyRequest } from "fastify";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { buildWebhookProvenanceContext } from "../lib/provenance.js";
import { buildHttpJobTracingFields } from "../lib/http-job-tracing.js";
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

function safeWebhookEventType(
  body: unknown,
  source: "timelinesai" | "instantly" | "resend",
): string {
  if (body === null || body === undefined || typeof body !== "object") return "unknown";
  const b = body as Record<string, unknown>;
  if (source === "timelinesai") {
    const ev = b.event ?? b.event_type;
    return typeof ev === "string" && ev.length > 0 ? ev : "unknown";
  }
  if (source === "instantly") {
    const ev = b.event_type;
    return typeof ev === "string" && ev.length > 0 ? ev : "unknown";
  }
  const ev = b.type;
  return typeof ev === "string" && ev.length > 0 ? ev : "unknown";
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
      getHeader(request, "x-signature") ??
      getHeader(request, "x-timelines-signature") ??
      getHeader(request, "X-Timelines-Signature");
    const httpTrace = buildHttpJobTracingFields(request);
    if (!verifyTimelinesAIWebhookSignature(raw, sig, secret)) {
      request.log.warn(
        {
          webhookSource: "timelinesai",
          eventType: safeWebhookEventType(request.body, "timelinesai"),
          signatureValid: false,
          correlationId: httpTrace.httpCorrelationId,
          requestId: httpTrace.requestId,
        },
        "TimelinesAI webhook: invalid signature",
      );
      return reply.status(401).send({ success: false, error: "Invalid signature" });
    }
    request.log.info(
      {
        webhookSource: "timelinesai",
        eventType: safeWebhookEventType(request.body, "timelinesai"),
        signatureValid: true,
        correlationId: httpTrace.httpCorrelationId,
        requestId: httpTrace.requestId,
      },
      "webhook accepted",
    );
    const timelinesProv = buildWebhookProvenanceContext(request.body, "timelinesai");
    await timelinesQueue.add("ingest", {
      source: "timelinesai",
      body: request.body,
      receivedAt: new Date().toISOString(),
      ...timelinesProv,
      ...httpTrace,
      sourceEndpoint: timelinesProv.sourceEndpoint,
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
    const httpTrace = buildHttpJobTracingFields(request);
    if (
      !verifyInstantlyWebhookSignature(
        raw,
        request.headers as Record<string, string | string[] | undefined>,
        secret,
      )
    ) {
      request.log.warn(
        {
          webhookSource: "instantly",
          eventType: safeWebhookEventType(request.body, "instantly"),
          signatureValid: false,
          correlationId: httpTrace.httpCorrelationId,
          requestId: httpTrace.requestId,
        },
        "Instantly webhook: invalid signature",
      );
      return reply.status(401).send({ success: false, error: "Invalid signature" });
    }
    request.log.info(
      {
        webhookSource: "instantly",
        eventType: safeWebhookEventType(request.body, "instantly"),
        signatureValid: true,
        correlationId: httpTrace.httpCorrelationId,
        requestId: httpTrace.requestId,
      },
      "webhook accepted",
    );
    const instantlyProv = buildWebhookProvenanceContext(request.body, "instantly");
    await instantlyQueue.add("ingest", {
      source: "instantly",
      body: request.body,
      receivedAt: new Date().toISOString(),
      ...instantlyProv,
      ...httpTrace,
      sourceEndpoint: instantlyProv.sourceEndpoint,
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
    const httpTrace = buildHttpJobTracingFields(request);
    try {
      await verifyResendWebhook(raw.toString("utf8"), hdrs, secret);
    } catch {
      request.log.warn(
        {
          webhookSource: "resend",
          eventType: safeWebhookEventType(request.body, "resend"),
          signatureValid: false,
          correlationId: httpTrace.httpCorrelationId,
          requestId: httpTrace.requestId,
        },
        "Resend webhook: invalid signature (Svix verification failed)",
      );
      return reply.status(401).send({ success: false, error: "Invalid signature" });
    }
    request.log.info(
      {
        webhookSource: "resend",
        eventType: safeWebhookEventType(request.body, "resend"),
        signatureValid: true,
        correlationId: httpTrace.httpCorrelationId,
        requestId: httpTrace.requestId,
      },
      "webhook accepted",
    );
    const resendProv = buildWebhookProvenanceContext(request.body, "resend");
    await resendQueue.add("ingest", {
      source: "resend",
      body: request.body,
      receivedAt: new Date().toISOString(),
      ...resendProv,
      ...httpTrace,
      sourceEndpoint: resendProv.sourceEndpoint,
    });
    return reply.status(200).send({ success: true, accepted: true });
  });
}
