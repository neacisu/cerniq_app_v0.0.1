/**
 * f33-winback-step-execute.ts — Worker F33: Winback Step Execute (FAZA 9f)
 *
 * Queue: winback:step:execute (REDIS_DB_E5=5)
 * Timeout: 60s
 * Concurrency: 5
 *
 * Responsabilitate:
 *   - Execută pasul curent din campania de winback
 *   - Înregistrează acțiunea în gold_nurturing_actions
 *   - Marchează pasul ca executed și enqueue-ează pasul următor cu delay corect
 *   - La final → Enqueue F35 (winback:result:track)
 *
 * Step delays (ms între pașii consecutivi):
 *   Day 0  → 0ms
 *   Day 3  → 3 * 24h = 259_200_000ms
 *   Day 7  → 4 * 24h = 345_600_000ms (7-3=4 zile după pasul anterior)
 *   Day 14 → 7 * 24h = 604_800_000ms (14-7=7 zile după pasul anterior)
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldWinbackCampaigns,
  goldNurturingState,
  goldNurturingActions,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface WinbackStepExecuteJobData {
  tenantId: string;
  campaignId: string;
  correlationId?: string;
}

export interface WinbackStepExecuteResult {
  ok: boolean;
  campaignId: string;
  stepExecuted: number;
  stepAction: string;
  nextStepScheduled: boolean;
  campaignCompleted: boolean;
}

// Tip intern pentru un step
interface WinbackStep {
  day: number;
  action: string;
  executed: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createWinbackStepExecuteWorker(): Worker {
  const stepExecuteQueue = createQueue("winback:step:execute", { db: 5 });
  const offerGenerateQueue = createQueue("winback:offer:generate", { db: 5 });
  const resultTrackQueue = createQueue("winback:result:track", { db: 5 });
  const escalateHitlQueue = createQueue("winback:escalate:hitl", { db: 5 });

  const { worker } = createWorker<WinbackStepExecuteJobData>(
    "winback:step:execute",
    async (job: Job<WinbackStepExecuteJobData>): Promise<WinbackStepExecuteResult> => {
      return withCognitiveSpan("e5:winback:step-execute", async () => {
        const { tenantId, campaignId } = job.data;

        await setSessionTenantId(tenantId);

        job.log(`[F33] Winback step execute: campaignId=${campaignId}`);

        // ── 1. SELECT campania ────────────────────────────────────────────
        const campaignRows = await db
          .select({
            steps: goldWinbackCampaigns.steps,
            currentStep: goldWinbackCampaigns.currentStep,
            status: goldWinbackCampaigns.status,
            clientId: goldWinbackCampaigns.clientId,
          })
          .from(goldWinbackCampaigns)
          .where(
            and(
              eq(goldWinbackCampaigns.id, campaignId),
              eq(goldWinbackCampaigns.tenantId, tenantId),
            ),
          )
          .limit(1);

        if (campaignRows.length === 0) {
          throw new Error(`[F33] Campaign not found: campaignId=${campaignId}`);
        }

        const { status, clientId } = campaignRows[0];
        const currentStep = campaignRows[0].currentStep;
        const steps = campaignRows[0].steps as WinbackStep[];

        // ── 2. GUARD: campanie terminată/anulată/pausată ──────────────────
        if (status === "COMPLETED" || status === "CANCELLED" || status === "PAUSED") {
          job.log(`[F33] Campaign ${campaignId} is ${status} — skipping`);
          return {
            ok: true,
            campaignId,
            stepExecuted: currentStep,
            stepAction: "SKIPPED",
            nextStepScheduled: false,
            campaignCompleted: true,
          };
        }

        // ── 3. Dacă nu mai sunt pași → marchează COMPLETED ────────────────
        if (currentStep >= steps.length) {
          await db
            .update(goldWinbackCampaigns)
            .set({ status: "COMPLETED", updatedAt: new Date() })
            .where(
              and(
                eq(goldWinbackCampaigns.id, campaignId),
                eq(goldWinbackCampaigns.tenantId, tenantId),
              ),
            );

          await resultTrackQueue.add(
            "winback-result-track",
            { tenantId, campaignId, clientId },
            { jobId: `winback-result-${tenantId}-${campaignId}` },
          );

          job.log(`[F33] Campaign ${campaignId} completed — all steps done`);
          return {
            ok: true,
            campaignId,
            stepExecuted: currentStep,
            stepAction: "COMPLETED",
            nextStepScheduled: false,
            campaignCompleted: true,
          };
        }

        const step = steps[currentStep];
        if (!step) {
          throw new Error(`[F33] Step ${currentStep} not found in campaign ${campaignId}`);
        }

        job.log(`[F33] Executing step ${currentStep}: action=${step.action}, day=${step.day}`);

        // ── 4. SELECT goldNurturingState pentru nurturingStateId ──────────
        const nurturingRows = await db
          .select({ id: goldNurturingState.id })
          .from(goldNurturingState)
          .where(
            and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, clientId)),
          )
          .limit(1);

        if (nurturingRows.length === 0) {
          throw new Error(
            `[F33] NurturingState not found for clientId=${clientId}, tenantId=${tenantId}`,
          );
        }

        const nurturingStateId = nurturingRows[0].id;

        // ── 5. Determină channel și actionType pe baza step.action ─────────
        let channel: "EMAIL" | "WHATSAPP" | "PHONE";
        let actionType: string;

        switch (step.action) {
          case "INITIAL_EMAIL":
            channel = "EMAIL";
            actionType = "WINBACK_INITIAL_EMAIL";
            break;
          case "WA_MESSAGE":
            channel = "WHATSAPP";
            actionType = "WINBACK_WA_MESSAGE";
            break;
          case "OFFER":
            channel = "EMAIL";
            actionType = "WINBACK_OFFER";
            break;
          case "PHONE_CALL":
            channel = "PHONE";
            actionType = "WINBACK_PHONE_CALL";
            break;
          case "FINAL_EMAIL":
            channel = "EMAIL";
            actionType = "WINBACK_FINAL_EMAIL";
            break;
          default:
            channel = "EMAIL";
            actionType = `WINBACK_${step.action}`;
        }

        // ── 6. INSERT goldNurturingActions ────────────────────────────────
        await db.insert(goldNurturingActions).values({
          tenantId,
          nurturingStateId,
          actionType,
          channel,
          status: "PENDING",
          executedAt: new Date(),
        });

        // ── 7. Acțiuni speciale per tip de step ───────────────────────────
        if (step.action === "OFFER") {
          await offerGenerateQueue.add(
            "winback-offer-generate",
            { tenantId, campaignId, correlationId: job.data.correlationId },
            { jobId: `winback-offer-${tenantId}-${campaignId}-step${currentStep}` },
          );
          job.log(`[F33] Enqueued winback:offer:generate for campaignId=${campaignId}`);
        } else if (step.action === "PHONE_CALL") {
          await escalateHitlQueue.add(
            "winback-phone-hitl",
            { tenantId, campaignId, clientId, stepAction: "PHONE_CALL" },
            { jobId: `winback-phone-hitl-${tenantId}-${campaignId}-step${currentStep}` },
          );
          job.log(`[F33] Enqueued HITL for PHONE_CALL: campaignId=${campaignId}`);
        }

        // ── 8. Marchează pasul curent ca executed ─────────────────────────
        const updatedSteps = steps.map((s, idx) =>
          idx === currentStep ? { ...s, executed: true } : s,
        );
        const nextStepIdx = currentStep + 1;

        await db
          .update(goldWinbackCampaigns)
          .set({
            steps: updatedSteps,
            currentStep: nextStepIdx,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(goldWinbackCampaigns.id, campaignId),
              eq(goldWinbackCampaigns.tenantId, tenantId),
            ),
          );

        job.log(`[F33] Step ${currentStep} marked executed, currentStep → ${nextStepIdx}`);

        // ── 9. Enqueue pasul următor cu delay corect ──────────────────────
        let nextStepScheduled = false;

        if (nextStepIdx < steps.length) {
          const nextStep = steps[nextStepIdx];
          if (nextStep) {
            const currentDayValue = step.day;
            const nextDayValue = nextStep.day;
            const delayMs = (nextDayValue - currentDayValue) * 24 * 60 * 60 * 1000;

            await stepExecuteQueue.add(
              "winback-step-execute",
              { tenantId, campaignId, correlationId: job.data.correlationId },
              {
                jobId: `winback-step-${nextStepIdx}-${tenantId}-${campaignId}`,
                delay: delayMs,
              },
            );

            nextStepScheduled = true;
            job.log(
              `[F33] Enqueued step ${nextStepIdx} (action=${nextStep.action}) with delay=${delayMs}ms`,
            );
          }
        } else {
          // Nu mai sunt pași — campania va fi marcată COMPLETED la următoarea invocare
          await resultTrackQueue.add(
            "winback-result-track",
            { tenantId, campaignId, clientId },
            { jobId: `winback-result-${tenantId}-${campaignId}` },
          );
          job.log(`[F33] Last step executed — enqueued winback:result:track`);
        }

        return {
          ok: true,
          campaignId,
          stepExecuted: currentStep,
          stepAction: step.action,
          nextStepScheduled,
          campaignCompleted: false,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
