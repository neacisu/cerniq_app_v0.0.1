/**
 * e27-referral-consent-confirm.ts — Worker E27: Confirmare Consimțământ GDPR Referral (Plan §X FAZA 9f)
 *
 * Queue: referral:consent:confirm | Timeout: 30s | Concurrency: 10 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Primește consentGiven (true/false) de la referrer sau auto-expire din E26 (delay 24h)
 *   - GUARD: dacă referralul nu e PENDING_CONSENT → SKIPPED (idempotent)
 *   - Verifică expiresAt — dacă referralul a expirat → UPDATE status=EXPIRED
 *   - consentGiven=true → UPDATE status=ACTIVE + Enqueue E28 (referral:outreach:prospect)
 *   - consentGiven=false → UPDATE status=DECLINED
 *
 * Anti-halucin. FAZA 9f:
 *   (A) GDPR: outreach prospect (E28) se face DOAR după consentGiven=true explicit
 *   Fără consimțământ → DECLINED → NU contactăm niciodată prospectul
 */

import type { Job, Worker } from "bullmq";
import { db, goldReferrals, eq, and, setSessionTenantId } from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names (hardcodate — vor fi adăugate în registry de alt agent) ────────
const QUEUE_REFERRAL_CONSENT_CONFIRM = "referral:consent:confirm";
const QUEUE_REFERRAL_OUTREACH_PROSPECT = "referral:outreach:prospect";

// ── Timeout job BullMQ ─────────────────────────────────────────────────────────
const JOB_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ReferralConsentConfirmJobData {
  tenantId: string;
  referralId: string;
  consentGiven: boolean;
  consentProofMessageId?: string;
  correlationId?: string;
}

export interface ReferralConsentConfirmResult {
  ok: boolean;
  referralId: string;
  newStatus: "ACTIVE" | "DECLINED" | "EXPIRED" | "SKIPPED";
  outreachEnqueued: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createReferralConsentConfirmWorker(): Worker {
  const outreachProspectQueue = createQueue(QUEUE_REFERRAL_OUTREACH_PROSPECT, { db: 5 });

  const { worker } = createWorker<ReferralConsentConfirmJobData>(
    QUEUE_REFERRAL_CONSENT_CONFIRM,
    async (job: Job<ReferralConsentConfirmJobData>): Promise<ReferralConsentConfirmResult> => {
      return withCognitiveSpan("e5:referral:consent-confirm", async () => {
        const { tenantId, referralId, consentGiven, consentProofMessageId, correlationId } =
          job.data;

        // ── 1. setSessionTenantId ────────────────────────────────────────────
        await setSessionTenantId(tenantId);

        job.log(
          `[E27] Processing consent confirm: referralId=${referralId}, consentGiven=${String(consentGiven)}`,
        );

        // ── 2. SELECT gold_referrals ─────────────────────────────────────────
        const referralRows = await db
          .select({
            id: goldReferrals.id,
            status: goldReferrals.status,
            referrerId: goldReferrals.referrerId,
            referredId: goldReferrals.referredId,
            expiresAt: goldReferrals.expiresAt,
          })
          .from(goldReferrals)
          .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)))
          .limit(1);

        const referral = referralRows[0];

        // ── 3. GUARD: nu există sau nu e PENDING_CONSENT ─────────────────────
        if (referral?.status !== "PENDING_CONSENT") {
          job.log(
            `[E27] Skip: referralId=${referralId}, ` +
              `status=${referral?.status ?? "NOT_FOUND"} (expected PENDING_CONSENT)`,
          );
          return {
            ok: true,
            referralId,
            newStatus: "SKIPPED",
            outreachEnqueued: false,
          };
        }

        // ── 4. Verificare expiresAt ─────────────────────────────────────────
        const now = new Date();

        if (referral.expiresAt < now) {
          await db
            .update(goldReferrals)
            .set({
              status: "EXPIRED",
              updatedAt: now,
            })
            .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)));

          job.log(
            `[E27] Referral EXPIRED: referralId=${referralId}, expiresAt=${referral.expiresAt.toISOString()}`,
          );

          return {
            ok: true,
            referralId,
            newStatus: "EXPIRED",
            outreachEnqueued: false,
          };
        }

        // ── 5a. consentGiven=true → ACTIVE + Enqueue E28 ────────────────────
        if (consentGiven) {
          await db
            .update(goldReferrals)
            .set({
              status: "ACTIVE",
              consentGiven: true,
              consentGivenAt: now,
              consentProofMessageId: consentProofMessageId ?? null,
              updatedAt: now,
            })
            .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)));

          job.log(`[E27] Consent GIVEN → status=ACTIVE: referralId=${referralId}`);

          // Enqueue E28 outreach:prospect EXCLUSIV după consimțământ explicit (Anti-halucin. A)
          await outreachProspectQueue.add(
            "outreach-prospect",
            {
              tenantId,
              referralId,
              correlationId,
            },
            {
              jobId: `outreach-prospect-${referralId}`,
            },
          );

          job.log(`[E27] Enqueued referral:outreach:prospect for referralId=${referralId}`);

          return {
            ok: true,
            referralId,
            newStatus: "ACTIVE",
            outreachEnqueued: true,
          };
        }

        // ── 5b. consentGiven=false → DECLINED ───────────────────────────────
        await db
          .update(goldReferrals)
          .set({
            status: "DECLINED",
            updatedAt: now,
          })
          .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)));

        job.log(
          `[E27] Consent DECLINED → status=DECLINED: referralId=${referralId} (NU contactăm prospectul)`,
        );

        return {
          ok: true,
          referralId,
          newStatus: "DECLINED",
          outreachEnqueued: false,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
      lockDuration: JOB_TIMEOUT_MS,
    },
  );

  return worker;
}
