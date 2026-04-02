import type { Processor } from "bullmq";
import {
  withCognitiveSpan,
  hitlTasksResolvedTotal,
  hitlResolutionTimeSeconds,
} from "@cerniq/worker-shared";
import {
  approvalService,
  db,
  setSessionTenantId,
  approvalTasks,
  goldNegotiations,
  negotiationStateHistory,
  eq,
  and,
} from "@cerniq/db";

export type HumanApproveJobData = {
  tenantId: string;
  approvalTaskId: string;
  negotiationId: string;
  /** Decizia operatorului uman */
  decision: "APPROVE" | "REJECT" | "MODIFY";
  /** Acțiunea pendingă ce trebuie executată (context din metadata task-ului) */
  pendingAction?: string;
  /** Date modificate (doar pentru decizia MODIFY) */
  modifiedData?: Record<string, unknown>;
  actorId?: string;
  correlationId?: string;
};

export const humanApproveProcessor: Processor<HumanApproveJobData> = async (job) => {
  return withCognitiveSpan(
    "e3:human:approve",
    async (_span) => {
      const {
        tenantId,
        approvalTaskId,
        negotiationId,
        decision,
        pendingAction,
        modifiedData,
        actorId,
        correlationId,
      } = job.data;

      await setSessionTenantId(tenantId);

      // Preluare approval task existent
      const [task] = await db
        .select({
          id: approvalTasks.id,
          tenantId: approvalTasks.tenantId,
          status: approvalTasks.status,
          approvalType: approvalTasks.approvalType,
          createdAt: approvalTasks.createdAt,
        })
        .from(approvalTasks)
        .where(and(eq(approvalTasks.tenantId, tenantId), eq(approvalTasks.id, approvalTaskId)))
        .limit(1);

      if (!task) {
        return { ok: false, status: "task_not_found", approvalTaskId };
      }

      if (!["pending", "assigned", "escalated"].includes(task.status)) {
        return {
          ok: true,
          status: "skipped",
          reason: `task_already_${task.status}`,
          approvalTaskId,
        };
      }

      // Preluare stare curentă negociere pentru history log
      const [negotiation] = await db
        .select({
          id: goldNegotiations.id,
          currentState: goldNegotiations.currentState,
        })
        .from(goldNegotiations)
        .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)))
        .limit(1);

      // Aplică decizia pe approval task
      const drizzleDecision: "approve" | "reject" = decision === "REJECT" ? "reject" : "approve";

      await approvalService.decide({
        tenantId,
        taskId: approvalTaskId,
        actorId: actorId ?? "system",
        actorRole: "manager",
        decision: drizzleDecision,
        reason: `N78 human:approve decision=${decision} pendingAction=${pendingAction ?? "n/a"} correlationId=${correlationId ?? "n/a"}`,
        metadata: {
          decision,
          pendingAction: pendingAction ?? null,
          modifiedData: modifiedData ?? null,
          correlationId: correlationId ?? null,
        },
      });

      // Log în negotiation_state_history cu triggered_by_type='user' (plan L1918)
      if (negotiation) {
        await db.insert(negotiationStateHistory).values({
          tenantId,
          negotiationId,
          fromState: negotiation.currentState,
          toState: negotiation.currentState,
          changedBy: actorId ?? null,
          reason: `triggered_by_type=user decision=${decision} pendingAction=${pendingAction ?? "n/a"}`,
        });
      }

      // Metrici HITL resolution
      hitlTasksResolvedTotal.inc({
        approval_type: task.approvalType ?? "manual_verification",
        decision: drizzleDecision,
        tenant_id: tenantId,
      });

      if (task.createdAt) {
        const resolutionSeconds = (Date.now() - new Date(task.createdAt).getTime()) / 1000;
        hitlResolutionTimeSeconds.observe(
          {
            approval_type: task.approvalType ?? "manual_verification",
            tenant_id: tenantId,
          },
          resolutionSeconds,
        );
      }

      return {
        ok: true,
        status: "processed",
        approvalTaskId,
        negotiationId,
        decision,
        pendingAction: pendingAction ?? null,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
