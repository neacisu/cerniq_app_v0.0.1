/**
 * a5-onboarding-complete-check.ts — Worker A5: Onboarding Complete Check (Plan §X FAZA 9b)
 *
 * Queue: onboarding:complete:check (REDIS_DB_E5=5)
 * Trigger: A4 (ultimul pas executat)
 *
 * Logică:
 * - Verifică că TOATE pasele onboarding sunt executate (status SENT sau DELIVERED)
 * - Dacă DA → UPDATE onboardingCompletedAt, enqueue A6 ONBOARDING → NURTURING_ACTIVE
 * - Dacă NU (unele pending) → nu face nimic, A4 va reîncerca
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

export interface OnboardingCompleteCheckJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
}

export interface OnboardingCompleteCheckResult {
  complete: boolean;
  totalSteps: number;
  executedSteps: number;
  transitionEnqueued: boolean;
}

export function createOnboardingCompleteCheckWorker(): Worker {
  const stateTransitionQueue = createQueue(QUEUES.E5_STATE_TRANSITION_EXECUTE, { db: 5 });

  const { worker } = createWorker<OnboardingCompleteCheckJobData>(
    QUEUES.E5_ONBOARDING_COMPLETE_CHECK,
    async (job: Job<OnboardingCompleteCheckJobData>): Promise<OnboardingCompleteCheckResult> => {
      return withCognitiveSpan("e5:onboarding:complete-check", async () => {
        const { tenantId, clientId, nurturingStateId } = job.data;

        const { db, setSessionTenantId, goldNurturingActions, goldNurturingState, eq, and } =
          await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        // Verifică starea curentă — trebuie să fie ONBOARDING
        const states = await db
          .select()
          .from(goldNurturingState)
          .where(eq(goldNurturingState.id, nurturingStateId))
          .limit(1);

        if (states.length === 0 || states[0].currentState !== "ONBOARDING") {
          job.log(`[A5] nurturingId=${nurturingStateId} not in ONBOARDING, skip`);
          return { complete: false, totalSteps: 0, executedSteps: 0, transitionEnqueued: false };
        }

        // Fetches all onboarding actions
        const allActions = await db
          .select()
          .from(goldNurturingActions)
          .where(
            and(
              eq(goldNurturingActions.tenantId, tenantId),
              eq(goldNurturingActions.nurturingStateId, nurturingStateId),
            ),
          );

        const totalSteps = allActions.length;
        const executedSteps = allActions.filter(
          (a) => a.status === "SENT" || a.status === "DELIVERED",
        ).length;

        if (totalSteps === 0 || executedSteps < totalSteps) {
          job.log(`[A5] onboarding incomplete: ${executedSteps}/${totalSteps} client=${clientId}`);
          return { complete: false, totalSteps, executedSteps, transitionEnqueued: false };
        }

        // Toate pasele complete — trigger tranziție ONBOARDING → NURTURING_ACTIVE
        await db
          .update(goldNurturingState)
          .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
          .where(eq(goldNurturingState.id, nurturingStateId));

        await stateTransitionQueue.add(
          "transition",
          {
            tenantId,
            clientId,
            nurturingStateId,
            fromState: "ONBOARDING",
            toState: "NURTURING_ACTIVE",
            reason: "ONBOARDING_COMPLETE",
          },
          { removeOnComplete: 1000 },
        );

        job.log(
          `[A5] COMPLETE ${executedSteps}/${totalSteps} client=${clientId} → NURTURING_ACTIVE`,
        );
        return { complete: true, totalSteps, executedSteps, transitionEnqueued: true };
      });
    },
    { concurrency: 10, db: 5 },
  );
  return worker;
}
