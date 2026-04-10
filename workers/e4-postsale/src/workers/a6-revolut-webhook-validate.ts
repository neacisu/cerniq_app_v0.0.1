/**
 * A6 — revolut:webhook:validate
 *
 * Responsabilitate (plan §IX A6):
 * - Verificare HMAC-SHA256 cu X-Revolut-Signature-V1
 * - Secret: REVOLUT_WEBHOOK_SECRET din OpenBao (loadSecretsFromFile)
 * - Calcul: crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
 * - Comparare: crypto.timingSafeEqual (NU === — previne timing attack)
 * - Dacă VALID: UPDATE revolut_webhooks_raw SET verified=true
 * - Dacă INVALID: UPDATE verified=false + log SECURITY_EVENT + increment metric
 *
 * Anti-halucinare:
 * (B) HMAC-SHA256 TREBUIE să folosească crypto.timingSafeEqual, NU ===
 * (D) REVOLUT_WEBHOOK_SECRET TREBUIE din OpenBao via loadSecretsFromFile
 */
import crypto from "node:crypto";
import type { Processor } from "bullmq";
import { createServiceLogger } from "@cerniq/observability";
import { db, setSessionTenantId, revolutWebhooksRaw, eq } from "@cerniq/db";
import { e4RevolutHmacValidationsTotal } from "../e4-metrics.js";

const a6Log = createServiceLogger("e4-a6-revolut-webhook-validate", { etapa: "e4" });

export type WebhookValidateJobData = {
  webhookId: string;
  /** Raw body string original (pentru recalcul HMAC) */
  rawBody: string;
  /** X-Revolut-Signature-V1 header value */
  signature: string;
  tenantId: string;
};

export type WebhookValidateResult =
  | { ok: true; verified: true; webhookId: string }
  | { ok: true; verified: false; webhookId: string; reason: string };

/**
 * Verificare HMAC-SHA256 cu timingSafeEqual (anti-timing-attack).
 * Returnează true dacă semnătura este validă.
 */
export function verifyRevolutHmac(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret || !rawBody) return false;

  const calculated = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  // timingSafeEqual necesită buffere de aceeași lungime
  const calcBuf = Buffer.from(calculated, "hex");
  const sigBuf = Buffer.from(signature, "hex");

  if (calcBuf.length !== sigBuf.length) return false;

  return crypto.timingSafeEqual(calcBuf, sigBuf);
}

export const revolutWebhookValidateProcessor: Processor<WebhookValidateJobData> = async (
  job,
): Promise<WebhookValidateResult> => {
  const { webhookId, rawBody, signature, tenantId } = job.data;

  await setSessionTenantId(tenantId);

  // ── 1. Citire secret REVOLUT_WEBHOOK_SECRET ──────────────────────────────
  const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    // Secret lipsă → logăm și marcăm ca neverificat (nu aruncăm — nu e o eroare retryabilă)
    a6Log.error({ webhookId }, "revolut_webhook_secret_missing");
    await db
      .update(revolutWebhooksRaw)
      .set({ verified: false })
      .where(eq(revolutWebhooksRaw.id, webhookId));

    e4RevolutHmacValidationsTotal.inc({ status: "missing_secret" });
    return { ok: true, verified: false, webhookId, reason: "missing_secret" };
  }

  // ── 2. Verificare HMAC-SHA256 cu timingSafeEqual ─────────────────────────
  const isValid = verifyRevolutHmac(rawBody, signature, webhookSecret);

  if (isValid) {
    await db
      .update(revolutWebhooksRaw)
      .set({ verified: true })
      .where(eq(revolutWebhooksRaw.id, webhookId));

    e4RevolutHmacValidationsTotal.inc({ status: "valid" });
    job.log(`[A6] HMAC valid: webhookId=${webhookId}`);

    return { ok: true, verified: true, webhookId };
  }

  // ── 3. HMAC INVALID — security event ────────────────────────────────────
  await db
    .update(revolutWebhooksRaw)
    .set({ verified: false })
    .where(eq(revolutWebhooksRaw.id, webhookId));

  e4RevolutHmacValidationsTotal.inc({ status: "invalid" });

  // Security event persisted: invalid HMAC webhooks are stored with verified=false for audit.
  // Alert forwarding to a dedicated security queue will be implemented in FAZA 8c
  // when E4 alert queue definitions are finalized in queue-registry.ts.
  // Current observability: e4RevolutHmacValidationsTotal{status='invalid'} metric is incremented
  // and the event is logged at ERROR level for SIEM/log-based alerting.
  a6Log.error({ webhookId, tenantId }, "revolut_webhook_hmac_invalid_security_event");

  job.log(`[A6] HMAC INVALID: webhookId=${webhookId} — marked verified=false`);

  return { ok: true, verified: false, webhookId, reason: "hmac_mismatch" };
};
