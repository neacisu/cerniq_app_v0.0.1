/**
 * b10-churn-score-calculate.ts — Worker B10: Churn Score Calculate (Plan §X FAZA 9c)
 *
 * Queue: churn:score:calculate (REDIS_DB_E5=5)
 * Trigger: B9 (signal:detect)
 *
 * Anti-halucin. (B): Churn scoring DETERMINIST — formula ponderată (fără AI).
 * Anti-halucin. (F): Weights EXACTE din plan §X L2255-2259.
 *
 * Logică:
 * - SELECT gold_churn_signals active per client
 * - Aplică formula ChurnScore = Σ(signal_strength × weight × confidence)
 * - UPSERT gold_churn_factors cu overallChurnScore + riskLevel + factorBreakdown
 * - riskLevel: 0-25=LOW, 26-50=MEDIUM, 51-75=HIGH, 76-100=CRITICAL
 * - UPDATE gold_nurturing_state SET churnRiskScore, churnRiskLevel
 * - Enqueue B11 pentru evaluare escalare
 */

import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { calculateChurnScore, type ChurnSignalInput } from "../lib/churn-scoring-engine.js";

export interface ChurnScoreCalculateJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
}

export interface ChurnScoreCalculateResult {
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  activeSignalCount: number;
  previousScore: number;
  scoreChanged: boolean;
}

export function createChurnScoreCalculateWorker(): Worker {
  const escalateQueue = createQueue(QUEUES.E5_CHURN_RISK_ESCALATE, { db: 5 });

  const { worker } = createWorker<ChurnScoreCalculateJobData>(
    QUEUES.E5_CHURN_SCORE_CALCULATE,
    async (job: Job<ChurnScoreCalculateJobData>): Promise<ChurnScoreCalculateResult> => {
      return withCognitiveSpan("e5:churn:score-calculate", async () => {
        const { tenantId, clientId, nurturingStateId } = job.data;

        const {
          db,
          setSessionTenantId,
          goldChurnSignals,
          goldChurnFactors,
          goldNurturingState,
          eq,
          and,
        } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        // SELECT semnale active
        const activeSignals = await db
          .select({
            signalType: goldChurnSignals.signalType,
            strength: goldChurnSignals.strength,
          })
          .from(goldChurnSignals)
          .where(
            and(
              eq(goldChurnSignals.tenantId, tenantId),
              eq(goldChurnSignals.leadId, clientId),
              eq(goldChurnSignals.isActive, true),
            ),
          );

        const signalInputs: ChurnSignalInput[] = activeSignals.map((s) => ({
          signalType: s.signalType,
          strength: s.strength,
          confidence: 1, // rule-based = fully confident
        }));

        const scoreResult = calculateChurnScore(signalInputs);

        // Fetch scor anterior pentru detectare schimbare
        const [currentFactors] = await db
          .select({ overallChurnScore: goldChurnFactors.overallChurnScore })
          .from(goldChurnFactors)
          .where(
            and(eq(goldChurnFactors.tenantId, tenantId), eq(goldChurnFactors.leadId, clientId)),
          )
          .limit(1);

        const previousScore = currentFactors?.overallChurnScore ?? 0;
        const scoreChanged = previousScore !== scoreResult.score;

        // UPSERT gold_churn_factors
        await db
          .insert(goldChurnFactors)
          .values({
            tenantId,
            leadId: clientId,
            overallChurnScore: scoreResult.score,
            riskLevel: scoreResult.riskLevel,
            factorBreakdown: scoreResult.factorBreakdown,
            activeSignalCount: scoreResult.activeSignalCount,
            lastCalculatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [goldChurnFactors.tenantId, goldChurnFactors.leadId],
            set: {
              overallChurnScore: scoreResult.score,
              riskLevel: scoreResult.riskLevel,
              factorBreakdown: scoreResult.factorBreakdown,
              activeSignalCount: scoreResult.activeSignalCount,
              lastCalculatedAt: new Date(),
              updatedAt: new Date(),
            },
          });

        // UPDATE gold_nurturing_state
        await db
          .update(goldNurturingState)
          .set({
            churnRiskScore: scoreResult.score,
            churnRiskLevel: scoreResult.riskLevel,
            updatedAt: new Date(),
          })
          .where(eq(goldNurturingState.id, nurturingStateId));

        // Enqueue B11 pentru evaluare escalare (mereu, B11 filtrează după riskLevel)
        await escalateQueue.add(
          "evaluate",
          {
            tenantId,
            clientId,
            nurturingStateId,
            churnScore: scoreResult.score,
            riskLevel: scoreResult.riskLevel,
            factorBreakdown: scoreResult.factorBreakdown,
            activeSignals: signalInputs,
          },
          { removeOnComplete: 1000 },
        );

        job.log(
          `[B10] score=${scoreResult.score} riskLevel=${scoreResult.riskLevel} signals=${scoreResult.activeSignalCount} changed=${scoreChanged}`,
        );

        return {
          score: scoreResult.score,
          riskLevel: scoreResult.riskLevel,
          activeSignalCount: scoreResult.activeSignalCount,
          previousScore,
          scoreChanged,
        };
      });
    },
    { concurrency: 20, db: 5 },
  );

  return worker;
}
