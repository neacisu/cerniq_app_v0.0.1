/**
 * e29-referral-tracking-conversion.ts — Worker E29: Referral Tracking Conversion (FAZA 9f Referral)
 *
 * Queue: referral:tracking:conversion (REDIS_DB_E5=5)
 * Timeout: 60s
 * Concurrency: 5
 *
 * Responsabilitate:
 *   - Verifică periodic (max 4×, delay 7 zile = 28 zile total) dacă referralul s-a convertit
 *   - Conversie = referredId are goldNurturingState cu totalOrders > 0
 *   - La conversie: UPDATE status='CONVERTED', increment successfulReferrals referrer, enqueue E30
 *   - La expirare: UPDATE status='EXPIRED'
 *
 * Anti-halucin. FAZA 9f:
 *   (A) checkCount max 4 → 28 zile total tracking
 *   (B) Conversie verificată prin totalOrders > 0 în goldNurturingState
 *   (C) successfulReferrals incrementat DOAR la conversie, NU la outreach (E28)
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldReferrals,
  goldNurturingState,
  sql,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CHECK_COUNT = 4;

// ---------------------------------------------------------------------------
// Helper: verificare dacă referredId a plasat comenzi
// ---------------------------------------------------------------------------

async function hasReferredConverted(tenantId: string, referredId: string): Promise<boolean> {
  const rows = await db
    .select({ totalOrders: goldNurturingState.totalOrders })
    .from(goldNurturingState)
    .where(
      and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, referredId)),
    )
    .limit(1);

  return rows.length > 0 && rows[0].totalOrders > 0;
}

// ---------------------------------------------------------------------------
// Helper: actualizare DB la conversie
// ---------------------------------------------------------------------------

async function markConverted(
  tenantId: string,
  referralId: string,
  referrerId: string,
): Promise<void> {
  await db
    .update(goldReferrals)
    .set({ status: "CONVERTED", updatedAt: sql`NOW()` })
    .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)));

  await db
    .update(goldNurturingState)
    .set({
      successfulReferrals: sql`${goldNurturingState.successfulReferrals} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(
      and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, referrerId)),
    );
}

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ReferralTrackingConversionJobData {
  tenantId: string;
  referralId: string;
  checkCount?: number;
  correlationId?: string;
}

export interface ReferralTrackingConversionResult {
  ok: boolean;
  referralId: string;
  status?: string;
  converted: boolean;
  expired: boolean;
  checksRemaining?: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createReferralTrackingConversionWorker(): Worker {
  const rewardIssueQueue = createQueue("referral:reward:issue", { db: 5 });
  const selfQueue = createQueue("referral:tracking:conversion", { db: 5 });

  const { worker } = createWorker<ReferralTrackingConversionJobData>(
    "referral:tracking:conversion",
    async (
      job: Job<ReferralTrackingConversionJobData>,
    ): Promise<ReferralTrackingConversionResult> => {
      return withCognitiveSpan("e5:referral:tracking-conversion", async () => {
        const { tenantId, referralId, correlationId } = job.data;
        const checkCount = job.data.checkCount ?? 0;

        job.log(
          `[E29] Checking conversion: referralId=${referralId}, checkCount=${checkCount}, tenant=${tenantId}`,
        );

        await setSessionTenantId(tenantId);

        // ── 2. SELECT goldReferrals ────────────────────────────────────────
        const rows = await db
          .select({
            id: goldReferrals.id,
            status: goldReferrals.status,
            referredId: goldReferrals.referredId,
            referrerId: goldReferrals.referrerId,
            expiresAt: goldReferrals.expiresAt,
          })
          .from(goldReferrals)
          .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)))
          .limit(1);

        if (rows.length === 0) {
          throw new Error(`[E29] Referral not found: referralId=${referralId}`);
        }

        const referral = rows[0];

        // ── 3. GUARD: status != ACTIVE ─────────────────────────────────────
        if (referral.status !== "ACTIVE") {
          job.log(`[E29] Referral not active (status=${referral.status}), skipping`);
          return {
            ok: true,
            referralId,
            status: referral.status,
            converted: false,
            expired: false,
          };
        }

        // ── 4. Verificare expirare ─────────────────────────────────────────
        if (referral.expiresAt < new Date()) {
          job.log(`[E29] Referral expired (expiresAt=${referral.expiresAt.toISOString()})`);
          await db
            .update(goldReferrals)
            .set({ status: "EXPIRED", updatedAt: sql`NOW()` })
            .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)));
          return { ok: true, referralId, status: "EXPIRED", converted: false, expired: true };
        }

        // ── 5. Verificare conversie ────────────────────────────────────────
        const converted =
          referral.referredId !== null &&
          (await hasReferredConverted(tenantId, referral.referredId).catch((err) => {
            throw new Error(
              `[E29] Failed to check referred nurturing state: ${(err as Error).message}`,
              { cause: err },
            );
          }));

        // ── 6. La conversie: UPDATE + enqueue E30 ─────────────────────────
        if (converted) {
          job.log(`[E29] Referral CONVERTED: referralId=${referralId}`);
          await markConverted(tenantId, referralId, referral.referrerId);
          await rewardIssueQueue.add(
            "reward-issue",
            { tenantId, referralId, correlationId },
            { jobId: `reward-issue-${referralId}-${Date.now()}` },
          );
          return { ok: true, referralId, status: "CONVERTED", converted: true, expired: false };
        }

        // ── 7. Re-enqueue dacă checkCount < MAX_CHECK_COUNT ───────────────
        if (checkCount < MAX_CHECK_COUNT) {
          const nextCheckCount = checkCount + 1;
          await selfQueue.add(
            "tracking-conversion",
            { tenantId, referralId, checkCount: nextCheckCount, correlationId },
            {
              delay: SEVEN_DAYS_MS,
              jobId: `track-conv-${referralId}-${nextCheckCount}-${Date.now()}`,
            },
          );
          job.log(
            `[E29] Not converted, re-enqueue in 7d: checkCount=${nextCheckCount}/${MAX_CHECK_COUNT}`,
          );
        } else {
          job.log(`[E29] Max checks reached (${MAX_CHECK_COUNT}), no more re-enqueues`);
        }

        return {
          ok: true,
          referralId,
          converted: false,
          expired: false,
          checksRemaining: MAX_CHECK_COUNT - checkCount,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
