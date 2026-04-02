/**
 * a7-state-metrics-update.ts — Worker A7: State Metrics Update (Plan §X FAZA 9b)
 *
 * Queue: state:metrics:update (REDIS_DB_E5=5)
 * Trigger: A6 (post-transition)
 *
 * Logică:
 * - UPDATE Prometheus gauge: nurturing_clients_by_state
 * - Recalculare daysSinceLastOrder
 * - Log structurat: nurturing.state.transition
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";
import { nurturingClientsByState, nurturingAtRiskCount } from "../lib/e5-metrics.js";

export interface StateMetricsUpdateJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  fromState: string;
  toState: string;
}

export interface StateMetricsUpdateResult {
  tenantId: string;
  fromState: string;
  toState: string;
  metricsUpdated: boolean;
}

export function createStateMetricsUpdateWorker(): Worker {
  const { worker } = createWorker<StateMetricsUpdateJobData>(
    QUEUES.E5_STATE_METRICS_UPDATE,
    async (job: Job<StateMetricsUpdateJobData>): Promise<StateMetricsUpdateResult> => {
      return withCognitiveSpan("e5:state:metrics-update", async () => {
        const { tenantId, clientId, nurturingStateId, fromState, toState } = job.data;

        const { db, setSessionTenantId, goldNurturingState, eq } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        // Recalcul daysSinceLastOrder
        const states = await db
          .select()
          .from(goldNurturingState)
          .where(eq(goldNurturingState.id, nurturingStateId))
          .limit(1);

        if (states.length > 0) {
          const state = states[0];
          const lastInteraction = state.lastInteractionAt
            ? new Date(state.lastInteractionAt)
            : new Date();
          const daysSinceLastOrder = Math.floor(
            (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24),
          );

          await db
            .update(goldNurturingState)
            .set({ daysSinceLastOrder, updatedAt: new Date() })
            .where(eq(goldNurturingState.id, nurturingStateId));
        }

        // Actualizare Prometheus gauge: decrement fromState, increment toState
        nurturingClientsByState.dec({ tenant_id: tenantId, state: fromState });
        nurturingClientsByState.inc({ tenant_id: tenantId, state: toState });

        // Update AT_RISK specific gauge
        if (fromState === "AT_RISK") nurturingAtRiskCount.dec({ tenant_id: tenantId });
        if (toState === "AT_RISK") nurturingAtRiskCount.inc({ tenant_id: tenantId });

        // Log structurat conform plan
        job.log(
          JSON.stringify({
            event: "nurturing.state.transition",
            tenantId,
            clientId,
            fromState,
            toState,
            timestamp: new Date().toISOString(),
          }),
        );

        return { tenantId, fromState, toState, metricsUpdated: true };
      });
    },
    { concurrency: 50, db: 5 },
  );
  return worker;
}
