/**
 * a6-state-transition-execute.ts — Worker A6: State Transition Execute (Plan §X FAZA 9b)
 *
 * Queue: state:transition:execute (REDIS_DB_E5=5)
 * Trigger: A2 (evaluate), A5 (onboarding complete), A1 (reactivation)
 *
 * Logică:
 * - Validează tranziția vs VALID_TRANSITIONS (FSM engine)
 * - UPDATE gold_nurturing_state SET currentState=toState
 * - INSERT gold_nurturing_actions cu actionType='STATE_TRANSITION'
 * - Side effects per tranziție:
 *   → AT_RISK: enqueue hitl:churn:intervention (E5-G, viitor)
 *   → CHURNED: enqueue winback:campaign:create (E5-F, viitor)
 *   → LOYAL_CLIENT: enqueue referral:eligibility:check (E5-E, viitor)
 * - Enqueue A7 (state:metrics:update) post-transition
 */
import type { Job, Worker } from "bullmq";
import {
  QUEUES,
  createWorker,
  createQueue,
  withCognitiveSpan,
  fsmTransitions,
} from "@cerniq/worker-shared";
import { validateTransition, isValidNurturingState } from "../lib/nurturing-fsm.js";

export interface StateTransitionExecuteJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  fromState: string;
  toState: string;
  reason: string;
}

export interface StateTransitionExecuteResult {
  success: boolean;
  previousState: string;
  newState: string;
  sideEffects: string[];
  error?: string;
}

export function createStateTransitionExecuteWorker(): Worker {
  const metricsUpdateQueue = createQueue(QUEUES.E5_STATE_METRICS_UPDATE, { db: 5 });
  // Cozi E5 viitoare (E5-E Referrals, E5-F Winback, E5-G HITL) — vor fi înregistrate în FAZA 9c-9g
  const hitlChurnInterventionQueue = createQueue("hitl:churn:intervention", { db: 5 });
  const winbackCampaignCreateQueue = createQueue("winback:campaign:create", { db: 5 });
  const referralEligibilityCheckQueue = createQueue("referral:eligibility:check", { db: 5 });

  const { worker } = createWorker<StateTransitionExecuteJobData>(
    QUEUES.E5_STATE_TRANSITION_EXECUTE,
    async (job: Job<StateTransitionExecuteJobData>): Promise<StateTransitionExecuteResult> => {
      return withCognitiveSpan("e5:state:transition-execute", async () => {
        const { tenantId, clientId, nurturingStateId, fromState, toState, reason } = job.data;

        if (!isValidNurturingState(fromState) || !isValidNurturingState(toState)) {
          throw new Error(`Invalid FSM state: fromState=${fromState} toState=${toState}`);
        }

        // Validare tranziție FSM
        if (!validateTransition(fromState, toState)) {
          const err = `FSM invalid: ${fromState} → ${toState} (reason=${reason})`;
          job.log(`[A6] REJECTED ${err}`);
          return {
            success: false,
            previousState: fromState,
            newState: toState,
            sideEffects: [],
            error: err,
          };
        }

        const { db, setSessionTenantId, goldNurturingState, goldNurturingActions, eq } =
          await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        // Fetch stare curentă pentru verificare de concurență
        const states = await db
          .select()
          .from(goldNurturingState)
          .where(eq(goldNurturingState.id, nurturingStateId))
          .limit(1);

        if (states.length === 0) {
          throw new Error(`NurturingState ${nurturingStateId} not found`);
        }

        const current = states[0];

        // Idempotency check: dacă deja in starea dorită, skip
        if (current.currentState === toState) {
          job.log(`[A6] already in state=${toState}, skip`);
          return {
            success: true,
            previousState: fromState,
            newState: toState,
            sideEffects: ["IDEMPOTENT_SKIP"],
          };
        }

        // Verificare că from state-ul din job coincide cu cel actual (race condition guard)
        if (current.currentState !== fromState) {
          job.log(
            `[A6] state changed concurrently: expected=${fromState} actual=${current.currentState}`,
          );
          return {
            success: false,
            previousState: current.currentState,
            newState: toState,
            sideEffects: [],
            error: `Concurrent state change: expected ${fromState} but got ${current.currentState}`,
          };
        }

        // Execuție tranziție
        await db
          .update(goldNurturingState)
          .set({ currentState: toState, updatedAt: new Date() })
          .where(eq(goldNurturingState.id, nurturingStateId));

        await db.insert(goldNurturingActions).values({
          tenantId,
          nurturingStateId,
          actionType: "STATE_TRANSITION",
          channel: "IN_APP",
          status: "DELIVERED",
          templateId: null,
          executedAt: new Date(),
        });

        // Metrică FSM transitions
        fsmTransitions.inc({ from: fromState, to: toState });

        // Side effects per tranziție
        const sideEffects: string[] = [];

        if (toState === "AT_RISK") {
          await hitlChurnInterventionQueue.add(
            "intervention",
            { tenantId, clientId, nurturingStateId, reason: "CHURN_RISK_ELEVATED" },
            { removeOnComplete: 1000 },
          );
          sideEffects.push("HITL_CHURN_INTERVENTION_ENQUEUED");
        }

        if (toState === "CHURNED") {
          await winbackCampaignCreateQueue.add(
            "create",
            { tenantId, clientId, nurturingStateId, reason: "CLIENT_CHURNED" },
            { removeOnComplete: 1000 },
          );
          sideEffects.push("WINBACK_CAMPAIGN_ENQUEUED");
        }

        if (toState === "LOYAL_CLIENT") {
          await referralEligibilityCheckQueue.add(
            "check",
            { tenantId, clientId, nurturingStateId },
            { removeOnComplete: 1000 },
          );
          sideEffects.push("REFERRAL_ELIGIBILITY_ENQUEUED");
        }

        // Post-transition: actualizare metrici Prometheus (A7)
        await metricsUpdateQueue.add(
          "update",
          { tenantId, clientId, nurturingStateId, fromState, toState },
          { removeOnComplete: 1000 },
        );

        job.log(
          `[A6] TRANSITION ${fromState} → ${toState} client=${clientId} sideEffects=${sideEffects.join(",")}`,
        );

        return { success: true, previousState: fromState, newState: toState, sideEffects };
      });
    },
    { concurrency: 20, db: 5 },
  );
  return worker;
}
