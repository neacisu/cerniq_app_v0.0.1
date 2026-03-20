import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  approvalTasks,
  bronzeContacts,
  dailyStats,
  db,
  goldCompanies,
  pipelineErrors,
  silverCompanies,
  sql,
} from "@cerniq/db";
import { queueRegistry } from "@cerniq/worker-shared";
import { z } from "zod";
import { createQueue } from "../lib/queue-factory.js";
import { parseLimit, parseOffset, requireTenantId } from "./utils.js";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isSchemaPermissionError(err: unknown): boolean {
  const obj = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  const cause =
    obj.cause && typeof obj.cause === "object" ? (obj.cause as Record<string, unknown>) : {};
  const values = [
    getErrorMessage(err),
    typeof obj.code === "string" ? obj.code : "",
    typeof cause.code === "string" ? cause.code : "",
    typeof cause.message === "string" ? cause.message : "",
  ]
    .filter(Boolean)
    .join(" ");
  return /permission denied for schema/i.test(values) || /\b42501\b/.test(values);
}

export async function dashboardRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  app.get("/stats", authOpts, async (request) => {
    const tenantId = requireTenantId(request);
    try {
      const queueDepthsSettled = await Promise.allSettled(
        queueRegistry.map(async (q) => {
          const queue = createQueue(q.name);
          try {
            const counts = await queue.getJobCounts(
              "waiting",
              "active",
              "completed",
              "failed",
              "delayed",
              "paused",
            );
            return {
              name: q.name,
              waiting: counts.waiting ?? 0,
              active: counts.active ?? 0,
              delayed: counts.delayed ?? 0,
              failed: counts.failed ?? 0,
            };
          } finally {
            await queue.close().catch(() => undefined);
          }
        }),
      );

      const queueDepths = queueDepthsSettled.flatMap((result) => {
        if (result.status === "fulfilled") return [result.value];
        throw result.reason;
      });

      const [
        bronzeStats,
        silverStats,
        goldStats,
        approvalStats,
        errorStats,
        hitlResolvedToday,
        qualityStats,
      ] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

        return Promise.all([
          tx
            .select({
              total: sql<number>`COUNT(*)`,
              pending: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.processingStatus} = 'pending')`,
              processing: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.processingStatus} = 'processing')`,
              promoted: sql<number>`COUNT(*) FILTER (WHERE ${bronzeContacts.processingStatus} = 'promoted')`,
            })
            .from(bronzeContacts)
            .where(sql`${bronzeContacts.tenantId} = ${tenantId}`),
          tx
            .select({
              total: sql<number>`COUNT(*)`,
              pending: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'pending')`,
              inProgress: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'in_progress')`,
              complete: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.enrichmentStatus} = 'complete')`,
              eligible: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.promotionStatus} = 'eligible')`,
            })
            .from(silverCompanies)
            .where(sql`${silverCompanies.tenantId} = ${tenantId}`),
          tx
            .select({
              total: sql<number>`COUNT(*)`,
              cold: sql<number>`COUNT(*) FILTER (WHERE ${goldCompanies.currentState} = 'COLD')`,
              engaged: sql<number>`COUNT(*) FILTER (WHERE ${goldCompanies.currentState} IN ('WARM_REPLY','ENGAGED','NEGOTIATION','PROPOSAL','CLOSING'))`,
              converted: sql<number>`COUNT(*) FILTER (WHERE ${goldCompanies.currentState} = 'CONVERTED')`,
            })
            .from(goldCompanies)
            .where(sql`${goldCompanies.tenantId} = ${tenantId}`),
          tx
            .select({
              pending: sql<number>`COUNT(*) FILTER (WHERE ${approvalTasks.status} IN ('pending','assigned','escalated'))`,
              overdue: sql<number>`COUNT(*) FILTER (WHERE ${approvalTasks.status} IN ('pending','assigned','escalated') AND COALESCE(${approvalTasks.dueAt}, ${approvalTasks.expiresAt}) < NOW())`,
            })
            .from(approvalTasks)
            .where(sql`${approvalTasks.tenantId} = ${tenantId}`),
          tx
            .select({
              last24h: sql<number>`COUNT(*) FILTER (WHERE ${pipelineErrors.createdAt} >= NOW() - INTERVAL '24 hours')`,
              critical: sql<number>`COUNT(*) FILTER (WHERE ${pipelineErrors.severity} = 'critical')`,
            })
            .from(pipelineErrors)
            .where(sql`${pipelineErrors.tenantId} = ${tenantId}`),
          tx
            .select({
              resolvedToday: sql<number>`COUNT(*) FILTER (WHERE ${approvalTasks.status} IN ('approved', 'rejected', 'cancelled', 'expired') AND DATE(${approvalTasks.decidedAt}) = CURRENT_DATE)`,
            })
            .from(approvalTasks)
            .where(sql`${approvalTasks.tenantId} = ${tenantId}`),
          tx
            .select({
              avgScore: sql<number>`AVG(${silverCompanies.totalQualityScore})`,
              eligible: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.promotionStatus} = 'eligible')`,
              blocked: sql<number>`COUNT(*) FILTER (WHERE ${silverCompanies.promotionStatus} = 'blocked')`,
            })
            .from(silverCompanies)
            .where(
              sql`${silverCompanies.tenantId} = ${tenantId} AND ${silverCompanies.totalQualityScore} IS NOT NULL`,
            ),
        ]);
      });

      const queueDepth = queueDepths.reduce((sum, q) => sum + q.waiting + q.active + q.delayed, 0);
      const failingQueues = queueDepths.filter((q) => q.failed > 0).length;

      return {
        success: true,
        data: {
          bronze: bronzeStats[0],
          silver: silverStats[0],
          gold: goldStats[0],
          approvals: approvalStats[0],
          errors: errorStats[0],
          pipeline: {
            queueDepth,
            failingQueues,
          },
          hitl: {
            pending: Number(approvalStats[0]?.pending ?? 0),
            resolvedToday: Number(hitlResolvedToday[0]?.resolvedToday ?? 0),
            overdue: Number(approvalStats[0]?.overdue ?? 0),
          },
          quality: {
            avgScore: Number(qualityStats[0]?.avgScore ?? 0),
            eligible: Number(qualityStats[0]?.eligible ?? 0),
            blocked: Number(qualityStats[0]?.blocked ?? 0),
          },
        },
      };
    } catch (err) {
      if (isSchemaPermissionError(err)) {
        app.log.warn(
          { err, tenantId },
          "Dashboard stats degraded: DB role lacks schema permissions for tenant analytics tables",
        );
        return {
          success: true,
          data: {
            bronze: { total: 0, pending: 0, processing: 0, promoted: 0 },
            silver: { total: 0, pending: 0, inProgress: 0, complete: 0, eligible: 0 },
            gold: { total: 0, cold: 0, engaged: 0, converted: 0 },
            approvals: { pending: 0, overdue: 0 },
            errors: { last24h: 0, critical: 0 },
            pipeline: { queueDepth: 0, failingQueues: 0 },
            hitl: { pending: 0, resolvedToday: 0, overdue: 0 },
            quality: { avgScore: 0, eligible: 0, blocked: 0 },
          },
        };
      }
      throw err;
    }
  });

  app.get("/activity", authOpts, async (request, reply) => {
    const tenantId = requireTenantId(request);
    const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ success: false, error: "Query invalida", details: parsed.error.issues });
    }
    const limit = parseLimit(parsed.data.limit, 20, 100);

    let recentErrors: Awaited<ReturnType<typeof db.query.pipelineErrors.findMany>>;
    let recentApprovals: Awaited<ReturnType<typeof db.query.approvalTasks.findMany>>;
    let recentSilver: Awaited<ReturnType<typeof db.query.silverCompanies.findMany>>;
    try {
      [recentErrors, recentApprovals, recentSilver] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        return Promise.all([
          tx.query.pipelineErrors.findMany({
            where: (t, { eq }) => eq(t.tenantId, tenantId),
            orderBy: (t, { desc }) => [desc(t.createdAt)],
            limit,
          }),
          tx.query.approvalTasks.findMany({
            where: (t, { eq }) => eq(t.tenantId, tenantId),
            orderBy: (t, { desc }) => [desc(t.updatedAt)],
            limit,
          }),
          tx.query.silverCompanies.findMany({
            where: (t, { eq }) => eq(t.tenantId, tenantId),
            orderBy: (t, { desc }) => [desc(t.updatedAt)],
            limit,
          }),
        ]);
      });
    } catch (err) {
      if (isSchemaPermissionError(err)) {
        app.log.warn(
          { err, tenantId },
          "Dashboard activity degraded: DB role lacks schema permissions for activity tables",
        );
        return { success: true, data: [] };
      }
      throw err;
    }

    const activity = [
      ...recentErrors.map((e) => ({
        id: `err-${e.id}`,
        type: "pipeline_error",
        timestamp: e.createdAt,
        message: `${e.workerName}: ${e.errorMessage}`,
        severity: e.severity,
      })),
      ...recentApprovals.map((a) => ({
        id: `approval-${a.id}`,
        type: "approval",
        timestamp: a.updatedAt,
        message: `${a.approvalType ?? a.type}: ${a.status}`,
        severity: a.urgency,
      })),
      ...recentSilver.map((s) => ({
        id: `silver-${s.id}`,
        type: "silver_update",
        timestamp: s.updatedAt,
        message: `${s.denumire ?? s.cui ?? s.id}: ${s.enrichmentStatus}`,
        severity: s.promotionStatus,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return { success: true, data: activity };
  });

  app.get("/daily-stats", authOpts, async (request, reply) => {
    const tenantId = requireTenantId(request);
    const querySchema = z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
      pipelineStage: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(365).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ success: false, error: "Query invalida", details: parsed.error.issues });
    }

    const conditions = [
      sql`${dailyStats.tenantId} = ${tenantId}`,
      sql`${dailyStats.statDate} >= NOW() - (${parsed.data.days} * INTERVAL '1 day')`,
    ];
    if (parsed.data.pipelineStage) {
      conditions.push(sql`${dailyStats.pipelineStage} = ${parsed.data.pipelineStage}`);
    }
    const whereSql = sql.join(conditions, sql` AND `);
    const limit = parseLimit(parsed.data.limit, 30, 365);
    const offset = parseOffset(parsed.data.offset, 0);

    let rows: Awaited<ReturnType<typeof db.query.dailyStats.findMany>>;
    let countRow: { total: number } | undefined;
    try {
      [rows, countRow] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

        const resultRows = await tx.query.dailyStats.findMany({
          where: whereSql,
          orderBy: (t, { desc }) => [desc(t.statDate)],
          limit,
          offset,
        });

        const [totalRow] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(dailyStats)
          .where(whereSql);
        return [resultRows, totalRow] as const;
      });
    } catch (err) {
      if (isSchemaPermissionError(err)) {
        app.log.warn(
          { err, tenantId },
          "Dashboard daily-stats degraded: DB role lacks schema permissions for daily_stats",
        );
        return {
          success: true,
          data: [],
          meta: { total: 0, limit, offset },
        };
      }
      throw err;
    }

    return {
      success: true,
      data: rows,
      meta: { total: Number(countRow?.total ?? 0), limit, offset },
    };
  });
}
