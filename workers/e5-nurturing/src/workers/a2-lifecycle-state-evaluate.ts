/**
 * a2-lifecycle-state-evaluate.ts — Worker A2: Lifecycle State Evaluate (Plan §X FAZA 9b)
 *
 * Queue: lifecycle:state:evaluate (REDIS_DB_E5=5)
 * Trigger: A1 (order completed) sau periodic / signal-triggered
 *
 * Logică:
 * - Evaluează snapshot client: churnRiskScore, totalOrders, npsScore, referrals, days
 * - Calculează daysSinceLastOrder (actualizează în DB)
 * - Dacă există tranziție validă → enqueue A6
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { evaluateTransition, isValidNurturingState } from "../lib/nurturing-fsm.js";

export interface StateEvaluateJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
}

export interface StateEvaluateResult {
  evaluated: boolean;
  transitionEnqueued: boolean;
  currentState: string;
  proposedTransition?: { toState: string; reason: string };
}

export function createLifecycleStateEvaluateWorker(): Worker {
  const stateTransitionQueue = createQueue(QUEUES.E5_STATE_TRANSITION_EXECUTE, { db: 5 });

  const { worker } = createWorker<StateEvaluateJobData>(
    QUEUES.E5_LIFECYCLE_STATE_EVALUATE,
    async (job: Job<StateEvaluateJobData>): Promise<StateEvaluateResult> => {
      return withCognitiveSpan("e5:lifecycle:state-evaluate", async () => {
        const { tenantId, clientId, nurturingStateId } = job.data;

        const { db, setSessionTenantId, goldNurturingState, goldChurnSignals, eq, and, isNull } =
          await import("@cerniq/db");
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
        const currentState = state.currentState;

        if (!isValidNurturingState(currentState)) {
          throw new Error(`Unknown FSM state: ${currentState}`);
        }

        // Calculează daysSinceLastOrder
        const lastInteraction = state.lastInteractionAt
          ? new Date(state.lastInteractionAt)
          : new Date();
        const daysSinceLastOrder = Math.floor(
          (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24),
        );

        // UPDATE daysSinceLastOrder în DB
        await db
          .update(goldNurturingState)
          .set({ daysSinceLastOrder, updatedAt: new Date() })
          .where(eq(goldNurturingState.id, nurturingStateId));

        // Verifică semnale churn active
        const activeSignals = await db
          .select({ id: goldChurnSignals.id })
          .from(goldChurnSignals)
          .where(
            and(
              eq(goldChurnSignals.tenantId, tenantId),
              eq(goldChurnSignals.leadId, clientId),
              eq(goldChurnSignals.isActive, true),
              isNull(goldChurnSignals.resolvedAt),
            ),
          )
          .limit(1);

        const snapshot = {
          currentState,
          churnRiskScore: state.churnRiskScore ?? 0,
          totalOrders: state.totalOrders ?? 0,
          npsScore: state.npsScore ?? null,
          successfulReferrals: state.successfulReferrals ?? 0,
          daysSinceLastOrder,
          hasActiveChurnSignals: activeSignals.length > 0,
        };

        const decision = evaluateTransition(snapshot);

        if (!decision) {
          job.log(`[A2] client=${clientId} state=${currentState} no-transition`);
          return { evaluated: true, transitionEnqueued: false, currentState };
        }

        await stateTransitionQueue.add(
          "transition",
          {
            tenantId,
            clientId,
            nurturingStateId,
            fromState: currentState,
            toState: decision.toState,
            reason: decision.reason,
          },
          { removeOnComplete: 1000 },
        );

        job.log(
          `[A2] client=${clientId} ${currentState} → ${decision.toState} reason=${decision.reason}`,
        );

        return {
          evaluated: true,
          transitionEnqueued: true,
          currentState,
          proposedTransition: { toState: decision.toState, reason: decision.reason },
        };
      });
    },
    { concurrency: 30, db: 5 },
  );
  return worker;
}
