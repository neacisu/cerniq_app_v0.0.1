/**
 * i49-content-drip-execute.ts — Worker I49: Content Drip Execute (FAZA 9h)
 *
 * Queue: content:drip:execute | Concurrency: 10
 *
 * Responsabilitate:
 *   - Validează că drip-ul există și e activ
 *   - INSERT goldNurturingActions cu status="PENDING"
 *   - Enqueue I50 (content:template:render) pentru randarea și trimiterea conținutului
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldContentDrips,
  goldNurturingActions,
  eq,
  and,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Queue names (hardcodate)
// ---------------------------------------------------------------------------

const QUEUE_CONTENT_DRIP_EXECUTE = "content:drip:execute";
const QUEUE_CONTENT_TEMPLATE_RENDER = "content:template:render";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ContentDripExecuteJobData {
  tenantId: string;
  leadId: string;
  dripId: string;
  stateId: string;
}

export interface ContentDripExecuteResult {
  ok: boolean;
  actionId?: string;
  skipped?: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createContentDripExecuteWorker(): Worker {
  const templateRenderQueue = createQueue(QUEUE_CONTENT_TEMPLATE_RENDER, { db: 5 });

  const { worker } = createWorker<ContentDripExecuteJobData>(
    QUEUE_CONTENT_DRIP_EXECUTE,
    async (job: Job<ContentDripExecuteJobData>): Promise<ContentDripExecuteResult> => {
      return withCognitiveSpan("e5:content:drip-execute", async () => {
        const { tenantId, leadId, dripId, stateId } = job.data;

        await setSessionTenantId(tenantId);

        job.log(`[I49] Content drip execute: leadId=${leadId} dripId=${dripId}`);

        // ── 1. SELECT drip și verifică isActive ───────────────────────────
        const dripRows = await db
          .select()
          .from(goldContentDrips)
          .where(and(eq(goldContentDrips.id, dripId), eq(goldContentDrips.tenantId, tenantId)))
          .limit(1);

        if (dripRows.length === 0 || !dripRows[0].isActive) {
          job.log(`[I49] Drip not found or inactive: dripId=${dripId} — skip`);
          return { ok: true, skipped: true };
        }

        const drip = dripRows[0];

        // ── 2. INSERT goldNurturingActions ────────────────────────────────
        const inserted = await db
          .insert(goldNurturingActions)
          .values({
            tenantId,
            nurturingStateId: stateId,
            actionType: "CONTENT_DRIP",
            channel: drip.channel,
            status: "PENDING",
            templateId: drip.templateId,
            executedAt: new Date(),
          })
          .returning({ id: goldNurturingActions.id });

        if (inserted.length === 0) {
          throw new Error(`[I49] INSERT goldNurturingActions returned no rows`);
        }

        const actionId = inserted[0].id;

        job.log(`[I49] Action created: actionId=${actionId} channel=${drip.channel}`);

        // ── 3. Enqueue I50 content:template:render ────────────────────────
        await templateRenderQueue.add(
          "content-template-render",
          {
            tenantId,
            leadId,
            actionId,
            templateId: drip.templateId,
            channel: drip.channel,
          },
          {
            jobId: `template-render-${actionId}`,
          },
        );

        job.log(`[I49] Content drip execute leadId=${leadId} templateId=${drip.templateId}`);

        return { ok: true, actionId };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
    },
  );

  return worker;
}
