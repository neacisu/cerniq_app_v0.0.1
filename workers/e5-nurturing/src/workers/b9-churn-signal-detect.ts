/**
 * b9-churn-signal-detect.ts — Worker B9: Churn Signal Detect (Plan §X FAZA 9c)
 *
 * Queue: churn:signal:detect (REDIS_DB_E5=5)
 * Trigger: B12 (sentiment results), B14 (decay), B10 trigger implicit
 *
 * Anti-halucin. (C): Signal detection RULE-BASED — fără AI.
 * Anti-halucin. (F): strength formulas EXACTE din plan §X L2697-2704.
 *
 * Logică:
 * - Detectează 8 semnale churn DETERMINIST din inputs
 * - INSERT gold_churn_signals pentru fiecare semnal detectat
 * - Enqueue B10 (churn:score:calculate)
 */

import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { computeSignalStrengths, type SignalStrengthInputs } from "../lib/churn-scoring-engine.js";
import { e5ChurnSignalsDetectedTotal } from "../lib/e5-metrics.js";

export interface ChurnSignalDetectJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  context: SignalStrengthInputs & {
    messageId?: string;
  };
}

export interface ChurnSignalDetectResult {
  signalsDetected: number;
  signalTypes: string[];
  insertedIds: string[];
}

export function createChurnSignalDetectWorker(): Worker {
  const scoreQueue = createQueue(QUEUES.E5_CHURN_SCORE_CALCULATE, { db: 5 });

  const { worker } = createWorker<ChurnSignalDetectJobData>(
    QUEUES.E5_CHURN_SIGNAL_DETECT,
    async (job: Job<ChurnSignalDetectJobData>): Promise<ChurnSignalDetectResult> => {
      return withCognitiveSpan("e5:churn:signal-detect", async () => {
        const { tenantId, clientId, nurturingStateId, context } = job.data;

        // Calculează semnale DETERMINIST (fără AI)
        const detectedSignals = computeSignalStrengths(context);

        if (detectedSignals.length === 0) {
          job.log("[B9] No churn signals detected");
          return { signalsDetected: 0, signalTypes: [], insertedIds: [] };
        }

        const { db, setSessionTenantId, goldChurnSignals } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        const insertedIds: string[] = [];

        for (const signal of detectedSignals) {
          const [inserted] = await db
            .insert(goldChurnSignals)
            .values({
              tenantId,
              leadId: clientId,
              signalType: signal.signalType as (typeof goldChurnSignals.$inferInsert)["signalType"],
              strength: signal.strength,
              detectionMethod: "RULE_BASED",
              isActive: true,
              detectedAt: new Date(),
            })
            .returning({ id: goldChurnSignals.id });

          if (inserted) {
            insertedIds.push(inserted.id);
            e5ChurnSignalsDetectedTotal.inc({
              tenant_id: tenantId,
              signal_type: signal.signalType,
            });
          }
        }

        // Enqueue B10 pentru recalcul scor
        await scoreQueue.add(
          "calculate",
          { tenantId, clientId, nurturingStateId },
          { removeOnComplete: 1000 },
        );

        job.log(
          `[B9] Detected ${detectedSignals.length} signals: ${detectedSignals.map((s) => s.signalType).join(", ")}`,
        );

        return {
          signalsDetected: detectedSignals.length,
          signalTypes: detectedSignals.map((s) => s.signalType),
          insertedIds,
        };
      });
    },
    { concurrency: 30, db: 5 },
  );

  return worker;
}
