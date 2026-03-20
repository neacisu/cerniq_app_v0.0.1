import { createHash } from "node:crypto";
import { and, count, desc, eq, inArray, isNull, lt, sql, type SQL } from "drizzle-orm";
import { approvalAuditLog } from "../schemas/audit.js";
import { approvalTasks } from "../schemas/approval.js";
import { users } from "../schemas/users.js";
import { db, setSessionTenantId } from "../client.js";

type ApprovalPriority = "critical" | "high" | "normal" | "low";
type ApprovalStatus =
  | "pending"
  | "assigned"
  | "approved"
  | "rejected"
  | "escalated"
  | "expired"
  | "cancelled";
type ApprovalDecision = "approve" | "reject" | "merge" | "skip";

type TaskMetadata = Record<string, unknown>;

export type CreateApprovalTaskInput = {
  tenantId: string;
  entityType: string;
  entityId: string;
  approvalType: (typeof approvalTasks.$inferInsert)["approvalType"];
  title: string;
  description?: string;
  pipelineStage?: string;
  priority?: ApprovalPriority;
  metadata?: TaskMetadata;
  blockedJobId?: string;
  blockedQueueName?: string;
  createdBy?: string | null;
  aiConfidence?: number | null;
  aiRecommendation?: string | null;
  aiReasoning?: string | null;
};

export type AssignApprovalTaskInput = {
  tenantId: string;
  taskId: string;
  assigneeUserId: string;
  actorId: string;
};

export type DecideApprovalTaskInput = {
  tenantId: string;
  taskId: string;
  actorId: string;
  actorRole?: string;
  decision: ApprovalDecision;
  reason?: string;
  metadata?: TaskMetadata;
};

export type EscalateApprovalTaskInput = {
  tenantId: string;
  taskId: string;
  actorId?: string | null;
  reason: string;
};

