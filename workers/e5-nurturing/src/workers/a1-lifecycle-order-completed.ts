/**
 * a1-lifecycle-order-completed.ts — Worker A1: Lifecycle Order Completed (Plan §X FAZA 9b)
 *
 * Queue: lifecycle:order:completed (REDIS_DB_E5=5)
 * Trigger: E4 order:delivered event (cross-etapa bridge)
 *
 * Logică:
 * - Dacă client NOU → INSERT gold_nurturing_state cu ONBOARDING → enqueue A3
 * - Dacă client EXISTENT → UPDATE totalOrders++, totalRevenue, lastInteractionAt → enqueue A2
 * - Special: dacă currentState=CHURNED → transition to REACTIVATED, enqueue A2
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

export interface OrderCompletedJobData {
  tenantId: string;
  clientId: string;
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
}

export interface OrderCompletedResult {
  action: "CREATED_ONBOARDING" | "UPDATED_EXISTING" | "REACTIVATED";
  nurturingStateId: string;
  clientId: string;
}

export function createLifecycleOrderCompletedWorker(): Worker {
  const onboardingStartQueue = createQueue(QUEUES.E5_ONBOARDING_SEQUENCE_START, { db: 5 });
  const stateEvaluateQueue = createQueue(QUEUES.E5_LIFECYCLE_STATE_EVALUATE, { db: 5 });
  const stateTransitionQueue = createQueue(QUEUES.E5_STATE_TRANSITION_EXECUTE, { db: 5 });

  const { worker } = createWorker<OrderCompletedJobData>(
    QUEUES.E5_LIFECYCLE_ORDER_COMPLETED,
    async (job: Job<OrderCompletedJobData>): Promise<OrderCompletedResult> => {
      return withCognitiveSpan("e5:lifecycle:order-completed", async () => {
        const { tenantId, clientId, orderId, orderAmount } = job.data;

        const { db, setSessionTenantId, goldNurturingState, eq, and } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        const existing = await db
          .select()
          .from(goldNurturingState)
          .where(
            and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, clientId)),
          )
          .limit(1);

        if (existing.length === 0) {
          // Nou client — INSERT + ONBOARDING
          const [inserted] = await db
            .insert(goldNurturingState)
            .values({
              tenantId,
              leadId: clientId,
              currentState: "ONBOARDING",
              totalOrders: 1,
              totalRevenue: String(orderAmount),
              lastInteractionAt: new Date(),
            })
            .returning({ id: goldNurturingState.id });

          await onboardingStartQueue.add(
            "start",
            { tenantId, clientId, nurturingStateId: inserted.id, orderId },
            { removeOnComplete: 1000 },
          );

          job.log(`[A1] NEW client=${clientId} state=ONBOARDING nurturingId=${inserted.id}`);
          return { action: "CREATED_ONBOARDING", nurturingStateId: inserted.id, clientId };
        }

        const current = existing[0];
        const currentOrders = (current.totalOrders ?? 0) + 1;
        const currentRevenue = (Number(current.totalRevenue ?? 0) + orderAmount).toFixed(2);

        // Special: CHURNED → REACTIVATED la nou ordin
        if (current.currentState === "CHURNED") {
          await db
            .update(goldNurturingState)
            .set({
              totalOrders: currentOrders,
              totalRevenue: currentRevenue,
              lastInteractionAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(goldNurturingState.id, current.id));

          await stateTransitionQueue.add(
            "transition",
            {
              tenantId,
              clientId,
              nurturingStateId: current.id,
              fromState: "CHURNED",
              toState: "REACTIVATED",
              reason: "ORDER_REACTIVATION",
            },
            { removeOnComplete: 1000 },
          );

          job.log(`[A1] REACTIVATED client=${clientId} orderId=${orderId}`);
          return { action: "REACTIVATED", nurturingStateId: current.id, clientId };
        }

        // Client existent normal
        await db
          .update(goldNurturingState)
          .set({
            totalOrders: currentOrders,
            totalRevenue: currentRevenue,
            lastInteractionAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(goldNurturingState.id, current.id));

        await stateEvaluateQueue.add(
          "evaluate",
          { tenantId, clientId, nurturingStateId: current.id },
          { removeOnComplete: 1000 },
        );

        job.log(
          `[A1] UPDATED client=${clientId} orders=${currentOrders} state=${current.currentState}`,
        );
        return { action: "UPDATED_EXISTING", nurturingStateId: current.id, clientId };
      });
    },
    { concurrency: 20, db: 5 },
  );
  return worker;
}
