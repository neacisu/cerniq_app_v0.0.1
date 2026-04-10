import type { Processor } from "bullmq";
import { dispatchNotification, withCognitiveSpan } from "@cerniq/worker-shared";
import { approvalService, approvalTasks, db, setSessionTenantId, sql } from "@cerniq/db";
import { createServiceLogger, enrichError, writeAuditEvent } from "@cerniq/observability";

export type HitlEscalationJobData = {
  tenantId: string;
  correlationId?: string;
  dryRun?: boolean;
};

const svcLog = createServiceLogger("hitl-escalation", { etapa: "e1" });

export const hitlEscalationProcessor: Processor<HitlEscalationJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:hitl:escalate",
    async (_span) => {
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
          try {
            await dispatchNotification({
              tenantId: job.data.tenantId,
              userId: task.assignedTo ?? null,
              type: "HITL_TASK",
              title: `Avertisment SLA: ${task.title}`,
              body: task.description ?? "Aproape de termenul SLA.",
              data: { taskId: task.id, phase: "sla_warning" },
              channels: ["IN_APP", "EMAIL"],
            });
            writeAuditEvent({
              tenantId: job.data.tenantId,
              correlationId: job.data.correlationId,
              method: "WORKER",
              routePattern: "e1/hitl/escalate",
              statusCode: 200,
              action: "sla_warning_sent",
              resource: "approval_task",
              resourceId: task.id,
              metadata: {
                phase: "sla_warning",
                dryRun: false,
              },
            });
          } catch (err) {
            svcLog.error(
              {
                err,
                taskId: task.id,
                ...enrichError(err, {
                  tenantId: job.data.tenantId,
                  approvalTaskId: task.id,
                  phase: "sla_warning",
                }),
              },
              "SLA warning notification failed",
            );
          }
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
          writeAuditEvent({
            tenantId: job.data.tenantId,
            correlationId: job.data.correlationId,
            method: "WORKER",
            routePattern: "e1/hitl/escalate",
            statusCode: 200,
            action: "task_escalated",
            resource: "approval_task",
            resourceId: task.id,
            metadata: {
              escalatedTaskId: escalated.id,
              phase: "sla_breach",
              dryRun: false,
            },
          });
          try {
            await dispatchNotification({
              tenantId: job.data.tenantId,
              userId: task.assignedTo ?? null,
              type: "HITL_TASK",
              title: `Task HITL escalat: ${task.title}`,
              body: task.description ?? "SLA depășit — revizuire necesară.",
              data: { taskId: task.id, escalatedTaskId: escalated.id, phase: "sla_breach" },
              channels: ["IN_APP", "EMAIL", "WEBHOOK"],
            });
          } catch (err) {
            svcLog.error(
              {
                err,
                taskId: task.id,
                escalatedTaskId: escalated.id,
                ...enrichError(err, {
                  tenantId: job.data.tenantId,
                  approvalTaskId: task.id,
                  phase: "sla_breach",
                }),
              },
              "Breach notification failed",
            );
          }
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
    },
    { tenantId: job.data.tenantId },
  );
};