export type PendingTasksFilters = {
  statuses?: ApprovalStatus[];
  assignedTo?: string | null;
  approvalType?: (typeof approvalTasks.$inferSelect)["approvalType"];
  priorityLevel?: ApprovalPriority;
  pipelineStage?: string;
  overdue?: boolean;
  sortBy?: "dueAt" | "createdAt" | "priorityLevel";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

const SLA_HOURS: Record<ApprovalPriority, number> = {
  critical: 1,
  high: 4,
  normal: 24,
  low: 72,
};

// Enterprise-grade: Use Set for O(1) lookup performance instead of O(n) array.includes()
const DECIDE_BYPASS_ROLES = new Set(["manager", "admin", "owner", "superadmin"]);

const ESCALATION_ROLES = ["operator", "manager", "admin", "owner"] as const;

function nowPlusHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Enterprise-grade helper: Builds the assignedTo filter condition for approval tasks query.
 * Extracts nested ternary logic to reduce cognitive complexity.
 */
function buildAssignedToFilter(assignedTo: string | null | undefined): SQL | undefined {
  if (assignedTo === undefined) {
    return undefined;
  }
  if (assignedTo === null) {
    return isNull(approvalTasks.assignedTo);
  }
  return eq(approvalTasks.assignedTo, assignedTo);
}

/**
 * Enterprise-grade helper: Builds the orderBy clause for approval tasks query.
 * Extracts nested ternary logic to reduce cognitive complexity and improve readability.
 * Returns an array compatible with Drizzle ORM's orderBy parameter.
 */
function buildOrderByClause(
  sortBy: "dueAt" | "createdAt" | "priorityLevel",
  sortDir: "asc" | "desc",
) {
  if (sortBy === "createdAt") {
    return sortDir === "desc" ? [desc(approvalTasks.createdAt)] : [approvalTasks.createdAt];
  }

  if (sortBy === "priorityLevel") {
    const primarySort =
      sortDir === "desc" ? desc(approvalTasks.priorityLevel) : approvalTasks.priorityLevel;
    return [primarySort, approvalTasks.dueAt];
  }

  // Default: sortBy === "dueAt"
  const primarySort = sortDir === "desc" ? desc(approvalTasks.dueAt) : approvalTasks.dueAt;
  const secondarySort =
    sortDir === "desc" ? desc(approvalTasks.createdAt) : approvalTasks.createdAt;
  return [primarySort, secondarySort];
}

export class ApprovalService {
  async createTask(input: CreateApprovalTaskInput) {
    await setSessionTenantId(input.tenantId);
    const priority = input.priority ?? "normal";
    const dueAt = nowPlusHours(SLA_HOURS[priority]);
    const createdBy = input.createdBy ?? null;

    const task = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(approvalTasks)
        .values({
          tenantId: input.tenantId,
          type: input.approvalType ?? "manual_verification",
          approvalType: input.approvalType ?? "manual_verification",
          status: "pending",
          urgency: priority === "normal" ? "medium" : priority,
          priorityLevel: priority,
          pipelineStage: input.pipelineStage ?? "E1",
          entityType: input.entityType,
          entityId: input.entityId,
          title: input.title,
          description: input.description,
          aiConfidence: input.aiConfidence ?? null,
          aiRecommendation: input.aiRecommendation ?? null,
          aiReasoning: input.aiReasoning ?? null,
          requestedBy: createdBy ?? (await this.resolveSystemUser(input.tenantId, tx)),
          createdBy,
          dueAt,
          expiresAt: dueAt,
          blockedJobId: input.blockedJobId,
          blockedQueueName: input.blockedQueueName,
          etapa: "E1",
          metadata: input.metadata ?? {},
        })
        .returning();

      const created = inserted[0];
      await this.logAction(
        {
          tenantId: created.tenantId,
          approvalTaskId: created.id,
          action: "created",
          actorId: createdBy,
          actorType: createdBy ? "user" : "system",
          previousStatus: null,
          newStatus: "pending",
          metadata: { priority, approvalType: input.approvalType ?? "manual_verification" },
        },
        tx,
      );
      return created;
    });

    return task;
  }

  async assignTask(input: AssignApprovalTaskInput) {
    await setSessionTenantId(input.tenantId);
    const current = await db.query.approvalTasks.findFirst({
      where: (t, { and, eq }) => and(eq(t.tenantId, input.tenantId), eq(t.id, input.taskId)),
    });
    if (!current) throw new Error("Approval task not found");
    if (!["pending", "assigned", "escalated"].includes(current.status)) {
      throw new Error(`Task status ${current.status} cannot be reassigned`);
    }

    const updated = await db.transaction(async (tx) => {
      const nextStatus: ApprovalStatus = "assigned";
      const rows = await tx
        .update(approvalTasks)
        .set({
          assignedTo: input.assigneeUserId,
          assignedAt: new Date(),
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(approvalTasks.tenantId, input.tenantId), eq(approvalTasks.id, input.taskId)))
        .returning();
      const task = rows[0];
      await this.logAction(
        {
          tenantId: input.tenantId,
          approvalTaskId: input.taskId,
          action: "assigned",
          actorId: input.actorId,
          actorType: "user",
          previousStatus: current.status,
          newStatus: nextStatus,
          metadata: { assignedTo: input.assigneeUserId },
        },
        tx,
      );
      return task;
    });

    return updated;
  }

  async decide(input: DecideApprovalTaskInput) {
    await setSessionTenantId(input.tenantId);
    const existing = await db.query.approvalTasks.findFirst({
      where: (t, { and, eq }) => and(eq(t.tenantId, input.tenantId), eq(t.id, input.taskId)),
    });
    if (!existing) throw new Error("Approval task not found");
    if (!["pending", "assigned", "escalated"].includes(existing.status)) {
      throw new Error(`Task status ${existing.status} cannot be decided`);
    }

    // Authorization: only the assigned user, escalated-to user, or a manager+ role can decide
    const isAssigned =
      existing.assignedTo === input.actorId || existing.escalatedTo === input.actorId;
    const hasElevatedRole =
      input.actorRole && DECIDE_BYPASS_ROLES.has(input.actorRole.toLowerCase());
    // When task is unassigned (pending), any operator+ can decide
    const isUnassigned = !existing.assignedTo;
    if (!isAssigned && !hasElevatedRole && !isUnassigned) {
      throw new Error("Forbidden: only the assigned user or a manager can decide this task");
    }

    const newStatus: ApprovalStatus =
      input.decision === "approve" || input.decision === "merge" ? "approved" : "rejected";

    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(approvalTasks)
        .set({
          status: newStatus,
          decision: input.decision,
          decisionReason: input.reason,
          decisionMetadata: input.metadata ?? {},
          decidedBy: input.actorId,
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(approvalTasks.tenantId, input.tenantId), eq(approvalTasks.id, input.taskId)))
        .returning();
      const task = rows[0];
      await this.logAction(
        {
          tenantId: input.tenantId,
          approvalTaskId: input.taskId,
          action: "decided",
          actorId: input.actorId,
          actorType: "user",
          previousStatus: existing.status,
          newStatus,
          metadata: {
            decision: input.decision,
            reason: input.reason ?? null,
          },
        },
        tx,
      );
      return task;
    });

    // Resume blocked job if exists
    if (updated.blockedJobId && updated.blockedQueueName) {
      await this.resumeBlockedJob(updated);
    }

    return updated;
  }

  /**
   * Resume a blocked BullMQ job after approval task decision.
   * This method retrieves the job from the queue and retries it.
   * NOTE: This is a placeholder - actual implementation should be in workers layer
   * to avoid circular dependencies. The resume logic is handled by hitl:resume worker.
   * @param task - The approval task with blockedJobId and blockedQueueName
   */
  private async resumeBlockedJob(task: typeof approvalTasks.$inferSelect) {
    if (!task.blockedJobId || !task.blockedQueueName) {
      return;
    }

    // NOTE: Actual resume logic is handled by hitl:resume worker queue
    // This method is kept for API compatibility but the real work happens
    // when the decide endpoint creates a job in hitl:resume queue
    // See: apps/api/src/routes/enrichment.ts decide endpoint
  }

  async escalate(input: EscalateApprovalTaskInput) {
    await setSessionTenantId(input.tenantId);
    const task = await db.query.approvalTasks.findFirst({
      where: (t, { and, eq }) => and(eq(t.tenantId, input.tenantId), eq(t.id, input.taskId)),
    });
    if (!task) throw new Error("Approval task not found");
    if (!["pending", "assigned", "escalated"].includes(task.status)) return task;

    const targetRole =
      ESCALATION_ROLES[Math.min(task.escalationLevel + 1, ESCALATION_ROLES.length - 1)];
    const targetUser = await db.query.users.findFirst({
      where: and(
        eq(users.tenantId, input.tenantId),
        eq(users.role, targetRole),
        eq(users.status, "active"),
      ),
      orderBy: desc(users.updatedAt),
    });

    const newStatus: ApprovalStatus = targetUser ? "escalated" : "expired";
    const updated = await db.transaction(async (tx) => {
      const rows = await tx
        .update(approvalTasks)
        .set({
          status: newStatus,
          escalationLevel: task.escalationLevel + 1,
          escalatedAt: new Date(),
          escalatedTo: targetUser?.id ?? null,
          assignedTo: targetUser?.id ?? task.assignedTo,
          updatedAt: new Date(),
        })
        .where(and(eq(approvalTasks.tenantId, input.tenantId), eq(approvalTasks.id, input.taskId)))
        .returning();
      const escalated = rows[0];
      await this.logAction(
        {
          tenantId: input.tenantId,
          approvalTaskId: input.taskId,
          action: newStatus === "escalated" ? "escalated" : "expired",
          actorId: input.actorId ?? null,
          actorType: input.actorId ? "user" : "system",
          previousStatus: task.status,
          newStatus,
          metadata: {
            reason: input.reason,
            targetUserId: targetUser?.id ?? null,
            targetRole,
            escalationLevel: task.escalationLevel + 1,
          },
        },
        tx,
      );
      return escalated;
    });

    return updated;
  }

  async getPendingTasks(tenantId: string, filters: PendingTasksFilters = {}) {
    // Enterprise-grade: Extract status resolution to reduce cognitive complexity
    const statuses: ApprovalStatus[] =
      filters.statuses && filters.statuses.length > 0
        ? filters.statuses
        : ["pending", "assigned", "escalated"];

    // Enterprise-grade: Build where filters using helper functions to reduce complexity
    const whereFilters = [
      eq(approvalTasks.tenantId, tenantId),
      inArray(approvalTasks.status, statuses),
      buildAssignedToFilter(filters.assignedTo),
      filters.approvalType ? eq(approvalTasks.approvalType, filters.approvalType) : undefined,
      filters.priorityLevel ? eq(approvalTasks.priorityLevel, filters.priorityLevel) : undefined,
      filters.pipelineStage ? eq(approvalTasks.pipelineStage, filters.pipelineStage) : undefined,
      filters.overdue ? lt(approvalTasks.dueAt, new Date()) : undefined,
    ].filter(Boolean) as SQL[];

    // Enterprise-grade: Extract orderBy logic to helper function to reduce complexity
    const sortBy = filters.sortBy ?? "dueAt";
    const sortDir = filters.sortDir ?? "asc";
    const orderBy = buildOrderByClause(sortBy, sortDir);

    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      return tx.query.approvalTasks.findMany({
        where: and(...whereFilters),
        orderBy,
        limit: filters.limit ?? 200,
        offset: filters.offset ?? 0,
      });
    });
  }

  async getStats(tenantId: string, pipelineStage?: string) {
    const baseCondition = pipelineStage
      ? and(eq(approvalTasks.tenantId, tenantId), eq(approvalTasks.pipelineStage, pipelineStage))
      : eq(approvalTasks.tenantId, tenantId);
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

      const [totals] = await tx
        .select({
          pending: count(sql`CASE WHEN ${approvalTasks.status} = 'pending' THEN 1 END`),
          assigned: count(sql`CASE WHEN ${approvalTasks.status} = 'assigned' THEN 1 END`),
          escalated: count(sql`CASE WHEN ${approvalTasks.status} = 'escalated' THEN 1 END`),
          completed: count(
            sql`CASE WHEN ${approvalTasks.status} IN ('approved', 'rejected', 'cancelled', 'expired') THEN 1 END`,
          ),
          overdue: count(
            sql`CASE WHEN ${approvalTasks.status} IN ('pending', 'assigned', 'escalated') AND ${approvalTasks.dueAt} < NOW() THEN 1 END`,
          ),
        })
        .from(approvalTasks)
        .where(baseCondition);

      const [avgResolutionRow] = await tx
        .select({
          avgResolutionHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${approvalTasks.decidedAt} - ${approvalTasks.createdAt})) / 3600.0)`,
        })
        .from(approvalTasks)
        .where(and(baseCondition, sql`${approvalTasks.decidedAt} IS NOT NULL`));

      return {
        pending: Number(totals?.pending ?? 0),
        assigned: Number(totals?.assigned ?? 0),
        escalated: Number(totals?.escalated ?? 0),
        completed: Number(totals?.completed ?? 0),
        overdue: Number(totals?.overdue ?? 0),
        avgResolutionHours: Number(avgResolutionRow?.avgResolutionHours ?? 0),
      };
    });
  }

  async escalateBreachedTasks(tenantId: string, now = new Date()) {
    await setSessionTenantId(tenantId);
    const breached = await db.query.approvalTasks.findMany({
      where: and(
        eq(approvalTasks.tenantId, tenantId),
        inArray(approvalTasks.status, ["pending", "assigned", "escalated"]),
        lt(approvalTasks.dueAt, now),
      ),
      limit: 100,
      orderBy: [approvalTasks.dueAt, desc(approvalTasks.createdAt)],
    });

    const escalatedIds: string[] = [];
    for (const task of breached) {
      const updated = await this.escalate({
        tenantId,
        taskId: task.id,
        reason: "SLA breach auto escalation",
      });
      escalatedIds.push(updated.id);
    }

    return { scanned: breached.length, escalatedIds };
  }

  private async resolveSystemUser(tenantId: string, tx: typeof db = db) {
    const systemUser = await tx.query.users.findFirst({
      where: and(eq(users.tenantId, tenantId), eq(users.status, "active")),
      orderBy: [desc(users.role), desc(users.updatedAt)],
    });
    if (!systemUser) {
      throw new Error("No active user found for approval task creator");
    }
    return systemUser.id;
  }

  private async logAction(
    event: {
      tenantId: string;
      approvalTaskId: string;
      action: string;
      actorId?: string | null;
      actorType: "user" | "system" | "scheduler";
      previousStatus: ApprovalStatus | null;
      newStatus: ApprovalStatus | null;
      metadata?: TaskMetadata;
      reason?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    tx: typeof db = db,
  ) {
    const [previous] = await tx
      .select({ eventHash: approvalAuditLog.eventHash })
      .from(approvalAuditLog)
      .where(
        and(
          eq(approvalAuditLog.tenantId, event.tenantId),
          eq(approvalAuditLog.approvalTaskId, event.approvalTaskId),
        ),
      )
      .orderBy(desc(approvalAuditLog.createdAt))
      .limit(1);

    const payloadToHash = {
      tenantId: event.tenantId,
      approvalTaskId: event.approvalTaskId,
      action: event.action,
      actorId: event.actorId ?? null,
      actorType: event.actorType,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      metadata: event.metadata ?? {},
      previousHash: previous?.eventHash ?? null,
    };
    const eventHash = createHash("sha256").update(JSON.stringify(payloadToHash)).digest("hex");

    await tx.insert(approvalAuditLog).values({
      tenantId: event.tenantId,
      approvalTaskId: event.approvalTaskId,
      action: event.action,
      performedBy: event.actorId ?? null,
      performedByRole: event.actorType,
      previousStatus: event.previousStatus,
      newStatus: event.newStatus,
      reason: event.reason,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      previousHash: previous?.eventHash ?? null,
      eventHash,
      metadata: event.metadata ?? {},
      source: "service",
    });
  }
}

export const approvalService = new ApprovalService();
