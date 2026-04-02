/**
 * A1 — revolut:webhook:ingest
 *
 * Responsabilitate:
 * - Idempotency via Redis SET NX EX 86400 pe eventId (plan §IX A1)
 * - Persistare revolut_webhooks_raw cu payload complet + signature
 * - Enqueue A2 (revolut:transaction:process) + A6 (revolut:webhook:validate) în paralel
 * - Redis unavailable → throw (BullMQ retry cu backoff exponențial)
 *
 * Anti-halucinare: idempotency pe eventId, NU pe payload (Revolut poate re-trimite același event).
 */
import type { Processor } from "bullmq";
import type { Redis } from "ioredis";
import { v4 as uuidv4 } from "uuid";
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import { db, setSessionTenantId, revolutWebhooksRaw } from "@cerniq/db";
import { e4RevolutWebhooksTotal } from "../e4-metrics.js";

export type WebhookIngestJobData = {
  /** UUID Revolut eveniment — folosit pentru cheia idempotency */
  eventId: string;
  /** Tip eveniment: 'TransactionCreated' | 'TransactionStateChanged' | 'TransferStateChanged' */
  eventType: string;
  /** Raw body JSON string — necesar pentru verificare HMAC-SHA256 în A6 */
  rawBody: string;
  /** Semnătura X-Revolut-Signature-V1 din header */
  signature: string;
  /** Payload JSON parsat */
  payload: Record<string, unknown>;
  /** Tenant ID Cerniq */
  tenantId: string;
};

export type WebhookIngestResult =
  | { ok: true; action: "ingested"; webhookId: string; eventType: string; eventId: string }
  | { ok: true; action: "skipped"; reason: "duplicate"; eventId: string };

/**
 * Creează un processor A1 cu acces la Redis injectat din bootstrap.
 * Redis este nevoie NUMAI pentru idempotency SET NX EX 86400.
 */
export function createA1Processor(redis: Redis): Processor<WebhookIngestJobData> {
  return async (job): Promise<WebhookIngestResult> => {
    const { tenantId, eventId, eventType, rawBody, signature, payload } = job.data;

    // ── 1. Idempotency via Redis SET NX ─────────────────────────────────────
    const idempotencyKey = `revolut:idempotency:${eventId}`;
    let setResult: string | null;

    try {
      setResult = await redis.set(idempotencyKey, "1", "EX", 86400, "NX");
    } catch (redisErr) {
      // Redis indisponibil → aruncă, BullMQ va face retry cu backoff 5s
      throw new Error(
        `[A1] Redis unavailable for idempotency check eventId=${eventId}: ${String(redisErr)}`,
        { cause: redisErr },
      );
    }

    if (setResult === null) {
      // Cheia exista deja → eveniment duplicat, skip
      e4RevolutWebhooksTotal.inc({ event_type: eventType, action: "skipped" });
      job.log(`[A1] Duplicate eventId=${eventId}, skipped`);
      return { ok: true, action: "skipped", reason: "duplicate", eventId };
    }

    // ── 2. Persistare revolut_webhooks_raw ──────────────────────────────────
    await setSessionTenantId(tenantId);
    const webhookId = uuidv4();

    await db.insert(revolutWebhooksRaw).values({
      id: webhookId,
      tenantId,
      eventType,
      payload,
      signature: signature || null,
      verified: false,
      idempotencyKey: eventId,
    });

    // ── 3. Enqueue A2 + A6 în paralel ───────────────────────────────────────
    const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? "4");

    const [a2Queue, a6Queue] = [
      createQueue(QUEUES.E4_REVOLUT_TRANSACTION_PROCESS, { db: REDIS_DB_E4 }),
      createQueue(QUEUES.E4_REVOLUT_WEBHOOK_VALIDATE, { db: REDIS_DB_E4 }),
    ];

    await Promise.all([
      a2Queue.add(
        "process",
        { webhookId, eventType, payload, tenantId },
        { jobId: `a2:${webhookId}` },
      ),
      a6Queue.add(
        "validate",
        { webhookId, rawBody, signature, tenantId },
        { jobId: `a6:${webhookId}` },
      ),
    ]);

    await Promise.allSettled([a2Queue.close(), a6Queue.close()]);

    e4RevolutWebhooksTotal.inc({ event_type: eventType, action: "ingested" });
    job.log(`[A1] Ingested webhookId=${webhookId} eventId=${eventId} eventType=${eventType}`);

    return { ok: true, action: "ingested", webhookId, eventType, eventId };
  };
}
