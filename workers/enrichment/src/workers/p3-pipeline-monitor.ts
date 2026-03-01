import { Queue, type Processor } from "bullmq";
import { db, setSessionTenantId, sql } from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";

export type PipelineMonitorJobData = {
  tenantId: string;
  correlationId?: string;
};

export const pipelineMonitorProcessor: Processor<PipelineMonitorJobData> = async (job) => {
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

  const connection = getRedisConnectionOptions();
  const prefix = getQueuePrefix();
  const orchestrator = new Queue("pipeline:orchestrate", { connection, prefix });
  for (const c of stalled) {
    await orchestrator.add("re-orchestrate", {
      tenantId: job.data.tenantId,
      companyId: c.id,
      stage: "post_validation",
      correlationId: job.data.correlationId,
    });
  }
  await orchestrator.close();

  const promoter = new Queue("pipeline:promote-to-gold", { connection, prefix });
  for (const c of stuck) {
    await promoter.add("re-promote", {
      tenantId: job.data.tenantId,
      companyId: c.id,
      correlationId: job.data.correlationId,
    });
  }
  await promoter.close();

  const hitlEscalation = new Queue("pipeline:hitl-escalation", { connection, prefix });
  await hitlEscalation.add("check-sla", {
    tenantId: job.data.tenantId,
    correlationId: job.data.correlationId,
  });
  await hitlEscalation.close();

  return {
    ok: true,
    status: "success",
    stalledCount: stalled.length,
    stuckCount: stuck.length,
    breachedCount: breachedApprovals.length,
  };
};
