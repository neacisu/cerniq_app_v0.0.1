/**
 * e28-referral-outreach-prospect.ts — Worker E28: Referral Outreach Prospect (FAZA 9f Referral)
 *
 * Queue: referral:outreach:prospect (REDIS_DB_E5=5)
 * Timeout: 30s
 * Concurrency: 10
 *
 * Responsabilitate:
 *   - Verifică consimțământul GDPR (status=ACTIVE + consentGiven=true) — Anti-halucin. A
 *   - Înregistrează acțiunea REFERRAL_OUTREACH în gold_nurturing_actions
 *   - Enqueue E29 (referral:tracking:conversion) cu delay 7 zile
 *
 * Anti-halucin. FAZA 9f:
 *   (A) GUARD GDPR critic: fără consent activ → throw, NU skip silențios
 *   (B) Delay conversie = 7*24*60*60*1000 ms exact
 *   (C) NU incrementăm successfulReferrals la outreach — doar la conversie (E29)
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
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ReferralOutreachProspectJobData {
  tenantId: string;
  referralId: string;
  correlationId?: string;
}

export interface ReferralOutreachProspectResult {
  ok: boolean;
  referralId: string;
  outreachSent: boolean;
  actionId: string;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createReferralOutreachProspectWorker(): Worker {
  const trackingConversionQueue = createQueue("referral:tracking:conversion", { db: 5 });

  const { worker } = createWorker<ReferralOutreachProspectJobData>(
    "referral:outreach:prospect",
    async (job: Job<ReferralOutreachProspectJobData>): Promise<ReferralOutreachProspectResult> => {
      return withCognitiveSpan("e5:referral:outreach-prospect", async () => {
        const { tenantId, referralId, correlationId } = job.data;

        job.log(`[E28] Starting referral outreach: referralId=${referralId}, tenant=${tenantId}`);

        // ── 1. Set tenant session ──────────────────────────────────────────
        await setSessionTenantId(tenantId);

        // ── 2. SELECT goldReferrals ────────────────────────────────────────
        let referral: {
          id: string;
          referrerId: string;
          referredId: string | null;
          status: string;
          consentGiven: boolean;
        };

        try {
          const rows = await db
            .select({
              id: goldReferrals.id,
              referrerId: goldReferrals.referrerId,
              referredId: goldReferrals.referredId,
              status: goldReferrals.status,
              consentGiven: goldReferrals.consentGiven,
            })
            .from(goldReferrals)
            .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)))
            .limit(1);

          if (rows.length === 0) {
            throw new Error(`[E28] Referral not found: referralId=${referralId}`);
          }

          referral = rows[0];
        } catch (err) {
          throw new Error(`[E28] Failed to fetch referral: ${(err as Error).message}`, {
            cause: err,
          });
        }

        // ── 3. GUARD CRITIC GDPR (Anti-halucin. A) ────────────────────────
        // Niciodată outreach fără consimțământ activ — GDPR violation
        if (referral.status !== "ACTIVE" || referral.consentGiven !== true) {
          throw new Error(`[E28] GDPR violation: cannot outreach without active consent`, {
            cause: new Error(
              `referralId=${referralId} status=${referral.status} consentGiven=${referral.consentGiven}`,
            ),
          });
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
            throw new Error(`[E28] NurturingState not found for referrerId=${referral.referrerId}`);
          }

          nurturingStateId = stateRows[0].id;
        } catch (err) {
          throw new Error(`[E28] Failed to fetch nurturing state: ${(err as Error).message}`, {
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
              actionType: "REFERRAL_OUTREACH",
              channel: "EMAIL",
              status: "PENDING",
              executedAt: sql`NOW()`,
            })
            .returning({ id: goldNurturingActions.id });

          if (inserted.length === 0) {
            throw new Error("[E28] INSERT goldNurturingActions returned no rows");
          }

          actionId = inserted[0].id;
        } catch (err) {
          throw new Error(`[E28] Failed to insert nurturing action: ${(err as Error).message}`, {
            cause: err,
          });
        }

        job.log(
          `[E28] Action inserted: actionId=${actionId}, nurturingStateId=${nurturingStateId}`,
        );

        // ── 6. Enqueue E29 cu delay 7 zile ────────────────────────────────
        try {
          await trackingConversionQueue.add(
            "tracking-conversion",
            {
              tenantId,
              referralId,
              checkCount: 0,
              correlationId,
            },
            {
              delay: SEVEN_DAYS_MS,
              jobId: `track-conv-${referralId}-0-${Date.now()}`,
            },
          );
        } catch (err) {
          throw new Error(
            `[E28] Failed to enqueue E29 tracking-conversion: ${(err as Error).message}`,
            { cause: err },
          );
        }

        job.log(`[E28] Done: outreach enqueued for referralId=${referralId}, actionId=${actionId}`);

        return {
          ok: true,
          referralId,
          outreachSent: true,
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
