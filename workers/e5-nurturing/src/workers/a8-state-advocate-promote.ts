/**
 * a8-state-advocate-promote.ts — Worker A8: State Advocate Promote (Plan §X FAZA 9b)
 *
 * Queue: state:advocate:promote (REDIS_DB_E5=5)
 * Trigger: periodic check sau A1 (post order, dacă în LOYAL_CLIENT)
 *
 * Logică (Plan L2617):
 * - Verifică criterii ADVOCATE: ≥3 orders AND npsScore ≥ 8 AND successfulReferrals ≥ 2
 * - UPDATE currentState='ADVOCATE', isAdvocate=true
 * - Trigger referral:eligibility:check cu priority HIGH (E5-E, viitor)
 */
import type { Job, Worker } from "bullmq";
import {
  QUEUES,
  createWorker,
  createQueue,
  withCognitiveSpan,
  fsmTransitions,
} from "@cerniq/worker-shared";
import { checkAdvocateCriteria } from "../lib/nurturing-fsm.js";

export interface StateAdvocatePromoteJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
}

export interface StateAdvocatePromoteResult {
  promoted: boolean;
  reason?: string;
  nurturingStateId: string;
}

export function createStateAdvocatePromoteWorker(): Worker {
  const stateTransitionQueue = createQueue(QUEUES.E5_STATE_TRANSITION_EXECUTE, { db: 5 });
  // Coada E5-E Referrals (FAZA 9e, viitor) — enqueue cu priority HIGH
  const referralEligibilityCheckQueue = createQueue("referral:eligibility:check", { db: 5 });

  const { worker } = createWorker<StateAdvocatePromoteJobData>(
    QUEUES.E5_STATE_ADVOCATE_PROMOTE,
    async (job: Job<StateAdvocatePromoteJobData>): Promise<StateAdvocatePromoteResult> => {
      return withCognitiveSpan("e5:state:advocate-promote", async () => {
        const { tenantId, clientId, nurturingStateId } = job.data;

        const { db, setSessionTenantId, goldNurturingState, eq } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        const states = await db
          .select()
          .from(goldNurturingState)
          .where(eq(goldNurturingState.id, nurturingStateId))
          .limit(1);

        if (states.length === 0) {
          throw new Error(`NurturingState ${nurturingStateId} not found`);
        }

        const state = states[0];

        // Verifică că clientul e în LOYAL_CLIENT pentru promovare
        if (state.currentState !== "LOYAL_CLIENT") {
          job.log(`[A8] client=${clientId} not in LOYAL_CLIENT (is ${state.currentState}), skip`);
          return { promoted: false, reason: "NOT_IN_LOYAL_CLIENT", nurturingStateId };
        }

        // Verifică criterii ADVOCATE (Plan L2617):
        // ≥3 orders AND npsScore ≥ 8 AND successfulReferrals ≥ 2
        const qualifies = checkAdvocateCriteria({
          totalOrders: state.totalOrders ?? 0,
          npsScore: state.npsScore ?? null,
          successfulReferrals: state.successfulReferrals ?? 0,
        });

        if (!qualifies) {
          job.log(
            `[A8] client=${clientId} criteria NOT met: orders=${state.totalOrders} nps=${state.npsScore ?? "null"} referrals=${state.successfulReferrals}`,
          );
          return { promoted: false, reason: "CRITERIA_NOT_MET", nurturingStateId };
        }

        // Enqueue A6 pentru tranziția LOYAL_CLIENT → ADVOCATE
        await stateTransitionQueue.add(
          "transition",
          {
            tenantId,
            clientId,
            nurturingStateId,
            fromState: "LOYAL_CLIENT",
            toState: "ADVOCATE",
            reason: "ADVOCATE_CRITERIA_MET",
          },
          { removeOnComplete: 1000 },
        );

        // UPDATE isAdvocate = true imediat (optimistic)
        await db
          .update(goldNurturingState)
          .set({ isAdvocate: true, updatedAt: new Date() })
          .where(eq(goldNurturingState.id, nurturingStateId));

        // Metrică tranziție
        fsmTransitions.inc({ from: "LOYAL_CLIENT", to: "ADVOCATE" });

        // Trigger referral eligibility cu priority HIGH
        await referralEligibilityCheckQueue.add(
          "check",
          { tenantId, clientId, nurturingStateId, priority: "HIGH" },
          { priority: 1, removeOnComplete: 1000 },
        );

        job.log(
          `[A8] ADVOCATE promoted client=${clientId} orders=${state.totalOrders} nps=${state.npsScore ?? "null"} referrals=${state.successfulReferrals}`,
        );

        return { promoted: true, nurturingStateId };
      });
    },
    { concurrency: 10, db: 5 },
  );
  return worker;
}
