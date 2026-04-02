/**
 * b14-decay-behavior-detect.ts — Worker B14: Decay Behavior Detect (Plan §X FAZA 9c)
 *
 * Queue: decay:behavior:detect (REDIS_DB_E5=5)
 * Trigger: cron periodic sau post-order
 *
 * Logică:
 * - Detectare COMMUNICATION_FADE: daysSinceLastOrder > 30 SAU daysSinceLastInteraction > 30
 * - Detectare ORDER_FREQUENCY_DROP: daysSinceLastOrder > 60 (pattern decay sever)
 * - Regression liniară pe intervalele din churn signals history pentru trend confirmare
 * - Output: trigger B9 cu COMMUNICATION_FADE sau ORDER_FREQUENCY_DROP dacă detectat
 */

import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import type { SignalStrengthInputs } from "../lib/churn-scoring-engine.js";

export interface DecayBehaviorDetectJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  /** Optional: intervalele zilnice între comenzi (pentru regression liniară) */
  orderIntervalsDays?: number[];
}

export interface DecayBehaviorDetectResult {
  communicationFadeDetected: boolean;
  orderFrequencyDecayDetected: boolean;
  daysSinceLastOrder: number | null;
  daysSinceLastInteraction: number | null;
  orderFrequencySlope: number | null;
  signalsTriggered: number;
}

/**
 * linearRegressionSlope — panta liniei de regresie pe intervalele între comenzi.
 * Slope pozitiv = intervalele cresc = frecvența scade = decay pattern.
 */
export function linearRegressionSlope(intervals: number[]): number {
  const n = intervals.length;
  if (n < 2) return 0;

  const xMean = (n - 1) / 2;
  const yMean = intervals.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * ((intervals[i] ?? 0) - yMean);
    denominator += (i - xMean) ** 2;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

export function createDecayBehaviorDetectWorker(): Worker {
  const signalDetectQueue = createQueue(QUEUES.E5_CHURN_SIGNAL_DETECT, { db: 5 });

  const { worker } = createWorker<DecayBehaviorDetectJobData>(
    QUEUES.E5_DECAY_BEHAVIOR_DETECT,
    async (job: Job<DecayBehaviorDetectJobData>): Promise<DecayBehaviorDetectResult> => {
      return withCognitiveSpan("e5:decay:behavior-detect", async () => {
        const { tenantId, clientId, nurturingStateId, orderIntervalsDays } = job.data;

        const { db, setSessionTenantId, goldNurturingState, eq, and } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        // Fetch nurturing state
        const [state] = await db
          .select({
            daysSinceLastOrder: goldNurturingState.daysSinceLastOrder,
            lastInteractionAt: goldNurturingState.lastInteractionAt,
          })
          .from(goldNurturingState)
          .where(
            and(
              eq(goldNurturingState.tenantId, tenantId),
              eq(goldNurturingState.id, nurturingStateId),
            ),
          )
          .limit(1);

        const daysSinceLastOrder = state?.daysSinceLastOrder ?? null;

        // Calculare daysSinceLastInteraction din lastInteractionAt
        let daysSinceLastInteraction: number | null = null;
        if (state?.lastInteractionAt) {
          const diffMs = Date.now() - new Date(state.lastInteractionAt).getTime();
          daysSinceLastInteraction = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        // Regression liniară pe intervalele furnizate (dacă sunt disponibile)
        const orderFrequencySlope =
          orderIntervalsDays && orderIntervalsDays.length >= 2
            ? linearRegressionSlope(orderIntervalsDays)
            : null;

        let communicationFadeDetected = false;
        let orderFrequencyDecayDetected = false;

        const context: SignalStrengthInputs = {};

        // COMMUNICATION_FADE: daysSinceLastInteraction > 30 SAU daysSinceLastOrder > 30
        const commFadeDays = daysSinceLastInteraction ?? daysSinceLastOrder;
        if (commFadeDays !== null && commFadeDays > 30) {
          communicationFadeDetected = true;
          context.daysSinceLastInteraction = commFadeDays;
        }

        // ORDER_FREQUENCY_DROP: daysSinceLastOrder > 60 SAU slope regression > 2 zile/interval
        if (
          (daysSinceLastOrder !== null && daysSinceLastOrder > 60) ||
          (orderFrequencySlope !== null && orderFrequencySlope > 2)
        ) {
          orderFrequencyDecayDetected = true;
          // Calculăm ratio implicit: dacă daysSinceLastOrder > 60 → freq actuală ≈ 0
          context.currentOrderFrequencyPerMonth = 0;
          context.averageOrderFrequencyPerMonth = 1; // ratio → 0 < 0.5 → detectat
        }

        const signalsTriggered =
          (communicationFadeDetected ? 1 : 0) + (orderFrequencyDecayDetected ? 1 : 0);

        if (signalsTriggered > 0) {
          await signalDetectQueue.add(
            "from-decay",
            { tenantId, clientId, nurturingStateId, context },
            { removeOnComplete: 1000 },
          );
        }

        job.log(
          `[B14] commFade=${communicationFadeDetected} orderDecay=${orderFrequencyDecayDetected} slope=${orderFrequencySlope?.toFixed(2) ?? "null"} signals=${signalsTriggered}`,
        );

        return {
          communicationFadeDetected,
          orderFrequencyDecayDetected,
          daysSinceLastOrder,
          daysSinceLastInteraction,
          orderFrequencySlope,
          signalsTriggered,
        };
      });
    },
    { concurrency: 20, db: 5 },
  );

  return worker;
}
