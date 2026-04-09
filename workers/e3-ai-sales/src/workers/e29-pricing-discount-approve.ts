/**
 * E29 — pricing:discount:approve (concurrency:5) CRITICAL HITL
 *
 * Matrice aprobare discount:
 *   ≤15%      → AUTO-APPROVE (enqueue E28 direct)
 *   15%-30%   → HITL manager SLA 4h
 *   30%-50%   → HITL director SLA 24h + CONSENSUS VOTING STUB
 *   >50%      → REJECTED automat
 *   >92%      → throw (absolute hard limit: 100 - min_margin_pct=8%)
 */
import type { Processor } from "bullmq";
import { z } from "zod";
import { db, setSessionTenantId, sql } from "@cerniq/db";
import {
  buildDefaultConsensusModelRunners,
  consensusStructuredVote,
  createQueue,
  DEFAULT_JOB_OPTIONS,
  QUEUES,
  shouldTriggerLlmConsensusVote,
} from "@cerniq/worker-shared";

const LOG = "[e29-pricing-discount-approve]";

export interface PricingDiscountApproveJobData {
  tenantId: string;
  negotiationId: string;
  negotiationItemId: string;
  productId: string;
  requestedDiscountPct: number;
  requestedBy: string;
  quantity: number;
  unitPrice: number;
}

export type PricingDiscountApproveResult =
  | { ok: true; decision: "REJECTED"; reason: string }
  | { ok: true; decision: "AUTO_APPROVED"; discountPct: number }
  | { ok: true; decision: "PENDING_MANAGER_APPROVAL"; sla: string }
  | { ok: true; decision: "PENDING_DIRECTOR_APPROVAL_CONSENSUS"; sla: string };

const ABSOLUTE_MAX_DISCOUNT = 92; // 100 - min_margin_pct(8%)

export const pricingDiscountApproveProcessor: Processor<
  PricingDiscountApproveJobData,
  PricingDiscountApproveResult
> = async (job) => {
  const {
    tenantId,
    negotiationId,
    negotiationItemId,
    productId,
    requestedDiscountPct,
    requestedBy,
  } = job.data;

  await setSessionTenantId(tenantId);

  // Verificare HARD LIMIT absolut (100 - min_margin_pct=8%)
  if (requestedDiscountPct > ABSOLUTE_MAX_DISCOUNT) {
    throw new Error(
      `e29: Discount ${requestedDiscountPct}% depășește limita absolută ${ABSOLUTE_MAX_DISCOUNT}% (min_margin=8%)`,
    );
  }

  // Verificare via SQL function (cascade reguli)
  const execResult = await db.execute(
    sql`SELECT gold.get_max_discount(${tenantId}::uuid, ${productId}::uuid)`,
  );
  const execRows = (execResult as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  const maxAllowed = Number.parseFloat(String(execRows[0]?.get_max_discount ?? "0"));
  console.info(
    `${LOG} productId=${productId} requestedDiscount=${requestedDiscountPct}% maxAllowed=${maxAllowed}%`,
  );

  // Matrice aprobare
  if (requestedDiscountPct > 50) {
    console.info(`${LOG} REJECTED: discount=${requestedDiscountPct}% > 50%`);
    return { ok: true, decision: "REJECTED", reason: "Discount >50% respins automat" };
  }

  if (requestedDiscountPct <= 15) {
    const discountApplyQueue = createQueue(QUEUES.E3_PRICING_DISCOUNT_APPLY);
    await discountApplyQueue.add(
      QUEUES.E3_PRICING_DISCOUNT_APPLY,
      { tenantId, negotiationItemId, discountPct: requestedDiscountPct, appliedBy: requestedBy },
      { ...DEFAULT_JOB_OPTIONS, attempts: 3 },
    );
    await discountApplyQueue.close();
    console.info(`${LOG} AUTO_APPROVED discount=${requestedDiscountPct}%`);
    return { ok: true, decision: "AUTO_APPROVED", discountPct: requestedDiscountPct };
  }

  if (requestedDiscountPct <= 30) {
    const hitlQueue = createQueue(QUEUES.HITL_ESCALATION);
    await hitlQueue.add(
      "hitl:escalate",
      {
        discriminator: "discount-approval",
        level: "manager",
        sla: "4h",
        tenantId,
        negotiationItemId,
        requestedDiscountPct,
        requestedBy,
        negotiationId,
      },
      { ...DEFAULT_JOB_OPTIONS, attempts: 1 },
    );
    await hitlQueue.close();
    console.info(`${LOG} PENDING_MANAGER_APPROVAL discount=${requestedDiscountPct}%`);
    return { ok: true, decision: "PENDING_MANAGER_APPROVAL", sla: "4h" };
  }

  // 30% - 50%: HITL director + consensus (Plan §XIII) când discount > 30%
  let consensusDivergenceDetail: string | undefined;
  if (shouldTriggerLlmConsensusVote({ discountPct: requestedDiscountPct })) {
    const models = buildDefaultConsensusModelRunners();
    if (models.length >= 2) {
      const vote = await consensusStructuredVote({
        schema: z.object({ proceedDirectorReview: z.boolean() }),
        messages: [
          {
            role: "system",
            content:
              'Return ONLY JSON: {"proceedDirectorReview":true|false} for high B2B discount risk gate.',
          },
          {
            role: "user",
            content: `Requested discount ${requestedDiscountPct}% negotiationItemId=${negotiationItemId}. JSON only.`,
          },
        ],
        models,
        triggerLabel: "discount_gt_30",
        onDivergence: async (detail) => {
          consensusDivergenceDetail = detail;
        },
      });
      if (!vote.ok && vote.reason === "divergence" && consensusDivergenceDetail) {
        const divQueue = createQueue(QUEUES.HITL_ESCALATION);
        try {
          await divQueue.add(
            "hitl:escalate",
            {
              discriminator: "discount-consensus-divergence",
              tenantId,
              negotiationItemId,
              requestedDiscountPct,
              detail: consensusDivergenceDetail,
            },
            { ...DEFAULT_JOB_OPTIONS, attempts: 1 },
          );
        } finally {
          await divQueue.close();
        }
      }
    }
  }

  console.info(
    `[E29] PENDING_DIRECTOR discount=${requestedDiscountPct}% consensusDivergence=${Boolean(consensusDivergenceDetail)}`,
  );
  const hitlQueue = createQueue(QUEUES.HITL_ESCALATION);
  await hitlQueue.add(
    "hitl:escalate",
    {
      discriminator: "discount-approval",
      level: "director",
      sla: "24h",
      tenantId,
      negotiationItemId,
      requestedDiscountPct,
      requestedBy,
      negotiationId,
      consensusDivergenceDetail,
    },
    { ...DEFAULT_JOB_OPTIONS, attempts: 1 },
  );
  await hitlQueue.close();
  console.info(`${LOG} PENDING_DIRECTOR_APPROVAL_CONSENSUS discount=${requestedDiscountPct}%`);
  return { ok: true, decision: "PENDING_DIRECTOR_APPROVAL_CONSENSUS", sla: "24h" };
};
