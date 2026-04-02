/**
 * B7 — payment:reconcile:auto
 *
 * Responsabilitate (plan FAZA 8c §IX Tier 1):
 * - Tier 1 Exact Match: orderNumber ILIKE payment.reference AND ABS(total - amount) <= 0.01 RON
 * - 1 match → INSERT gold_payment_reconciliations + UPDATE gold_payments + enqueue B10
 * - 0 matches → enqueue B8 (fuzzy)
 * - >1 matches → enqueue B9 (manual HITL) cu candidați
 *
 * Anti-halucinare (D): NU procesează plăți cu reconciliationStatus != 'PENDING' (idempotency).
 * Anti-halucinare (A): referința din plan = goldOrders.orderNumber (nu un câmp `reference`).
 */
import type { Processor } from "bullmq";
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import { setSessionTenantId } from "@cerniq/db";
import {
  loadPendingPayment,
  runTierOneMatch,
  insertReconciliation,
  insertReconciliationAuditLog,
} from "../lib/reconciliation-engine.js";
import { e4ReconciliationDurationSeconds, e4ReconciliationTotal } from "../e4-metrics.js";

export type ReconcileAutoJobData = {
  paymentId: string;
  tenantId: string;
  externalId?: string;
  amount?: number;
  currency?: string;
};

export type ReconcileAutoResult =
  | {
      ok: true;
      action: "matched_exact";
      paymentId: string;
      orderId: string;
      reconciliationId: string;
    }
  | { ok: true; action: "enqueued_b8"; paymentId: string; reason: "no_reference" | "no_match" }
  | {
      ok: true;
      action: "enqueued_b9";
      paymentId: string;
      reason: "multiple_matches";
      candidateCount: number;
    }
  | { ok: true; action: "skipped"; paymentId: string; reason: "not_pending" };

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? "4");

export const paymentReconcileAutoProcessor: Processor<ReconcileAutoJobData> = async (
  job,
): Promise<ReconcileAutoResult> => {
  const { paymentId, tenantId } = job.data;
  const timerEnd = e4ReconciliationDurationSeconds.startTimer({
    match_type: "EXACT_REFERENCE",
    tenant_id: tenantId,
  });

  await setSessionTenantId(tenantId);

  // ── 1. Idempotency: verifică că plata este PENDING ────────────────────────
  const payment = await loadPendingPayment(tenantId, paymentId);

  if (!payment) {
    timerEnd();
    job.log(`[B7] Payment ${paymentId} not found or already reconciled — skipped`);
    return { ok: true, action: "skipped", paymentId, reason: "not_pending" };
  }

  // ── 2. Tier 1 Exact Match ────────────────────────────────────────────────
  const tier1 = await runTierOneMatch(payment);

  // ── 3a. 1 match exact ───────────────────────────────────────────────────
  if (tier1.matched) {
    const reconciliationId = await insertReconciliation({
      tenantId,
      paymentId,
      orderId: tier1.orderId,
      matchType: "EXACT_REFERENCE",
      confidence: 1,
      matchedBy: "worker:b7-payment-reconcile-auto",
    });

    await insertReconciliationAuditLog({
      tenantId,
      paymentId,
      orderId: tier1.orderId,
      eventType: "PAYMENT_MATCHED",
      matchType: "EXACT_REFERENCE",
      confidence: 1,
      reconciliationId,
    });

    // Enqueue B10 pentru actualizare sold comandă
    const b10Queue = createQueue(QUEUES.E4_PAYMENT_BALANCE_UPDATE, { db: REDIS_DB_E4 });
    await b10Queue.add(
      "balance-update",
      { paymentId, orderId: tier1.orderId, tenantId, matchType: "EXACT_REFERENCE" },
      { jobId: `b10:${paymentId}` },
    );
    await b10Queue.close();

    timerEnd();
    e4ReconciliationTotal.inc({
      match_type: "EXACT_REFERENCE",
      result: "matched",
      tenant_id: tenantId,
    });
    job.log(
      `[B7] Exact match: payment=${paymentId} → order=${tier1.orderId} reconciliation=${reconciliationId}`,
    );

    return {
      ok: true,
      action: "matched_exact",
      paymentId,
      orderId: tier1.orderId,
      reconciliationId,
    };
  }

  // ── 3b. >1 matches → enqueue B9 manual ───────────────────────────────────
  if (tier1.multipleMatches && tier1.candidates.length > 1) {
    const b9Queue = createQueue(QUEUES.E4_PAYMENT_RECONCILE_MANUAL, { db: REDIS_DB_E4 });
    await b9Queue.add(
      "manual",
      {
        paymentId,
        tenantId,
        candidates: tier1.candidates,
        reason: "multiple_exact_matches",
        paymentDetails: {
          amount: payment.amount,
          currency: payment.currency,
          reference: payment.reference,
          counterpartyName: payment.counterpartyName,
        },
      },
      { jobId: `b9:${paymentId}` },
    );
    await b9Queue.close();

    timerEnd();
    e4ReconciliationTotal.inc({
      match_type: "EXACT_REFERENCE",
      result: "enqueued_manual",
      tenant_id: tenantId,
    });
    job.log(
      `[B7] Multiple exact matches (${tier1.candidates.length}) for payment=${paymentId} → B9`,
    );

    return {
      ok: true,
      action: "enqueued_b9",
      paymentId,
      reason: "multiple_matches",
      candidateCount: tier1.candidates.length,
    };
  }

  // ── 3c. 0 matches → enqueue B8 fuzzy ─────────────────────────────────────
  const b8Queue = createQueue(QUEUES.E4_PAYMENT_RECONCILE_FUZZY, { db: REDIS_DB_E4 });
  const b8Reason =
    !payment.reference || payment.reference.trim() === "" ? "no_reference" : "no_match";

  await b8Queue.add(
    "fuzzy",
    {
      paymentId,
      tenantId,
      paymentDetails: {
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.reference,
        counterpartyName: payment.counterpartyName,
      },
    },
    { jobId: `b8:${paymentId}` },
  );
  await b8Queue.close();

  timerEnd();
  e4ReconciliationTotal.inc({
    match_type: "EXACT_REFERENCE",
    result: "enqueued_fuzzy",
    tenant_id: tenantId,
  });
  job.log(`[B7] No exact match for payment=${paymentId} → B8 (reason: ${b8Reason})`);

  return { ok: true, action: "enqueued_b8", paymentId, reason: b8Reason };
};
