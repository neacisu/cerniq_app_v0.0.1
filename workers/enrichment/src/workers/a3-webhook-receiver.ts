import { createHmac, timingSafeEqual } from "node:crypto";
import type { Processor } from "bullmq";
import { bronzeWebhooks, db, setSessionTenantId } from "@cerniq/db";
import { insertBronzeRows, triggerNormalizationForContacts } from "./ingest-utils.js";

export type WebhookReceiverJobData = {
  tenantId: string;
  webhookId: string;
  webhookType: string;
  sourceIp?: string;
  headers?: Record<string, unknown>;
  payload: Record<string, unknown> | Array<Record<string, unknown>>;
  signatureHeader?: string;
  secret?: string;
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

export const webhookReceiverProcessor: Processor<WebhookReceiverJobData> = async (job) => {
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

  const { rowsInserted, insertedIds } = await insertBronzeRows(job.data.tenantId, rows, "webhook");
  await triggerNormalizationForContacts(job.data.tenantId, insertedIds, job.data.correlationId);
  return {
    ok: true,
    status: "processed",
    signatureValid: signatureValid || !job.data.signatureHeader,
    rowsInserted,
  };
};
