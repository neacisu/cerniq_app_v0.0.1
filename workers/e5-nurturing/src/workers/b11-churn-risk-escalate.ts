/**
 * b11-churn-risk-escalate.ts — Worker B11: Churn Risk Escalate (Plan §X FAZA 9c)
 *
 * Queue: churn:risk:escalate (REDIS_DB_E5=5)
 * Trigger: B10 (score:calculate)
 *
 * Logică:
 * - Dacă riskLevel = CRITICAL sau HIGH → crează HITL task (hitl:churn:intervention)
 * - Payload HITL: clientId, churnScore, topSignals (sorted by strength), recommendedAction
 * - SLA: CRITICAL=2h (priority=1), HIGH=8h (priority=2)
 * - Dacă CRITICAL → also trigger winback:campaign:create
 */

import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { e5ChurnEscalationsTotal } from "../lib/e5-metrics.js";

export interface ChurnRiskEscalateJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  churnScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factorBreakdown: Record<string, { strength: number; weight: number; contribution: number }>;
  activeSignals: Array<{ signalType: string; strength: number; confidence: number }>;
}

export interface ChurnRiskEscalateResult {
  escalated: boolean;
  sla?: "2h" | "8h";
  hitlJobId?: string;
  winbackTriggered: boolean;
}

function getRecommendedAction(riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): string {
  if (riskLevel === "CRITICAL") return "Contactare urgenta telefonic în 2 ore + ofertă winback";
  if (riskLevel === "HIGH") return "Email personalizat retenție + call programat în 8 ore";
  return "Monitorizare automată";
}

export function createChurnRiskEscalateWorker(): Worker {
  // Cozi E5 viitoare — vor fi înregistrate în FAZA 9c-9g
  const hitlChurnInterventionQueue = createQueue("hitl:churn:intervention", { db: 5 });
  const winbackCampaignCreateQueue = createQueue("winback:campaign:create", { db: 5 });

  const { worker } = createWorker<ChurnRiskEscalateJobData>(
    QUEUES.E5_CHURN_RISK_ESCALATE,
    async (job: Job<ChurnRiskEscalateJobData>): Promise<ChurnRiskEscalateResult> => {
      return withCognitiveSpan("e5:churn:risk-escalate", async () => {
        const { tenantId, clientId, nurturingStateId, churnScore, riskLevel, activeSignals } =
          job.data;

        // CRITICAL sau HIGH → escalare HITL
        if (riskLevel !== "CRITICAL" && riskLevel !== "HIGH") {
          job.log(`[B11] riskLevel=${riskLevel} — no escalation needed`);
          return { escalated: false, winbackTriggered: false };
        }

        const sla: "2h" | "8h" = riskLevel === "CRITICAL" ? "2h" : "8h";
        const priority = riskLevel === "CRITICAL" ? 1 : 2;

        // Top 3 semnale sortate descendent după strength
        const topSignals = [...activeSignals]
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 3)
          .map((s) => ({ signalType: s.signalType, strength: s.strength }));

        const hitlPayload = {
          tenantId,
          clientId,
          nurturingStateId,
          churnScore,
          riskLevel,
          sla,
          topSignals,
          recommendedAction: getRecommendedAction(riskLevel),
          escalatedAt: new Date().toISOString(),
        };

        const hitlJob = await hitlChurnInterventionQueue.add("intervention", hitlPayload, {
          priority,
          removeOnComplete: 1000,
        });

        e5ChurnEscalationsTotal.inc({ tenant_id: tenantId, risk_level: riskLevel });

        let winbackTriggered = false;

        // CRITICAL → trigger winback evaluation
        if (riskLevel === "CRITICAL") {
          await winbackCampaignCreateQueue.add(
            "create",
            {
              tenantId,
              clientId,
              nurturingStateId,
              reason: "CHURN_CRITICAL",
              churnScore,
              topSignals,
            },
            { removeOnComplete: 1000 },
          );
          winbackTriggered = true;
        }

        job.log(
          `[B11] ESCALATED riskLevel=${riskLevel} sla=${sla} hitlJobId=${hitlJob.id} winback=${winbackTriggered}`,
        );

        return {
          escalated: true,
          sla,
          hitlJobId: hitlJob.id,
          winbackTriggered,
        };
      });
    },
    { concurrency: 10, db: 5 },
  );

  return worker;
}
