import { createHmac, timingSafeEqual } from "node:crypto";
import type { Processor } from "bullmq";
import { bronzeWebhooks, db, setSessionTenantId } from "@cerniq/db";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { insertBronzeRows, triggerNormalizationForContacts } from "./ingest-utils.js";

// GAP-B8: Max payload size (10 MB)
const MAX_PAYLOAD_SIZE_BYTES = 10 * 1024 * 1024;
// GAP-B7: Max age for replay protection (5 minutes)
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

export type WebhookReceiverJobData = {
  tenantId: string;
  webhookId: string;
  webhookType: string;
  sourceIp?: string;
  headers?: Record<string, unknown>;
  payload: Record<string, unknown> | Array<Record<string, unknown>>;
  signatureHeader?: string;
  secret?: string;
  timestamp?: number;
  correlationId: string;
};

function validateSignature(data: WebhookReceiverJobData): boolean {
  if (!data.signatureHeader || !data.secret) return false;
  const expected = createHmac("sha256", data.secret)
    .update(JSON.stringify(data.payload))
    .digest("hex");
  const given = data.signatureHeader.replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected);
  const givenBuffer = Buffer.from(given);
  return (
    expectedBuffer.length === givenBuffer.length && timingSafeEqual(expectedBuffer, givenBuffer)
  );
}

function validateTimestamp(data: WebhookReceiverJobData): boolean {
  if (!data.timestamp) return true; // no timestamp provided = skip check
  const age = Math.abs(Date.now() - data.timestamp);
  return age <= MAX_TIMESTAMP_AGE_MS;
}

function validatePayloadSize(data: WebhookReceiverJobData): boolean {
  const serialized = JSON.stringify(data.payload);
  return Buffer.byteLength(serialized, "utf8") <= MAX_PAYLOAD_SIZE_BYTES;
}

export const webhookReceiverProcessor: Processor<WebhookReceiverJobData> = async (job) => {
  const startedAt = Date.now();
  try {
    // GAP-B8: Reject oversized payloads
    if (!validatePayloadSize(job.data)) {
      await setSessionTenantId(job.data.tenantId);
      await db.insert(bronzeWebhooks).values({
        tenantId: job.data.tenantId,
        webhookType: job.data.webhookType,
        sourceIp: job.data.sourceIp,
        requestHeaders: job.data.headers ?? {},
        requestBody: {},
        signatureHeader: job.data.signatureHeader,
        signatureValid: false,
        processingStatus: "rejected",
        metadata: { source: "a3-webhook-receiver", reason: "payload_too_large" },
      });
      return { ok: false, status: "rejected", reason: "payload_too_large" };
    }

    // GAP-B7: Reject replayed webhooks (stale timestamp)
    if (!validateTimestamp(job.data)) {
      await setSessionTenantId(job.data.tenantId);
      await db.insert(bronzeWebhooks).values({
        tenantId: job.data.tenantId,
        webhookType: job.data.webhookType,
        sourceIp: job.data.sourceIp,
        requestHeaders: job.data.headers ?? {},
        requestBody: job.data.payload,
        signatureHeader: job.data.signatureHeader,
        signatureValid: false,
        processingStatus: "rejected",
        metadata: { source: "a3-webhook-receiver", reason: "stale_timestamp" },
      });
      return { ok: false, status: "rejected", reason: "stale_timestamp" };
    }

    const signatureValid = validateSignature(job.data);
    if (job.data.signatureHeader && !signatureValid) {
      await setSessionTenantId(job.data.tenantId);
      await db.insert(bronzeWebhooks).values({
        tenantId: job.data.tenantId,
        webhookType: job.data.webhookType,
        sourceIp: job.data.sourceIp,
        requestHeaders: job.data.headers ?? {},
        requestBody: job.data.payload,
        signatureHeader: job.data.signatureHeader,
        signatureValid: false,
        processingStatus: "rejected",
        metadata: { source: "a3-webhook-receiver", reason: "invalid_signature" },
      });
      return { ok: false, status: "rejected", reason: "invalid_signature" };
    }

    const rows = Array.isArray(job.data.payload) ? job.data.payload : [job.data.payload];

    await setSessionTenantId(job.data.tenantId);
    await db.insert(bronzeWebhooks).values({
      tenantId: job.data.tenantId,
      webhookType: job.data.webhookType,
      sourceIp: job.data.sourceIp,
      requestHeaders: job.data.headers ?? {},
      requestBody: job.data.payload,
      signatureHeader: job.data.signatureHeader,
      signatureValid,
      processingStatus: "processing",
      metadata: { source: "a3-webhook-receiver" },
    });

    const { rowsInserted, insertedIds } = await insertBronzeRows(
      job.data.tenantId,
      rows,
      "webhook",
    );
    await triggerNormalizationForContacts(job.data.tenantId, insertedIds, job.data.correlationId);
    jobsProcessed.add(1, { worker: "a3-webhook-receiver", status: "success" });
    jobDuration.record(Date.now() - startedAt, { worker: "a3-webhook-receiver" });
    await job.updateProgress(100);
    return {
      ok: true,
      status: "processed",
      signatureValid: signatureValid || !job.data.signatureHeader,
      rowsInserted,
    };
  } catch (error) {
    jobErrors.add(1, { worker: "a3-webhook-receiver" });
    throw error;
  }
};
