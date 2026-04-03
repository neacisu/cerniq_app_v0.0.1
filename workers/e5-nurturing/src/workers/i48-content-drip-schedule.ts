/**
 * i48-content-drip-schedule.ts — Worker I48: Content Drip Schedule (FAZA 9h)
 *
 * Queue: content:drip:schedule | Cron: DAILY | Concurrency: 5
 *
 * Responsabilitate:
 *   - Procesează zilnic toate goldContentDrips active (per tenant sau global)
 *   - Identifică clienții în targetStates care au depășit daysAfterTrigger
 *   - Dedup: skip dacă acțiune cu același templateId trimisă în ultimele 7 zile
 *   - Enqueue I49 (content:drip:execute) pentru fiecare client eligibil
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldContentDrips,
  goldNurturingState,
  goldNurturingActions,
  eq,
  and,
  inArray,
  gte,
  sql,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Queue names (hardcodate)
// ---------------------------------------------------------------------------

const QUEUE_CONTENT_DRIP_SCHEDULE = "content:drip:schedule";
const QUEUE_CONTENT_DRIP_EXECUTE = "content:drip:execute";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ContentDripScheduleJobData {
  tenantId?: string;
}

export interface ContentDripScheduleResult {
  ok: boolean;
  enqueuedCount: number;
  dripsProcessed: number;
}

// Stările valide ale FSM-ului de nurturing (matching nurturingStateEnum)
type NurturingStateValue =
  | "ONBOARDING"
  | "NURTURING_ACTIVE"
  | "AT_RISK"
  | "CHURNED"
  | "REACTIVATED"
  | "LOYAL_CLIENT"
  | "ADVOCATE";

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createContentDripScheduleWorker(): Worker {
  const executeQueue = createQueue(QUEUE_CONTENT_DRIP_EXECUTE, { db: 5 });

  const { worker } = createWorker<ContentDripScheduleJobData>(
    QUEUE_CONTENT_DRIP_SCHEDULE,
    async (job: Job<ContentDripScheduleJobData>): Promise<ContentDripScheduleResult> => {
      return withCognitiveSpan("e5:content:drip-schedule", async () => {
        const { tenantId } = job.data;

        if (tenantId) {
          await setSessionTenantId(tenantId);
        }

        job.log(`[I48] Content drip schedule started tenantId=${tenantId ?? "ALL"}`);

        // ── 1. SELECT toate drip-urile active ─────────────────────────────
        const drips = await db
          .select()
          .from(goldContentDrips)
          .where(
            tenantId
              ? and(eq(goldContentDrips.isActive, true), eq(goldContentDrips.tenantId, tenantId))
              : eq(goldContentDrips.isActive, true),
          );

        let enqueuedCount = 0;

        for (const drip of drips) {
          // ── 2a. Parse targetStates din JSONB ───────────────────────────
          const targetStates = (drip.targetStates as NurturingStateValue[]) ?? [];
          if (targetStates.length === 0) continue;

          // ── 2b. SELECT clienți aflați în target states ─────────────────
          const clientStates = await db
            .select({
              id: goldNurturingState.id,
              leadId: goldNurturingState.leadId,
              lastInteractionAt: goldNurturingState.lastInteractionAt,
            })
            .from(goldNurturingState)
            .where(
              and(
                eq(goldNurturingState.tenantId, drip.tenantId),
                inArray(goldNurturingState.currentState, targetStates),
              ),
            );

          for (const clientState of clientStates) {
            // ── 2c. Calculează daysSinceInteraction ──────────────────────
            const daysSinceInteraction = Math.floor(
              (Date.now() - new Date(clientState.lastInteractionAt).getTime()) / 86_400_000,
            );

            if (daysSinceInteraction < drip.daysAfterTrigger) continue;

            // ── 2d. Dedup: skip dacă trimis în ultimele 7 zile ───────────
            const recentActions = await db
              .select({ id: goldNurturingActions.id })
              .from(goldNurturingActions)
              .where(
                and(
                  eq(goldNurturingActions.nurturingStateId, clientState.id),
                  eq(goldNurturingActions.templateId, drip.templateId),
                  gte(goldNurturingActions.executedAt, sql`NOW() - INTERVAL '7 days'`),
                ),
              )
              .limit(1);

            if (recentActions.length > 0) continue;

            // ── 2e. Enqueue I49 content:drip:execute ─────────────────────
            await executeQueue.add(
              "content-drip-execute",
              {
                tenantId: drip.tenantId,
                leadId: clientState.leadId,
                dripId: drip.id,
                stateId: clientState.id,
              },
              {
                jobId: `drip-${drip.id}-${clientState.leadId}-${Date.now()}`,
              },
            );

            enqueuedCount++;
          }
        }

        job.log(`[I48] Content drip schedule processed: ${enqueuedCount} jobs enqueued`);

        return { ok: true, enqueuedCount, dripsProcessed: drips.length };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
