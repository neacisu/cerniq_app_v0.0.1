/**
 * e31-referral-reward-notify.ts — Worker E31: Referral Reward Notify (FAZA 9f Referral)
 *
 * Queue: referral:reward:notify (REDIS_DB_E5=5)
 * Timeout: 30s
 * Concurrency: 10
 *
 * Responsabilitate:
 *   - Verifică că recompensa a fost emisă (status=CONVERTED + rewardIssuedAt IS NOT NULL)
 *   - Înregistrează acțiunea REFERRAL_REWARD_NOTIFY în gold_nurturing_actions
 *   - Loghează detalii reward via job.log
 *
 * Anti-halucin. FAZA 9f:
 *   (A) GUARD: status != CONVERTED sau rewardIssuedAt IS NULL → return { ok: false }
 *   (B) NU trimite efectiv email — INSERT acțiune PENDING pentru downstream
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldReferrals,
  goldNurturingState,
  goldNurturingActions,
  sql,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ReferralRewardNotifyJobData {
  tenantId: string;
  referralId: string;
  correlationId?: string;
}

export interface ReferralRewardNotifyResult {
  ok: boolean;
  referralId?: string;
  notificationSent?: boolean;
  actionId?: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createReferralRewardNotifyWorker(): Worker {
  const { worker } = createWorker<ReferralRewardNotifyJobData>(
    "referral:reward:notify",
    async (job: Job<ReferralRewardNotifyJobData>): Promise<ReferralRewardNotifyResult> => {
      return withCognitiveSpan("e5:referral:reward-notify", async () => {
        const { tenantId, referralId } = job.data;

        job.log(`[E31] Reward notify: referralId=${referralId}, tenant=${tenantId}`);

        // ── 1. Set tenant session ──────────────────────────────────────────
        await setSessionTenantId(tenantId);

        // ── 2. SELECT goldReferrals ────────────────────────────────────────
        let referral: {
          id: string;
          referrerId: string;
          rewardType: string | null;
          rewardValue: string | null;
          rewardIssuedAt: Date | null;
          status: string;
        };

        try {
          const rows = await db
            .select({
              id: goldReferrals.id,
              referrerId: goldReferrals.referrerId,
              rewardType: goldReferrals.rewardType,
              rewardValue: goldReferrals.rewardValue,
              rewardIssuedAt: goldReferrals.rewardIssuedAt,
              status: goldReferrals.status,
            })
            .from(goldReferrals)
            .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)))
            .limit(1);

          if (rows.length === 0) {
            throw new Error(`[E31] Referral not found: referralId=${referralId}`);
          }

          referral = rows[0];
        } catch (err) {
          throw new Error(`[E31] Failed to fetch referral: ${(err as Error).message}`, {
            cause: err,
          });
        }

        // ── 3. GUARD: status CONVERTED + rewardIssuedAt NOT NULL ──────────
        if (referral.status !== "CONVERTED" || referral.rewardIssuedAt === null) {
          job.log(
            `[E31] Reward not ready (status=${referral.status}, rewardIssuedAt=${referral.rewardIssuedAt?.toISOString() ?? "null"})`,
          );
          return { ok: false, reason: "reward_not_issued" };
        }

        // ── 4. SELECT goldNurturingState WHERE leadId=referrerId ───────────
        let nurturingStateId: string;

        try {
          const stateRows = await db
            .select({ id: goldNurturingState.id })
            .from(goldNurturingState)
            .where(
              and(
                eq(goldNurturingState.tenantId, tenantId),
                eq(goldNurturingState.leadId, referral.referrerId),
              ),
            )
            .limit(1);

          if (stateRows.length === 0) {
            throw new Error(`[E31] NurturingState not found for referrerId=${referral.referrerId}`);
          }

          nurturingStateId = stateRows[0].id;
        } catch (err) {
          throw new Error(`[E31] Failed to fetch nurturing state: ${(err as Error).message}`, {
            cause: err,
          });
        }

        // ── 5. INSERT goldNurturingActions ─────────────────────────────────
        let actionId: string;

        try {
          const inserted = await db
            .insert(goldNurturingActions)
            .values({
              tenantId,
              nurturingStateId,
              actionType: "REFERRAL_REWARD_NOTIFY",
              channel: "EMAIL",
              status: "PENDING",
              executedAt: sql`NOW()`,
            })
            .returning({ id: goldNurturingActions.id });

          if (inserted.length === 0) {
            throw new Error("[E31] INSERT goldNurturingActions returned no rows");
          }

          actionId = inserted[0].id;
        } catch (err) {
          throw new Error(`[E31] Failed to insert nurturing action: ${(err as Error).message}`, {
            cause: err,
          });
        }

        // ── 6. Log detalii reward ──────────────────────────────────────────
        job.log(
          `[E31] Reward notify action created: actionId=${actionId}, referrerId=${referral.referrerId}, ` +
            `rewardType=${referral.rewardType ?? "N/A"}, rewardValue=${referral.rewardValue ?? "N/A"}, ` +
            `nurturingStateId=${nurturingStateId}`,
        );

        return {
          ok: true,
          referralId,
          notificationSent: true,
          actionId,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
    },
  );

  return worker;
}
