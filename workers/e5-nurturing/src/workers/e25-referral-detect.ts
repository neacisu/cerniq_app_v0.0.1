/**
 * e25-referral-detect.ts — Worker E25: Referral Detection din mesaje client (Plan §X FAZA 9f)
 *
 * Queue: referral:detect | Timeout: 60s | Concurrency: 5 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Primește text mesaj client (EMAIL/WHATSAPP/SMS/IN_APP)
 *   - Apelează LLM Qwen2.5-14B via infraq.app/fast pentru detectare mențiuni referral
 *   - Verifică cooldown 30 zile (NU creăm referral dublu rapid)
 *   - Caută compania menționată în gold_companies (LIKE pe name)
 *   - INSERT gold_referrals cu status='PENDING_CONSENT'
 *   - Enqueue E26 (referral:consent:request) pentru obținere consimțământ GDPR
 *
 * Anti-halucin. FAZA 9f:
 *   (A) GDPR: NU contactăm prospect fără consimțământ explicit al referrer-ului
 *   (B) Cooldown 30 zile — NU duplicăm referrals active
 *   (F) LLM: infraq.app/fast (Qwen2.5-14B), NU Claude, NU QwQ-32B-AWQ
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldReferrals,
  goldCompanies,
  sql,
  eq,
  and,
  inArray,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { detectReferralMention } from "../lib/referral-detect-llm.js";

// ── Queue names (hardcodate — vor fi adăugate în registry de alt agent) ────────
const QUEUE_REFERRAL_DETECT = "referral:detect";
const QUEUE_REFERRAL_CONSENT_REQUEST = "referral:consent:request";

// ── Timeout job BullMQ ─────────────────────────────────────────────────────────
const JOB_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ReferralDetectJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  messageText: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS" | "IN_APP";
  messageId: string;
  correlationId?: string;
}

export interface ReferralDetectResult {
  ok: boolean;
  referralCreated: boolean;
  referralId?: string;
  cooldownActive: boolean;
  referralType?: string;
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createReferralDetectWorker(): Worker {
  const consentRequestQueue = createQueue(QUEUE_REFERRAL_CONSENT_REQUEST, { db: 5 });

  const { worker } = createWorker<ReferralDetectJobData>(
    QUEUE_REFERRAL_DETECT,
    async (job: Job<ReferralDetectJobData>): Promise<ReferralDetectResult> => {
      return withCognitiveSpan("e5:referral:detect", async () => {
        const { tenantId, clientId, nurturingStateId, channel, messageId, correlationId } =
          job.data;

        // ── 1. setSessionTenantId + truncate text ────────────────────────────
        await setSessionTenantId(tenantId);

        const messageText = job.data.messageText.slice(0, 2000);

        job.log(
          `[E25] Detecting referral: clientId=${clientId}, channel=${channel}, ` +
            `messageId=${messageId}, textLength=${messageText.length}`,
        );

        // ── 2. Apel LLM detectare mențiuni ──────────────────────────────────
        const referralResult = await detectReferralMention(messageText);

        if (!referralResult.hasMention || referralResult.confidence < 0.6) {
          job.log(
            `[E25] No referral mention detected (hasMention=${String(referralResult.hasMention)}, ` +
              `confidence=${referralResult.confidence})`,
          );
          return { ok: true, referralCreated: false, cooldownActive: false };
        }

        job.log(
          `[E25] Mention detected: type=${referralResult.referralType}, ` +
            `confidence=${referralResult.confidence}, company=${referralResult.mentionedCompany ?? "N/A"}`,
        );

        // ── 3. Cooldown check — NU dublăm referrals active în 30 zile ───────
        const cooldownRows = await db
          .select({ id: goldReferrals.id })
          .from(goldReferrals)
          .where(
            and(
              eq(goldReferrals.referrerId, clientId),
              eq(goldReferrals.tenantId, tenantId),
              sql`${goldReferrals.createdAt} > NOW() - INTERVAL '30 days'`,
              inArray(goldReferrals.status, ["PENDING_CONSENT", "ACTIVE"]),
            ),
          )
          .limit(1);

        if (cooldownRows.length > 0) {
          job.log(`[E25] Cooldown active for clientId=${clientId} — skipping referral creation`);
          return { ok: true, referralCreated: false, cooldownActive: true };
        }

        // ── 4. Caută compania menționată în gold_companies (LIKE pe name) ────
        let referredId: string | null = null;

        if (referralResult.mentionedCompany) {
          const companyLike = `%${referralResult.mentionedCompany.slice(0, 100)}%`;
          const foundCompanies = await db
            .select({ id: goldCompanies.id })
            .from(goldCompanies)
            .where(
              and(
                eq(goldCompanies.tenantId, tenantId),
                sql`${goldCompanies.denumireNormalizata} ILIKE ${companyLike}`,
              ),
            )
            .limit(1);

          if (foundCompanies.length > 0) {
            referredId = foundCompanies[0].id;
            job.log(`[E25] Found referred company: referredId=${referredId}`);
          } else {
            job.log(
              `[E25] Mentioned company "${referralResult.mentionedCompany}" not found in gold_companies — referredId=null`,
            );
          }
        }

        // ── 5. INSERT gold_referrals cu status=PENDING_CONSENT ───────────────
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const inserted = await db
          .insert(goldReferrals)
          .values({
            tenantId,
            referrerId: clientId,
            referredId: referredId ?? undefined,
            referralType: referralResult.referralType,
            status: "PENDING_CONSENT",
            consentGiven: false,
            expiresAt,
          })
          .returning({ id: goldReferrals.id });

        if (!inserted[0]) {
          throw new Error("[E25] Failed to insert gold_referrals — no row returned");
        }

        const referralId = inserted[0].id;

        job.log(`[E25] Created referral: referralId=${referralId}, status=PENDING_CONSENT`);

        // ── 6. Enqueue E26 referral:consent:request ──────────────────────────
        await consentRequestQueue.add(
          "consent-request",
          {
            tenantId,
            referralId,
            nurturingStateId,
            correlationId,
          },
          {
            jobId: `consent-req-${referralId}`,
          },
        );

        job.log(`[E25] Enqueued consent request for referralId=${referralId}`);

        return {
          ok: true,
          referralCreated: true,
          referralId,
          cooldownActive: false,
          referralType: referralResult.referralType,
          confidence: referralResult.confidence,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
      lockDuration: JOB_TIMEOUT_MS,
    },
  );

  return worker;
}
