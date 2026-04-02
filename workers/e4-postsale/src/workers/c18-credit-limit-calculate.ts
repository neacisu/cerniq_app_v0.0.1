/**
 * c18-credit-limit-calculate.ts — Worker C18: Calcul limită credit + HITL >50K RON
 *
 * FLUX:
 * 1. Mapare risk tier → credit limit (din Plan L2070)
 * 2. UPDATE gold_credit_profiles.creditLimit
 * 3. Dacă creditLimit > 50.000 RON → CREATE approval task (HITL, SLA 4h, approver=CFO)
 *    Anti-halucinare: priority="high" = SLA 4h (din SLA_HOURS map în approval-service.ts)
 *
 * Risk tier → Credit limit (Plan FAZA 8d §IX L2070):
 *   BLOCKED  (0-19):  0 RON
 *   LOW      (20-39): 5.000 RON
 *   MEDIUM   (40-59): 20.000 RON
 *   HIGH     (60-79): 50.000 RON
 *   PREMIUM  (80-100): 100.000 RON
 *
 * HITL la >50K RON: SLA 4h, approver=CFO (Plan L2057, L2113)
 */
import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, goldCreditProfiles, approvalService, setSessionTenantId, eq } from "@cerniq/db";
import {
  CREDIT_LIMIT_MAP,
  HITL_THRESHOLD_RON,
  type RiskTier,
} from "../lib/credit-scoring-engine.js";

export type CreditLimitCalculateJobData = {
  tenantId: string;
  clientId: string;
  profileId: string;
  riskTier: RiskTier;
  creditLimit: number;
  correlationId?: string;
};

export const creditLimitCalculateProcessor: Processor<CreditLimitCalculateJobData> = async (
  job,
) => {
  return withCognitiveSpan(
    "e4:credit:limit:calculate",
    async (_span) => {
      const { tenantId, clientId, profileId, riskTier } = job.data;
      await setSessionTenantId(tenantId);

      const creditLimit = CREDIT_LIMIT_MAP[riskTier];

      // ── 1. UPDATE gold_credit_profiles.creditLimit ────────────────────────
      await db
        .update(goldCreditProfiles)
        .set({
          creditLimit: String(creditLimit),
          riskTier,
          updatedAt: new Date(),
        })
        .where(eq(goldCreditProfiles.id, profileId));

      console.info(
        `[C18] Credit limit set: profileId=${profileId}, tier=${riskTier}, limit=${creditLimit} RON`,
      );

      // ── 2. HITL dacă creditLimit > 50.000 RON (Plan L2057, SLA 4h CFO) ───
      if (creditLimit > HITL_THRESHOLD_RON) {
        const task = await approvalService.createTask({
          tenantId,
          entityType: "gold_credit_profiles",
          entityId: profileId,
          approvalType: "manual_verification",
          title: `Aprobare limită credit ${creditLimit.toLocaleString("ro-RO")} RON — client ${clientId}`,
          description: [
            `Profilul de credit a primit risk tier ${riskTier} cu scor >= 80p.`,
            `Limita calculată (${creditLimit.toLocaleString("ro-RO")} RON) depășește pragul de 50.000 RON.`,
            `Necesită aprobare CFO înainte de activare (SLA: 4 ore).`,
            `Profile ID: ${profileId}`,
            `Client ID: ${clientId}`,
          ].join("\n"),
          pipelineStage: "C18",
          etapa: "E4",
          priority: "high",
          metadata: {
            creditLimit,
            riskTier,
            hitlThreshold: HITL_THRESHOLD_RON,
            clientId,
            profileId,
            hitlInvestigationType: "credit_limit_approval",
            approverRole: "CFO",
            correlationId: job.data.correlationId,
          },
          createdBy: null,
        });

        console.info(
          `[C18] HITL task created: taskId=${task.id}, creditLimit=${creditLimit} RON > threshold ${HITL_THRESHOLD_RON} RON`,
        );

        return {
          ok: true,
          profileId,
          riskTier,
          creditLimit,
          hitlTaskId: task.id,
          hitlRequired: true,
        };
      }

      return {
        ok: true,
        profileId,
        riskTier,
        creditLimit,
        hitlRequired: false,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
