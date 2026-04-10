import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { approvalService, approvalTasks, db, sql } from "@cerniq/db";
import { auditWriter } from "@cerniq/observability";
import { createQueue } from "../lib/queue-factory.js";
import { isKnownQueueName, queueRegistry, QUEUES } from "@cerniq/worker-shared";
import { httpRouteLabel } from "../plugins/metrics.js";
import { getActorId, parseOffset, requireTenantId } from "./utils.js";
import { buildApiJobPayloadContext } from "../lib/http-job-tracing.js";
import {
  assignTaskSchema,
  decisionSchema,
  escalateTaskSchema,
  listApprovalTasksSchema,
} from "../schemas/etapa1.js";
import { requireRole } from "../middleware/authz.js";

const queueNameSchema = z.string().min(3).max(120).refine(isKnownQueueName, "Invalid queue name");
const idParamsSchema = z.object({ id: z.uuid() });
const queueParamsSchema = z.object({ name: queueNameSchema });
const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});
const successListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.record(z.string(), z.unknown())),
  meta: z.object({ total: z.number(), limit: z.number(), offset: z.number() }).optional(),
});
const successObjectResponseSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
});
const approvalDetailResponseSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
  entityData: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function enrichmentRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const queueAdminAuthOpts = {
    onRequest: [
      async (req: FastifyRequest) => req.jwtVerify(),
      requireRole("admin", "owner", "superadmin"),
    ],
  };
  const operatorAuthOpts = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("operator")],
  };
  const enrichmentMutationRateLimit = app.rateLimit({
    max: 60,
    timeWindow: "1 minute",
  });

  app.get(
    "/approvals",
    {
      ...authOpts,
      preHandler: [enrichmentMutationRateLimit],
      schema: {
        tags: ["etapa1-approvals"],
        summary: "List approval tasks",
        querystring: listApprovalTasksSchema,
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = listApprovalTasksSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: parsed.error.issues });
      }
      const query = parsed.data;
      const limit = query.limit ?? 50;
      const offset = parseOffset(query.offset, 0);
      const tasks = await approvalService.getPendingTasks(tenantId, {
        statuses: query.statuses as
          | (
              | "pending"
              | "assigned"
              | "approved"
              | "rejected"
              | "escalated"
              | "expired"
              | "cancelled"
            )[]
          | undefined,
        assignedTo: query.unassigned ? null : query.assignedTo,
        approvalType: query.approvalType,
        priorityLevel: query.priority,
        pipelineStage: query.pipelineStage,
        overdue: query.overdue,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        limit,
        offset,
      });
      const countConditions = [sql`${approvalTasks.tenantId} = ${tenantId}`];
      const effectiveStatuses = query.statuses?.length
        ? query.statuses
        : ["pending", "assigned", "escalated"];
      countConditions.push(
        sql`${approvalTasks.status} IN (${sql.join(
          effectiveStatuses.map((status) => sql`${status}`),
          sql`, `,
        )})`,
      );
      if (query.unassigned) {
        countConditions.push(sql`${approvalTasks.assignedTo} IS NULL`);
      } else if (query.assignedTo) {
        countConditions.push(sql`${approvalTasks.assignedTo} = ${query.assignedTo}`);
      }
      if (query.approvalType) {
        countConditions.push(sql`${approvalTasks.approvalType} = ${query.approvalType}`);
      }
      if (query.priority) {
        countConditions.push(sql`${approvalTasks.priorityLevel} = ${query.priority}`);
      }
      if (query.pipelineStage) {
        countConditions.push(sql`${approvalTasks.pipelineStage} = ${query.pipelineStage}`);
      }
      if (query.overdue) {
        countConditions.push(sql`${approvalTasks.dueAt} < NOW()`);
      }

      const [countRow] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(approvalTasks)
        .where(sql.join(countConditions, sql` AND `));

      return {
        success: true,
        data: tasks,
        meta: { total: Number(countRow?.total ?? 0), limit, offset },
      };
    },
  );

  app.get(
    "/approvals/stats",
    {
      ...authOpts,
      preHandler: [enrichmentMutationRateLimit],
      schema: {
        tags: ["etapa1-approvals"],
        summary: "Get approval statistics",
        querystring: z.object({ pipelineStage: z.string().max(10).optional() }),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const querySchema = z.object({ pipelineStage: z.string().max(10).optional() });
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: parsed.error.issues });
      }
      const stats = await approvalService.getStats(tenantId, parsed.data.pipelineStage);
      return { success: true, data: stats };
    },
  );

  app.get(
    "/approvals/:id",
    {
      ...queueAdminAuthOpts,
      schema: {
        tags: ["etapa1-approvals"],
        summary: "Get approval detail with entity context",
        params: idParamsSchema,
        response: {
          200: approvalDetailResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      }

      const task = await db.query.approvalTasks.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!task) {
        return reply.code(404).send({ success: false, error: "Approval task not found" });
      }
      let entityData: Record<string, unknown> | null = null;
      if (task.entityType === "company") {
        const silver = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, task.entityId)),
        });
        const gold = silver
          ? null
          : await db.query.goldCompanies.findFirst({
              where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, task.entityId)),
            });
        entityData = (silver ?? gold ?? null) as Record<string, unknown> | null;
      } else if (task.entityType === "bronze_contact") {
        const bronze = await db.query.bronzeContacts.findFirst({
          where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, task.entityId)),
        });
        entityData = (bronze ?? null) as Record<string, unknown> | null;
      }

      return { success: true, data: task, entityData };
    },
  );

  app.post(
    "/approvals/:id/assign",
    {
      ...operatorAuthOpts,
      schema: {
        tags: ["etapa1-approvals"],
        summary: "Assign approval task",
        params: idParamsSchema,
        body: assignTaskSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const p = idParamsSchema.safeParse(request.params);
      const b = assignTaskSchema.safeParse(request.body);
      if (!p.success || !b.success) {
        return reply.code(400).send({ success: false, error: "Request invalid" });
      }

      const task = await approvalService.assignTask({
        tenantId,
        taskId: p.data.id,
        assigneeUserId: b.data.userId,
        actorId,
      });
      auditWriter.write({
        method: request.method.toUpperCase(),
        routePattern: httpRouteLabel(request),
        statusCode: 200,
        tenantId,
        userId: actorId,
        metadata: {
          approvalAction: "assign",
          taskId: task.id,
          assigneeUserId: b.data.userId,
        },
      });
      return { success: true, data: task };
    },
  );

  app.post(
    "/approvals/:id/decide",
    {
      ...operatorAuthOpts,
      schema: {
        tags: ["etapa1-approvals"],
        summary: "Decide approval task and resume pipeline",
        params: idParamsSchema,
        body: decisionSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const p = idParamsSchema.safeParse(request.params);
      const b = decisionSchema.safeParse(request.body);
      if (!p.success || !b.success) {
        return reply.code(400).send({ success: false, error: "Request invalid" });
      }

      const task = await approvalService.decide({
        tenantId,
        taskId: p.data.id,
        actorId,
        actorRole: (request.user as { role?: string } | undefined)?.role,
        decision: b.data.decision,
        reason: b.data.reason,
        metadata: b.data.metadata,
      });

      // Resume worker consumes the decision and continues the pipeline.
      const resumeQueue = createQueue(QUEUES.HITL_RESUME_AFTER_APPROVAL);
      await resumeQueue.add("resume", {
        tenantId,
        approvalTaskId: task.id,
        ...buildApiJobPayloadContext(request),
        correlationId: `api-${task.id}`,
      });
      await resumeQueue.close();

      auditWriter.write({
        method: request.method.toUpperCase(),
        routePattern: httpRouteLabel(request),
        statusCode: 200,
        tenantId,
        userId: actorId,
        metadata: {
          approvalAction: "decide",
          taskId: task.id,
          decision: b.data.decision,
        },
      });

      return { success: true, data: task };
    },
  );

  app.post(
    "/approvals/:id/escalate",
    {
      ...operatorAuthOpts,
      preHandler: [enrichmentMutationRateLimit],
      schema: {
        tags: ["etapa1-approvals"],
        summary: "Escalate approval task",
        params: idParamsSchema,
        body: escalateTaskSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const p = idParamsSchema.safeParse(request.params);
      const b = escalateTaskSchema.safeParse(request.body);
      if (!p.success || !b.success) {
        return reply.code(400).send({ success: false, error: "Request invalid" });
      }

      const task = await approvalService.escalate({
        tenantId,
        taskId: p.data.id,
        actorId,
        reason: b.data.reason,
      });
      auditWriter.write({
        method: request.method.toUpperCase(),
        routePattern: httpRouteLabel(request),
        statusCode: 200,
        tenantId,
        userId: actorId,
        metadata: {
          approvalAction: "escalate",
          taskId: task.id,
        },
      });
      return { success: true, data: task };
    },
  );

  app.get(
    "/queues/:name",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-queues"],
        summary: "Get queue status by name",
        params: queueParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = queueParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Queue name invalid" });
      }
      const queue = createQueue(parsed.data.name);
      const [counts, isPaused] = await Promise.all([queue.getJobCounts(), queue.isPaused()]);
      await queue.close();

      return {
        success: true,
        data: {
          name: parsed.data.name,
          paused: isPaused,
          counts,
        },
      };
    },
  );

  app.get(
    "/queues",
    {
      ...queueAdminAuthOpts,
      schema: {
        tags: ["etapa1-queues"],
        summary: "List all queue statuses",
        response: {
          200: successListResponseSchema,
        },
      },
    },
    async () => {
      const queueStatus = await Promise.all(
        queueRegistry.map(async (q) => {
          const queue = createQueue(q.name);
          const [counts, paused] = await Promise.all([
            queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
            queue.isPaused(),
          ]);
          const jobs = await queue.getJobs(["completed", "failed"], 0, 0, true);
          await queue.close();
          const lastJobAt = jobs[0]?.finishedOn ? new Date(jobs[0].finishedOn).toISOString() : null;
          return {
            name: q.name,
            concurrency: q.concurrency,
            rateLimit: q.rateLimit ?? null,
            paused,
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
            lastJobAt,
          };
        }),
      );

      return { success: true, data: queueStatus };
    },
  );

  app.post(
    "/queues/:name/pause",
    {
      ...queueAdminAuthOpts,
      preHandler: [enrichmentMutationRateLimit],
      schema: {
        tags: ["etapa1-queues"],
        summary: "Pause queue",
        params: queueParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = queueParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Queue name invalid" });
      }
      const queue = createQueue(parsed.data.name);
      await queue.pause();
      await queue.close();
      return { success: true, data: { name: parsed.data.name, paused: true } };
    },
  );

  app.post(
    "/queues/:name/resume",
    {
      ...queueAdminAuthOpts,
      preHandler: [enrichmentMutationRateLimit],
      schema: {
        tags: ["etapa1-queues"],
        summary: "Resume queue",
        params: queueParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = queueParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: "Queue name invalid" });
      }
      const queue = createQueue(parsed.data.name);
      await queue.resume();
      await queue.close();
      return { success: true, data: { name: parsed.data.name, paused: false } };
    },
  );
}
