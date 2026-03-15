import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { approvalService, db } from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { queueRegistry } from "@cerniq/worker-shared";
import { getActorId, requireTenantId } from "./utils.js";
import { assignTaskSchema, decisionSchema, listApprovalTasksSchema } from "../schemas/etapa1.js";

const queueNameSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9.-]+$/);
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
});

export async function enrichmentRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  app.get(
    "/approvals",
    {
      ...authOpts,
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
      const offset = query.offset ?? 0;
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

      return { success: true, data: tasks, meta: { total: tasks.length, limit, offset } };
    },
  );

  app.get(
    "/approvals/stats",
    {
      ...authOpts,
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
      ...authOpts,
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

      return { success: true, data: { ...task, entityData } };
    },
  );

  app.post(
    "/approvals/:id/assign",
    {
      ...authOpts,
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
      return { success: true, data: task };
    },
  );

  app.post(
    "/approvals/:id/decide",
    {
      ...authOpts,
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
        decision: b.data.decision,
        reason: b.data.reason,
        metadata: b.data.metadata,
      });

      // Resume worker consumes the decision and continues the pipeline.
      const resumeQueue = createQueue("hitl:resume");
      await resumeQueue.add("resume", {
        tenantId,
        approvalTaskId: task.id,
        correlationId: `api-${task.id}`,
      });
      await resumeQueue.close();

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
      ...authOpts,
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
      ...authOpts,
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
      ...authOpts,
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
