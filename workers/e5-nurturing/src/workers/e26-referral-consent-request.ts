/**
 * e26-referral-consent-request.ts — Worker E26: Cerere Consimțământ GDPR Referral (Plan §X FAZA 9f)
 *
 * Queue: referral:consent:request | Timeout: 30s | Concurrency: 10 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Primește referralId cu status=PENDING_CONSENT
 *   - GUARD: dacă statusul nu mai e PENDING_CONSENT → skip (idempotent)
 *   - INSERT gold_nurturing_actions cu actionType='REFERRAL_CONSENT_REQUEST'
 *   - Enqueue E27 (referral:consent:confirm) cu DELAY 24h pentru expirare auto
 *     dacă referrer-ul nu răspunde în 24h, E27 va fi apelat cu consentGiven=false
 *
 * Anti-halucin. FAZA 9f:
 *   (A) GDPR: NU contactăm prospect — cererea merge DOAR la referrer (cel care a menționat)
 *   Consimțământul EXPLICIT al referrer-ului e necesar înainte de orice outreach la prospect
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldReferrals,
  goldNurturingState,
  goldNurturingActions,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names (hardcodate — vor fi adăugate în registry de alt agent) ────────
const QUEUE_REFERRAL_CONSENT_REQUEST = "referral:consent:request";
const QUEUE_REFERRAL_CONSENT_CONFIRM = "referral:consent:confirm";

// ── Delay 24h pentru expirare auto consimțământ ──────────────────────────────
const CONSENT_EXPIRY_DELAY_MS = 86_400_000;

// ── Timeout job BullMQ ─────────────────────────────────────────────────────────
const JOB_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ReferralConsentRequestJobData {
  tenantId: string;
  referralId: string;
  nurturingStateId?: string;
  correlationId?: string;
}

export interface ReferralConsentRequestResult {
  ok: boolean;
  referralId: string;
  channel: string;
  actionInserted: boolean;
  consentJobScheduled: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createReferralConsentRequestWorker(): Worker {
  const consentConfirmQueue = createQueue(QUEUE_REFERRAL_CONSENT_CONFIRM, { db: 5 });

  const { worker } = createWorker<ReferralConsentRequestJobData>(
    QUEUE_REFERRAL_CONSENT_REQUEST,
    async (job: Job<ReferralConsentRequestJobData>): Promise<ReferralConsentRequestResult> => {
      return withCognitiveSpan("e5:referral:consent-request", async () => {
        const { tenantId, referralId, nurturingStateId, correlationId } = job.data;

        // ── 1. setSessionTenantId ────────────────────────────────────────────
        await setSessionTenantId(tenantId);

        job.log(`[E26] Processing consent request: referralId=${referralId}`);

        // ── 2. SELECT gold_referrals pentru status + referrerId ───────────────
        const referralRows = await db
          .select({
            id: goldReferrals.id,
            status: goldReferrals.status,
            referrerId: goldReferrals.referrerId,
          })
          .from(goldReferrals)
          .where(and(eq(goldReferrals.id, referralId), eq(goldReferrals.tenantId, tenantId)))
          .limit(1);

        const referral = referralRows[0];

        // ── 3. GUARD: dacă nu e PENDING_CONSENT → skip ──────────────────────
        if (referral?.status !== "PENDING_CONSENT") {
          job.log(
            `[E26] Skip: referralId=${referralId}, ` +
              `status=${referral?.status ?? "NOT_FOUND"} (expected PENDING_CONSENT)`,
          );
          return {
            ok: true,
            referralId,
            channel: "EMAIL",
            actionInserted: false,
            consentJobScheduled: false,
          };
        }

        // ── 4. Găsim nurturingStateId din gold_nurturing_state WHERE leadId=referrerId ─
        let resolvedNurturingStateId = nurturingStateId;

        if (!resolvedNurturingStateId) {
          const nurturingRows = await db
            .select({ id: goldNurturingState.id })
            .from(goldNurturingState)
            .where(
              and(
                eq(goldNurturingState.leadId, referral.referrerId),
                eq(goldNurturingState.tenantId, tenantId),
              ),
            )
            .limit(1);

          if (nurturingRows[0]) {
            resolvedNurturingStateId = nurturingRows[0].id;
          }
        }

        // dacă nu avem nurturingStateId, nu putem insera acțiunea (FK NOT NULL)
        if (!resolvedNurturingStateId) {
          job.log(
            `[E26] No nurturingStateId found for referrerId=${referral.referrerId} — skip action insert`,
          );
          // Totuși enqueue-im confirm cu delay pentru a expira referralul corect
          await consentConfirmQueue.add(
            "consent-confirm-auto-expire",
            {
              tenantId,
              referralId,
              consentGiven: false,
              correlationId,
            },
            {
              jobId: `consent-confirm-${referralId}-auto`,
              delay: CONSENT_EXPIRY_DELAY_MS,
            },
          );

          return {
            ok: true,
            referralId,
            channel: "EMAIL",
            actionInserted: false,
            consentJobScheduled: true,
          };
        }

        // ── 5. Determinăm canalul (default EMAIL) ────────────────────────────
        const channel = "EMAIL" as const;

        // ── 6. INSERT gold_nurturing_actions ─────────────────────────────────
        await db.insert(goldNurturingActions).values({
          tenantId,
          nurturingStateId: resolvedNurturingStateId,
          actionType: "REFERRAL_CONSENT_REQUEST",
          channel,
          status: "PENDING",
          executedAt: new Date(),
        });

        job.log(
          `[E26] Inserted REFERRAL_CONSENT_REQUEST action: ` +
            `nurturingStateId=${resolvedNurturingStateId}, channel=${channel}`,
        );

        // ── 7. Enqueue E27 cu DELAY 24h — auto-expire dacă nu vine răspuns ──
        await consentConfirmQueue.add(
          "consent-confirm-auto-expire",
          {
            tenantId,
            referralId,
            consentGiven: false,
            correlationId,
          },
          {
            jobId: `consent-confirm-${referralId}-auto`,
            delay: CONSENT_EXPIRY_DELAY_MS,
          },
        );

        job.log(
          `[E26] Scheduled auto-expire consent confirm in 24h: referralId=${referralId}, channel=${channel}`,
        );

        return {
          ok: true,
          referralId,
          channel,
          actionInserted: true,
          consentJobScheduled: true,
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
