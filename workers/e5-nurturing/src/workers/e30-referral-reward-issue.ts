/**
 * e30-referral-reward-issue.ts — Worker E30: Referral Reward Issue (FAZA 9f Referral)
 *
 * Queue: referral:reward:issue (REDIS_DB_E5=5)
 * Timeout: 30s
 * Concurrency: 10
 *
 * Responsabilitate:
 *   - Calculează recompensa pe baza referralType
 *   - UPDATE goldReferrals: rewardType, rewardValue, rewardIssuedAt=NOW()
 *   - Enqueue E31 (referral:reward:notify)
 *
 * Barème recompense (Plan FAZA 9f):
 *   EXPLICIT          → DISCOUNT_CODE 5.00%
 *   SOFT_MENTION      → STORE_CREDIT  2.00%
 *   NEIGHBOR_STRATEGY → DISCOUNT_CODE 3.00%
 *   GROUP_DEAL        → DISCOUNT_CODE 7.50%
 *
 * Anti-halucin. FAZA 9f:
 *   (A) GUARD: status != CONVERTED → return { ok: false, reason: 'not_converted' }
 *   (B) rewardValue stocat ca String conform schema numeric Drizzle
 */

import type { Job, Worker } from "bullmq";
import { db, goldReferrals, sql, eq, and, setSessionTenantId } from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Reward lookup — Anti-halucin.: valori exacte conform Plan FAZA 9f
// ---------------------------------------------------------------------------

const REWARD_MAP: Record<string, { rewardType: string; rewardValue: number }> = {
  EXPLICIT: { rewardType: "DISCOUNT_CODE", rewardValue: 5 },
  SOFT_MENTION: { rewardType: "STORE_CREDIT", rewardValue: 2 },
  NEIGHBOR_STRATEGY: { rewardType: "DISCOUNT_CODE", rewardValue: 3 },
  GROUP_DEAL: { rewardType: "DISCOUNT_CODE", rewardValue: 7.5 },
};

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ReferralRewardIssueJobData {
  tenantId: string;
  referralId: string;
  correlationId?: string;
}

export interface ReferralRewardIssueResult {
  ok: boolean;
  referralId?: string;
  rewardType?: string;
  rewardValue?: number;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createReferralRewardIssueWorker(): Worker {
  const rewardNotifyQueue = createQueue("referral:reward:notify", { db: 5 });

  const { worker } = createWorker<ReferralRewardIssueJobData>(
    "referral:reward:issue",
    async (job: Job<ReferralRewardIssueJobData>): Promise<ReferralRewardIssueResult> => {
      return withCognitiveSpan("e5:referral:reward-issue", async () => {
        const { tenantId, referralId, correlationId } = job.data;

        job.log(`[E30] Issuing reward: referralId=${referralId}, tenant=${tenantId}`);

        // ── 1. Set tenant session ──────────────────────────────────────────
        await setSessionTenantId(tenantId);

        // ── 2. SELECT goldReferrals ────────────────────────────────────────
        let referral: {
          id: string;
          referralType: string;
          status: string;
        };

        try {
          const rows = await db
            .select({
              id: goldReferrals.id,
              referralType: goldReferrals.referralType,
              status: goldReferrals.status,
            })
            .from(goldReferrals)
            .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)))
            .limit(1);

          if (rows.length === 0) {
            throw new Error(`[E30] Referral not found: referralId=${referralId}`);
          }

          referral = rows[0];
        } catch (err) {
          throw new Error(`[E30] Failed to fetch referral: ${(err as Error).message}`, {
            cause: err,
          });
        }

        // ── 3. GUARD: trebuie să fie CONVERTED ────────────────────────────
        if (referral.status !== "CONVERTED") {
          job.log(
            `[E30] Referral not converted (status=${referral.status}), skipping reward issue`,
          );
          return { ok: false, reason: "not_converted" };
        }

        // ── 4. Calcul reward pe baza referralType ──────────────────────────
        const reward = REWARD_MAP[referral.referralType];

        if (!reward) {
          throw new Error(
            `[E30] Unknown referralType: ${referral.referralType} for referralId=${referralId}`,
            { cause: new Error(`referralType=${referral.referralType}`) },
          );
        }

        const { rewardType, rewardValue } = reward;

        job.log(
          `[E30] Reward calculated: type=${rewardType}, value=${rewardValue}, referralType=${referral.referralType}`,
        );

        // ── 5. UPDATE goldReferrals ────────────────────────────────────────
        try {
          await db
            .update(goldReferrals)
            .set({
              rewardType,
              rewardValue: String(rewardValue),
              rewardIssuedAt: sql`NOW()`,
              updatedAt: sql`NOW()`,
            })
            .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)));
        } catch (err) {
          throw new Error(`[E30] Failed to update reward fields: ${(err as Error).message}`, {
            cause: err,
          });
        }

        // ── 6. Enqueue E31 reward:notify ───────────────────────────────────
        try {
          await rewardNotifyQueue.add(
            "reward-notify",
            { tenantId, referralId, correlationId },
            { jobId: `reward-notify-${referralId}-${Date.now()}` },
          );
        } catch (err) {
          throw new Error(`[E30] Failed to enqueue E31 reward-notify: ${(err as Error).message}`, {
            cause: err,
          });
        }

        job.log(
          `[E30] Done: reward issued referralId=${referralId}, rewardType=${rewardType}, rewardValue=${rewardValue}`,
        );

        return { ok: true, referralId, rewardType, rewardValue };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
    },
  );

  return worker;
}
