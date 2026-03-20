import { type Processor } from "bullmq";
import { db, setSessionTenantId, sql } from "@cerniq/db";
import {
  createQueue,
  validateJobData,
  hitlSlaBreachTotal,
  queueDepth,
  queueRegistry,
  getRetryStrategy,
} from "@cerniq/worker-shared";
import { z } from "zod";

export type PipelineMonitorJobData = {
  tenantId: string;
  correlationId?: string;
};

const pipelineMonitorJobDataSchema = z.object({
  tenantId: z.uuid(),
  correlationId: z.string().trim().min(1).optional(),
});

export const pipelineMonitorProcessor: Processor<PipelineMonitorJobData> = async (job) => {
  validateJobData(pipelineMonitorJobDataSchema, job.data, {
    queueName: "pipeline:monitor",
    jobId: job.id,
  });
  await setSessionTenantId(job.data.tenantId);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const now = new Date();

  const stalled = await db.query.silverCompanies.findMany({
    where: (t, { and, eq, lt }) =>
      and(
        eq(t.tenantId, job.data.tenantId),
        eq(t.enrichmentStatus, "in_progress"),
        lt(t.updatedAt, oneHourAgo),
      ),
  });
  const stuck = await db.query.silverCompanies.findMany({
    where: (t, { and, eq, isNull, lt }) =>
      and(
        eq(t.tenantId, job.data.tenantId),
        eq(t.promotionStatus, "eligible"),
        isNull(t.promotedToGoldId),
        lt(t.updatedAt, thirtyMinutesAgo),
      ),
  });
  const breachedApprovals = await db.query.approvalTasks.findMany({
    where: (t) =>
      sql`${t.tenantId} = ${job.data.tenantId}
        AND ${t.status} IN ('pending', 'assigned', 'escalated')
        AND (
          (${t.dueAt} IS NOT NULL AND ${t.dueAt} < ${now})
          OR (${t.expiresAt} IS NOT NULL AND ${t.expiresAt} < ${now})
        )`,
  });

  const orchestrator = createQueue("pipeline:orchestrate");
  const orchestratorRetry = getRetryStrategy("pipeline:orchestrate");
  for (const c of stalled) {
    await orchestrator.add(
      "re-orchestrate",
      {
        tenantId: job.data.tenantId,
        companyId: c.id,
        stage: "post_validation",
        correlationId: job.data.correlationId,
      },
      orchestratorRetry,
    );
  }
  await orchestrator.close();

  const promoter = createQueue("pipeline:promote:gold");
  const promoterRetry = getRetryStrategy("pipeline:promote:gold");
  for (const c of stuck) {
    await promoter.add(
      "re-promote",
      {
        tenantId: job.data.tenantId,
        companyId: c.id,
        correlationId: job.data.correlationId,
      },
      promoterRetry,
    );
  }
  await promoter.close();

  const hitlEscalation = createQueue("hitl:escalate");
  const hitlRetry = getRetryStrategy("hitl:escalate");
  await hitlEscalation.add(
    "check-sla",
    {
      tenantId: job.data.tenantId,
      correlationId: job.data.correlationId,
    },
    hitlRetry,
  );
  await hitlEscalation.close();

  // Track SLA breaches per approval type
  for (const breached of breachedApprovals) {
    hitlSlaBreachTotal.inc({
      approval_type: ((breached as Record<string, unknown>).type as string) ?? "unknown",
      tenant_id: job.data.tenantId,
    });
  }

  // Populate queue depth gauge for all registered queues
  const depthSnapshots = await Promise.allSettled(
    queueRegistry.map(async (cfg) => {
      const q = createQueue(cfg.name);
      const counts = await q.getJobCounts("waiting", "active", "delayed", "paused", "failed");
      await q.close();
      const waiting = (counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.paused ?? 0);
      queueDepth.set({ queue: cfg.name }, waiting);
      return { queue: cfg.name, waiting, active: counts.active ?? 0, failed: counts.failed ?? 0 };
    }),
  );
  const depthResults = depthSnapshots
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<{
        queue: string;
        waiting: number;
        active: number;
        failed: number;
      }> => r.status === "fulfilled",
    )
    .map((r) => r.value);

  return {
    ok: true,
    status: "success",
    stalledCount: stalled.length,
    stuckCount: stuck.length,
    breachedCount: breachedApprovals.length,
    queueDepthSampled: depthResults.length,
  };
};
