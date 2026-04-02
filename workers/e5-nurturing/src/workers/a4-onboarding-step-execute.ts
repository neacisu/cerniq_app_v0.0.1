/**
 * a4-onboarding-step-execute.ts — Worker A4: Onboarding Step Execute (Plan §X FAZA 9b)
 *
 * Queue: onboarding:step:execute (REDIS_DB_E5=5)
 * Trigger: A3 (cu delay per pas onboarding)
 *
 * Logică:
 * - Execută pasul onboarding (trimite email/WA cu templateId)
 * - UPDATE gold_nurturing_actions SET status='SENT', executedAt=now()
 * - Dacă ultimul pas → enqueue A5 (onboarding:complete:check)
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

export interface OnboardingStepExecuteJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  actionId: string;
  stepIndex: number;
  totalSteps: number;
  channel: "EMAIL" | "WHATSAPP" | "SMS" | "PHONE" | "IN_APP";
  templateId: string;
  actionType: string;
}

export interface OnboardingStepExecuteResult {
  actionId: string;
  stepIndex: number;
  executed: boolean;
  isLastStep: boolean;
}

export function createOnboardingStepExecuteWorker(): Worker {
  const onboardingCompleteCheckQueue = createQueue(QUEUES.E5_ONBOARDING_COMPLETE_CHECK, {
    db: 5,
  });

  const { worker } = createWorker<OnboardingStepExecuteJobData>(
    QUEUES.E5_ONBOARDING_STEP_EXECUTE,
    async (job: Job<OnboardingStepExecuteJobData>): Promise<OnboardingStepExecuteResult> => {
      return withCognitiveSpan("e5:onboarding:step-execute", async () => {
        const {
          tenantId,
          clientId,
          nurturingStateId,
          actionId,
          stepIndex,
          totalSteps,
          channel,
          templateId,
          actionType,
        } = job.data;

        const { db, setSessionTenantId, goldNurturingActions, eq } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        // Verifică că acțiunea nu a fost deja executată (idempotent)
        const actions = await db
          .select()
          .from(goldNurturingActions)
          .where(eq(goldNurturingActions.id, actionId))
          .limit(1);

        if (actions.length === 0) {
          throw new Error(`Action ${actionId} not found`);
        }

        const action = actions[0];
        if (action.status === "SENT" || action.status === "DELIVERED") {
          job.log(`[A4] action=${actionId} already executed, skip`);
          const isLastStep = stepIndex === totalSteps - 1;
          return { actionId, stepIndex, executed: false, isLastStep };
        }

        // Execuție efectivă — în producție se va apela serviciul de messaging real
        // Aici marcăm direct SENT (integrarea cu WA/email se face în E2 worker-outreach)
        job.log(
          `[A4] execute channel=${channel} template=${templateId} type=${actionType} client=${clientId}`,
        );

        await db
          .update(goldNurturingActions)
          .set({ status: "SENT", executedAt: new Date(), updatedAt: new Date() })
          .where(eq(goldNurturingActions.id, actionId));

        const isLastStep = stepIndex === totalSteps - 1;

        if (isLastStep) {
          await onboardingCompleteCheckQueue.add(
            "check",
            { tenantId, clientId, nurturingStateId },
            { removeOnComplete: 1000 },
          );
          job.log(`[A4] last step done → enqueue A5 for nurturingId=${nurturingStateId}`);
        }

        return { actionId, stepIndex, executed: true, isLastStep };
      });
    },
    { concurrency: 20, db: 5 },
  );
  return worker;
}
