/**
 * B8 — payment:reconcile:fuzzy
 *
 * Responsabilitate (plan FAZA 8c §IX Tier 2):
 * - Fuzzy Match: pg_trgm similarity(goldCompanies.denumire, payment.counterpartyName)
 * - Threshold: similarity >= 0.85 AND ABS(total - amount) / total <= 5%
 * - Scor candidat: score = nameSimilarity * 0.6 + amountProximity * 0.4
 * - best_score >= 0.85 → auto-match (matchType='FUZZY_NAME_AMOUNT', confidence=score)
 * - 0.50 <= best_score < 0.85 → enqueue B9 cu candidați sortați
 * - best_score < 0.50 (sau 0 candidați) → enqueue B9 cu status UNMATCHED
 *
 * Anti-halucinare (A): EXCLUSIV pg_trgm — fără motor custom.
 * Anti-halucinare (B): Threshold 85%/5% conform planului.
 */
import type { Processor } from "bullmq";
import { createQueue, QUEUES } from "@cerniq/worker-shared";
import { setSessionTenantId } from "@cerniq/db";
import {
  loadPendingPayment,
  runTierTwoMatch,
  insertReconciliation,
  insertReconciliationAuditLog,
  TIER2_SCORE_MIN_CANDIDATE,
} from "../lib/reconciliation-engine.js";
import { e4ReconciliationDurationSeconds, e4ReconciliationTotal } from "../e4-metrics.js";

export type ReconcileFuzzyJobData = {
  paymentId: string;
  tenantId: string;
  paymentDetails?: {
    amount: string;
    currency: string;
    reference: string | null;
    counterpartyName: string | null;
  };
};

export type ReconcileFuzzyResult =
  | {
      ok: true;
      action: "matched_fuzzy";
      paymentId: string;
      orderId: string;
      score: number;
      reconciliationId: string;
    }
  | {
      ok: true;
      action: "enqueued_b9";
      paymentId: string;
      candidateCount: number;
      reason: "low_confidence" | "unmatched";
    }
  | { ok: true; action: "skipped"; paymentId: string; reason: "not_pending" };

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? "4");

export const paymentReconcileFuzzyProcessor: Processor<ReconcileFuzzyJobData> = async (
  job,
): Promise<ReconcileFuzzyResult> => {
  const { paymentId, tenantId } = job.data;
  const timerEnd = e4ReconciliationDurationSeconds.startTimer({
    match_type: "FUZZY_NAME_AMOUNT",
    tenant_id: tenantId,
  });

  await setSessionTenantId(tenantId);

  // ── 1. Idempotency ────────────────────────────────────────────────────────
  const payment = await loadPendingPayment(tenantId, paymentId);

  if (!payment) {
    timerEnd();
    job.log(`[B8] Payment ${paymentId} not found or already reconciled — skipped`);
    return { ok: true, action: "skipped", paymentId, reason: "not_pending" };
  }

  // ── 2. Tier 2 Fuzzy Match ────────────────────────────────────────────────
  const tier2 = await runTierTwoMatch(payment);

  // ── 3a. Auto-match score >= 0.85 ─────────────────────────────────────────
  if (tier2.autoMatch) {
    const reconciliationId = await insertReconciliation({
      tenantId,
      paymentId,
      orderId: tier2.orderId,
      matchType: "FUZZY_NAME_AMOUNT",
      confidence: tier2.score,
      matchedBy: "worker:b8-payment-reconcile-fuzzy",
    });

    await insertReconciliationAuditLog({
      tenantId,
      paymentId,
      orderId: tier2.orderId,
      eventType: "PAYMENT_MATCHED",
      matchType: "FUZZY_NAME_AMOUNT",
      confidence: tier2.score,
      reconciliationId,
    });

    const b10Queue = createQueue(QUEUES.E4_PAYMENT_BALANCE_UPDATE, { db: REDIS_DB_E4 });
    await b10Queue.add(
      "balance-update",
      { paymentId, orderId: tier2.orderId, tenantId, matchType: "FUZZY_NAME_AMOUNT" },
      { jobId: `b10:${paymentId}` },
    );
    await b10Queue.close();

    timerEnd();
    e4ReconciliationTotal.inc({
      match_type: "FUZZY_NAME_AMOUNT",
      result: "matched",
      tenant_id: tenantId,
    });
    job.log(
      `[B8] Fuzzy auto-match: payment=${paymentId} → order=${tier2.orderId} score=${tier2.score.toFixed(3)} reconciliation=${reconciliationId}`,
    );

    return {
      ok: true,
      action: "matched_fuzzy",
      paymentId,
      orderId: tier2.orderId,
      score: tier2.score,
      reconciliationId,
    };
  }

  // ── 3b. Candidați pentru B9 ───────────────────────────────────────────────
  const candidates = tier2.candidates;
  const firstCandidate = candidates[0];
  const hasCandidates =
    firstCandidate !== undefined && firstCandidate.score >= TIER2_SCORE_MIN_CANDIDATE;
  const b9Reason: "low_confidence" | "unmatched" = hasCandidates ? "low_confidence" : "unmatched";

  const b9Queue = createQueue(QUEUES.E4_PAYMENT_RECONCILE_MANUAL, { db: REDIS_DB_E4 });
  await b9Queue.add(
    "manual",
    {
      paymentId,
      tenantId,
      candidates: candidates.slice(0, 5), // top 5 candidați pentru HITL
      reason: b9Reason,
      paymentDetails: {
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.reference,
        counterpartyName: payment.counterpartyName,
        counterpartyIban: payment.counterpartyIban,
      },
    },
    { jobId: `b9:${paymentId}` },
  );
  await b9Queue.close();

  timerEnd();
  const metricResult =
    b9Reason === "unmatched" ? "enqueued_manual_unmatched" : "enqueued_manual_low_confidence";
  e4ReconciliationTotal.inc({
    match_type: "FUZZY_NAME_AMOUNT",
    result: metricResult,
    tenant_id: tenantId,
  });
  job.log(
    `[B8] No fuzzy match for payment=${paymentId} (reason: ${b9Reason}, candidates: ${candidates.length}) → B9`,
  );

  return {
    ok: true,
    action: "enqueued_b9",
    paymentId,
    candidateCount: candidates.length,
    reason: b9Reason,
  };
};
