/**
 * c17-credit-score-calculate.ts — Worker C17: Calculare scor credit 100p
 *
 * Parent job în FlowProducer (C13 dispatchează). Se execută AUTOMAT după
 * ce C14 + C15 + C16 au completat cu succes (BullMQ FlowProducer guarantee).
 *
 * FLUX:
 * 1. Citește rezultatele C14/C15/C16 via job.getChildrenValues()
 * 2. Calculează payment history din DB (gold_orders pe clientId)
 * 3. Aplică formula deterministă 100p (credit-scoring-engine.ts)
 * 4. UPDATE gold_credit_profiles cu scor + componente + risk tier
 * 5. INSERT gold_credit_scores (log istoric)
 * 6. Enqueue C18 (credit:limit:calculate)
 *
 * Anti-halucinare: scoring DETERMINIST — NU LLM/AI.
 * Plan FAZA 8d §IX L2055.
 */
import type { Processor } from "bullmq";
import { QUEUES, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import {
  db,
  goldCreditProfiles,
  goldCreditScores,
  goldOrders,
  setSessionTenantId,
  eq,
  and,
  isNull,
  inArray,
} from "@cerniq/db";
import { calculateCreditScore, type PaymentHistoryInput } from "../lib/credit-scoring-engine.js";
import type { AnafCreditData } from "../lib/anaf-client.js";
import type { TermeneBilantParsed, TermeneDosareParsed } from "../lib/termene-client.js";
import {
  e4CreditScoringDurationSeconds,
  e4CreditScoreCalculatedTotal,
  e4CreditScoreDistribution,
} from "../e4-metrics.js";
import { runCreditBorderlineConsensusIfNeeded } from "../lib/credit-consensus-advisory.js";

const REDIS_DB_E4 = Number(process.env.REDIS_DB_E4 ?? process.env.REDIS_DB ?? "4");

export type CreditScoreCalculateJobData = {
  tenantId: string;
  clientId: string;
  cui: string;
  profileId: string;
  correlationId?: string;
};

const DEFAULT_BILANT: TermeneBilantParsed = { years: [] };
const DEFAULT_DOSARE: TermeneDosareParsed = {
  proceduri_insolventa_active: 0,
  proceduri_insolventa_inchise: 0,
  dosare_parat_active: 0,
  dosare_parat_inactive: 0,
};
const DEFAULT_ANAF: AnafCreditData = {
  isActivFiscal: false,
  isTvaActiv: false,
  stareInregistrare: "UNKNOWN",
};

export const creditScoreCalculateProcessor: Processor<CreditScoreCalculateJobData> = async (
  job,
) => {
  return withCognitiveSpan(
    "e4:credit:score:calculate",
    async (_span) => {
      const { tenantId, clientId, profileId } = job.data;
      const startedAt = Date.now();
      await setSessionTenantId(tenantId);

      // ── 1. Citire rezultate copii C14/C15/C16 ─────────────────────────────
      const childrenValues = await job.getChildrenValues<{
        ok: boolean;
        anafData?: AnafCreditData | null;
        bilantData?: TermeneBilantParsed;
        bpiData?: TermeneDosareParsed;
      }>();

      let anafData: AnafCreditData = DEFAULT_ANAF;
      let bilantData: TermeneBilantParsed = DEFAULT_BILANT;
      let dosareData: TermeneDosareParsed = DEFAULT_DOSARE;

      for (const result of Object.values(childrenValues)) {
        if (!result?.ok) continue;
        if (result.anafData !== undefined) {
          anafData = result.anafData ?? DEFAULT_ANAF;
        }
        if (result.bilantData !== undefined) {
          bilantData = result.bilantData ?? DEFAULT_BILANT;
        }
        if (result.bpiData !== undefined) {
          dosareData = result.bpiData ?? DEFAULT_DOSARE;
        }
      }

      // ── 2. Payment history din DB ──────────────────────────────────────────
      const history = await loadPaymentHistory(tenantId, clientId);

      // ── 3. Calculare scor determinist ─────────────────────────────────────
      const result = calculateCreditScore(anafData, bilantData, dosareData, history);

      // ── 4. UPDATE gold_credit_profiles ────────────────────────────────────
      await db
        .update(goldCreditProfiles)
        .set({
          creditScore: result.score,
          riskTier: result.riskTier,
          scoreComponents: result.components as unknown as Record<string, unknown>,
          nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(goldCreditProfiles.id, profileId));

      // ── 5. INSERT log credit scores ───────────────────────────────────────
      await db.insert(goldCreditScores).values({
        profileId,
        score: result.score,
        riskTier: result.riskTier,
        scoreComponents: result.components as unknown as Record<string, unknown>,
        source: "c17:auto",
      });

      // ── 6. Enqueue C18 ────────────────────────────────────────────────────
      const creditLimitQueue = createQueue(QUEUES.E4_CREDIT_LIMIT_CALCULATE, { db: REDIS_DB_E4 });
      await creditLimitQueue.add(
        "credit:limit:calculate",
        {
          tenantId,
          clientId,
          profileId,
          riskTier: result.riskTier,
          creditLimit: result.creditLimit,
          correlationId: job.data.correlationId,
        },
        { jobId: `c18:${profileId}:${Date.now()}` },
      );
      await creditLimitQueue.close();

      // ── Metrici ───────────────────────────────────────────────────────────
      const durationSec = (Date.now() - startedAt) / 1000;
      e4CreditScoringDurationSeconds.observe({ tenant_id: tenantId }, durationSec);
      e4CreditScoreCalculatedTotal.inc({ risk_tier: result.riskTier, tenant_id: tenantId });
      e4CreditScoreDistribution.inc({ tenant_id: tenantId, risk_tier: result.riskTier });

      console.info(
        `[C17] Score calculated: profileId=${profileId}, score=${result.score}, tier=${result.riskTier}, limit=${result.creditLimit} RON`,
      );

      void runCreditBorderlineConsensusIfNeeded({
        tenantId,
        clientId,
        profileId,
        creditScore: result.score,
      }).catch((err) => console.warn("[C17] credit consensus advisory failed", err));

      return {
        ok: true,
        profileId,
        score: result.score,
        riskTier: result.riskTier,
        creditLimit: result.creditLimit,
        components: result.components,
      };
    },
    { tenantId: job.data.tenantId },
  );
};

async function loadPaymentHistory(
  tenantId: string,
  clientId: string,
): Promise<PaymentHistoryInput> {
  const paidStatuses = ["PAID", "PARTIALLY_PAID", "INVOICED"] as const;

  const rows = await db
    .select({
      id: goldOrders.id,
      amountPaid: goldOrders.amountPaid,
      totalAmount: goldOrders.totalAmount,
      paymentDueAt: goldOrders.paymentDueAt,
      status: goldOrders.status,
      createdAt: goldOrders.createdAt,
    })
    .from(goldOrders)
    .where(
      and(
        eq(goldOrders.tenantId, tenantId),
        eq(goldOrders.leadId, clientId),
        isNull(goldOrders.deletedAt),
        inArray(goldOrders.status, [...paidStatuses]),
      ),
    )
    .limit(1000);

  if (rows.length === 0) {
    return { totalOrders: 0, onTimeOrders: 0 };
  }

  const paidOrders = rows.filter(
    (r) => r.status === "PAID" || Number(r.amountPaid) >= Number(r.totalAmount) * 0.99,
  );

  const onTimeOrders = paidOrders.filter((r) => {
    if (!r.paymentDueAt) return true;
    return new Date(r.createdAt) <= new Date(r.paymentDueAt);
  }).length;

  return {
    totalOrders: paidOrders.length,
    onTimeOrders,
  };
}
