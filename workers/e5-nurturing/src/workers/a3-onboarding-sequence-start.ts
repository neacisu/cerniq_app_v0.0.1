/**
 * a3-onboarding-sequence-start.ts — Worker A3: Onboarding Sequence Start (Plan §X FAZA 9b)
 *
 * Queue: onboarding:sequence:start (REDIS_DB_E5=5)
 * Trigger: A1 (nou client ONBOARDING)
 *
 * Logică:
 * - Creează 3 pași onboarding: welcome (day 0), product guide (day 3), check-in (day 7)
 * - INSERT gold_nurturing_actions pentru fiecare pas
 * - Enqueue A4 cu delay BullMQ (delayed jobs) per pas
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

export interface OnboardingSequenceStartJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  orderId: string;
}

export interface OnboardingStep {
  actionType: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS" | "PHONE" | "IN_APP";
  delayDays: number;
  templateId: string;
}

const ONBOARDING_STEPS: ReadonlyArray<OnboardingStep> = [
  {
    actionType: "WELCOME_EMAIL",
    channel: "EMAIL",
    delayDays: 0,
    templateId: "onboarding-welcome-v1",
  },
  {
    actionType: "PRODUCT_GUIDE_EMAIL",
    channel: "EMAIL",
    delayDays: 3,
    templateId: "onboarding-product-guide-v1",
  },
  {
    actionType: "CHECK_IN_WA",
    channel: "WHATSAPP",
    delayDays: 7,
    templateId: "onboarding-checkin-v1",
  },
] as const;

export interface OnboardingSequenceStartResult {
  nurturingStateId: string;
  stepsCreated: number;
  actionIds: string[];
}

export function createOnboardingSequenceStartWorker(): Worker {
  const onboardingStepQueue = createQueue(QUEUES.E5_ONBOARDING_STEP_EXECUTE, { db: 5 });

  const { worker } = createWorker<OnboardingSequenceStartJobData>(
    QUEUES.E5_ONBOARDING_SEQUENCE_START,
    async (job: Job<OnboardingSequenceStartJobData>): Promise<OnboardingSequenceStartResult> => {
      return withCognitiveSpan("e5:onboarding:sequence-start", async () => {
        const { tenantId, clientId, nurturingStateId } = job.data;

        const { db, setSessionTenantId, goldNurturingActions } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        const actionIds: string[] = [];

        for (let stepIndex = 0; stepIndex < ONBOARDING_STEPS.length; stepIndex++) {
          const step = ONBOARDING_STEPS[stepIndex];

          const [action] = await db
            .insert(goldNurturingActions)
            .values({
              tenantId,
              nurturingStateId,
              actionType: step.actionType,
              channel: step.channel,
              status: "PENDING",
              templateId: step.templateId,
            })
            .returning({ id: goldNurturingActions.id });

          actionIds.push(action.id);

          const delayMs = step.delayDays * 24 * 60 * 60 * 1000;

          await onboardingStepQueue.add(
            "execute",
            {
              tenantId,
              clientId,
              nurturingStateId,
              actionId: action.id,
              stepIndex,
              totalSteps: ONBOARDING_STEPS.length,
              channel: step.channel,
              templateId: step.templateId,
              actionType: step.actionType,
            },
            { delay: delayMs, removeOnComplete: 1000 },
          );
        }

        job.log(
          `[A3] client=${clientId} steps=${actionIds.length} nurturingId=${nurturingStateId}`,
        );
        return { nurturingStateId, stepsCreated: actionIds.length, actionIds };
      });
    },
    { concurrency: 10, db: 5 },
  );
  return worker;
}
