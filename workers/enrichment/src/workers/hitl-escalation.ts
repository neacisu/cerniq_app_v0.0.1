import type { Processor } from "bullmq";
import { approvalService, approvalTasks, db, setSessionTenantId, sql } from "@cerniq/db";

export type HitlEscalationJobData = {
  tenantId: string;
  correlationId?: string;
  dryRun?: boolean;
};

export const hitlEscalationProcessor: Processor<HitlEscalationJobData> = async (job) => {
  await setSessionTenantId(job.data.tenantId);
  const now = new Date();

  // Warning threshold: 80% of SLA window consumed.
  const warningCandidates = await db.query.approvalTasks.findMany({
    where: sql`${approvalTasks.tenantId} = ${job.data.tenantId}
      AND ${approvalTasks.status} IN ('pending', 'assigned', 'escalated')
      AND ${approvalTasks.createdAt} IS NOT NULL
      AND ${approvalTasks.dueAt} IS NOT NULL
      AND NOW() >= (${approvalTasks.createdAt} + ((${approvalTasks.dueAt} - ${approvalTasks.createdAt}) * 0.8))
      AND NOW() < ${approvalTasks.dueAt}
      AND COALESCE((${approvalTasks.metadata} ->> 'slaWarningSent')::boolean, false) = false`,
    limit: 100,
    orderBy: [approvalTasks.dueAt],
  });

  if (!job.data.dryRun) {
    for (const task of warningCandidates) {
      await db
        .update(approvalTasks)
        .set({
          metadata: sql`jsonb_set(jsonb_set(jsonb_set(COALESCE(${approvalTasks.metadata}, '{}'::jsonb), '{slaWarningSent}', 'true'::jsonb), '{slaWarningAt}', ${JSON.stringify(now.toISOString())}::jsonb), '{warningCorrelationId}', ${JSON.stringify(job.data.correlationId ?? null)}::jsonb)`,
          updatedAt: now,
        })
        .where(sql`${approvalTasks.id} = ${task.id}`);
    }
  }

  const breached = await db.query.approvalTasks.findMany({
    where: sql`${approvalTasks.tenantId} = ${job.data.tenantId}
      AND ${approvalTasks.status} IN ('pending', 'assigned', 'escalated')
      AND ${approvalTasks.dueAt} < ${now}`,
    limit: 100,
    orderBy: [approvalTasks.dueAt],
  });

  const escalatedIds: string[] = [];
  if (!job.data.dryRun) {
    for (const task of breached) {
      const escalated = await approvalService.escalate({
        tenantId: job.data.tenantId,
        taskId: task.id,
        reason: "SLA breach reached 100%",
      });
      escalatedIds.push(escalated.id);
    }
  }

  return {
    ok: true,
    status: "success",
    warningCount: warningCandidates.length,
    breachedCount: breached.length,
    escalatedCount: escalatedIds.length,
    escalatedIds,
  };
};
