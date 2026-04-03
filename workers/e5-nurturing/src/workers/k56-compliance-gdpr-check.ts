/**
 * k56-compliance-gdpr-check.ts — Worker K56: GDPR Compliance Check (FAZA 9h)
 *
 * Queue: compliance:gdpr:check | Severity: CRITICAL | Concurrency: 1
 *
 * Responsabilitate:
 *   - SELECT goldReferrals WHERE consentGiven=false AND status IN ('ACTIVE','CONVERTED')
 *   - CRITICAL log pentru fiecare set de violări
 *   - INSERT goldNurturingActions (audit) cu nurturingStateId din referral.referrerId
 *   - Raportează violările (NU update status='PAUSED' — nu există în enum)
 *
 * Anti-halucin. FAZA 9h:
 *   (A) referralStatusEnum: PENDING_CONSENT/ACTIVE/CONVERTED/EXPIRED/DECLINED (NU PAUSED)
 *       → Statusul PAUSED nu există → Nu facem UPDATE; logăm CRITICAL și raportăm violările
 *   (B) goldNurturingActions.nurturingStateId NOT NULL → lookup nurturingState din referrerId
 *   (C) actionStatusEnum NU are "COMPLETED" → folosim "SENT" pentru acțiuni finalizate
 *   (D) e5ActionChannelEnum NU are "INTERNAL" → folosim "IN_APP" pentru audit intern
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldReferrals,
  goldNurturingState,
  goldNurturingActions,
  eq,
  and,
  inArray,
} from "@cerniq/db";
import { createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ───────────────────────────────────────────────────────────────
const QUEUE_COMPLIANCE_GDPR_CHECK = "compliance:gdpr:check";

// ── Statusuri care indică referral activ (trebuie să aibă consimțământ) ───────
// HARD CONSTRAINT: aceste statusuri NECESITĂ consentGiven=true (Plan L2386)
const ACTIVE_REFERRAL_STATUSES = ["ACTIVE", "CONVERTED"] as const;
/** Statusuri referral activ ce NECESITĂ consentGiven=true (Plan L2386, GDPR Art. 7) */
export type ActiveReferralStatus = (typeof ACTIVE_REFERRAL_STATUSES)[number];

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ComplianceGdprCheckJobData {
  tenantId?: string;
}

export interface ComplianceGdprCheckResult {
  violations: number;
  blocked: number;
  tenantsChecked: number;
}

// ---------------------------------------------------------------------------
// Helper: INSERT audit action cu nurturingStateId lookup
// ---------------------------------------------------------------------------

async function insertComplianceAuditAction(params: {
  tenantId: string;
  referrerId: string;
}): Promise<boolean> {
  const { tenantId, referrerId } = params;

  // Căutăm nurturingStateId valid (NOT NULL constraint) din referrerId
  const states = await db
    .select({ id: goldNurturingState.id })
    .from(goldNurturingState)
    .where(
      and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, referrerId)),
    )
    .limit(1);

  if (states.length === 0) {
    console.warn(
      `[K56] WARN: Cannot insert audit action — no nurturing state found for referrerId=${referrerId} tenantId=${tenantId}`,
    );
    return false;
  }

  await db.insert(goldNurturingActions).values({
    tenantId,
    nurturingStateId: states[0].id,
    actionType: "COMPLIANCE_VIOLATION",
    channel: "IN_APP", // "INTERNAL" nu există în enum → IN_APP
    status: "SENT", // "COMPLETED" nu există în enum → SENT
    templateId: "GDPR_CONSENT_VIOLATION",
    executedAt: new Date(),
  });

  return true;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createComplianceGdprCheckWorker(): Worker {
  const { worker } = createWorker<ComplianceGdprCheckJobData>(
    QUEUE_COMPLIANCE_GDPR_CHECK,
    async (job: Job<ComplianceGdprCheckJobData>): Promise<ComplianceGdprCheckResult> => {
      return withCognitiveSpan("e5:compliance:gdpr-check", async () => {
        const { tenantId } = job.data;

        job.log(`[K56] GDPR compliance check starting tenantId=${tenantId ?? "ALL"}`);

        // ── 1. SELECT goldReferrals cu consentGiven=false AND status ACTIVE/CONVERTED ──
        const whereConditions = tenantId
          ? and(
              eq(goldReferrals.consentGiven, false),
              inArray(goldReferrals.status, [...ACTIVE_REFERRAL_STATUSES]),
              eq(goldReferrals.tenantId, tenantId),
            )
          : and(
              eq(goldReferrals.consentGiven, false),
              inArray(goldReferrals.status, [...ACTIVE_REFERRAL_STATUSES]),
            );

        const violations = await db
          .select({
            id: goldReferrals.id,
            tenantId: goldReferrals.tenantId,
            referrerId: goldReferrals.referrerId,
            status: goldReferrals.status,
          })
          .from(goldReferrals)
          .where(whereConditions);

        // ── 2. Procesează violări ────────────────────────────────────────────
        if (violations.length === 0) {
          job.log("[K56] GDPR check passed: no violations found");
          console.log(`[K56] GDPR check passed: no violations found tenantId=${tenantId ?? "ALL"}`);
          return { violations: 0, blocked: 0, tenantsChecked: 1 };
        }

        // CRITICAL: log imediat
        console.error(
          `[CRITICAL][K56] GDPRConsentViolation: ${violations.length} referrals activi fără consimțământ GDPR! tenantId=${tenantId ?? "ALL"} violatingIds=${violations.map((v) => v.id).join(",")}`,
        );

        job.log(
          `[CRITICAL][K56] GDPRConsentViolation: ${violations.length} referrals fără consimțământ`,
        );

        // ── 3. Grupează violările pe tenantId pentru audit INSERT ─────────────
        const byTenant = new Map<string, typeof violations>();
        for (const v of violations) {
          const list = byTenant.get(v.tenantId) ?? [];
          list.push(v);
          byTenant.set(v.tenantId, list);
        }

        let auditInserted = 0;

        for (const [tid, tenantViolations] of byTenant) {
          const firstViolation = tenantViolations[0];

          try {
            const inserted = await insertComplianceAuditAction({
              tenantId: tid,
              referrerId: firstViolation.referrerId,
            });
            if (inserted) auditInserted++;
          } catch (err) {
            job.log(
              `[K56] WARN: Failed to insert audit action tenantId=${tid}: ${(err as Error).message}`,
            );
          }

          // NOTĂ: goldReferrals.status NU are valoarea 'PAUSED' în enum
          // (enum: PENDING_CONSENT/ACTIVE/CONVERTED/EXPIRED/DECLINED)
          // Nu putem face UPDATE SET status='PAUSED' — am provoca eroare DB
          // Violările sunt raportate via CRITICAL log și audit action
          job.log(
            `[K56] [CRITICAL] tenantId=${tid}: ${tenantViolations.length} violări GDPR raportate — outreach blocat manual necesar`,
          );
        }

        const result = {
          violations: violations.length,
          blocked: 0, // Nu facem UPDATE status (PAUSED nu există în enum)
          tenantsChecked: byTenant.size,
        };

        job.log(
          `[K56] GDPR check completed: ${violations.length} violations, ${auditInserted} audit records inserted`,
        );

        return result;
      });
    },
    {
      connection: { db: 5 },
      concurrency: 1,
    },
  );

  return worker;
}
