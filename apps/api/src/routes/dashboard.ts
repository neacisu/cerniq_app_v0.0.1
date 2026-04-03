import type { FastifyInstance, FastifyRequest } from "fastify";
import { dailyStats, db, sql } from "@cerniq/db";
import { z } from "zod";
import { loadDashboardStatsPayload } from "../lib/dashboard-stats-payload.js";
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

const kpiStreamQuerySchema = z.object({
  token: z.string().min(1).optional(),
});

function formatSsePayload(payload: string): string {
  const lines = payload.split("\n");
  const body = lines.map((line) => "data: " + line).join("\n");
  return body + "\n\n";
}

export async function dashboardRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  app.get("/stats", authOpts, async (request) => {
    const tenantId = requireTenantId(request);
    const data = await loadDashboardStatsPayload(tenantId, app.log);
    return { success: true, data };
  });

  /**
   * SSE: același payload ca GET /stats, trimis imediat și apoi la fiecare 15s.
   * Autentificare: Authorization sau ?token= (EventSource).
   */
  app.get("/kpi-stream", async (request, reply) => {
    const queryParsed = kpiStreamQuerySchema.safeParse(request.query);
    const queryToken = queryParsed.success ? queryParsed.data.token : undefined;
    try {
      if (queryToken) {
        (request.headers as Record<string, string>).authorization = `Bearer ${queryToken}`;
      }
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({
        success: false,
        error: "Autentificare SSE eșuată — token lipsă sau expirat",
      });
    }
    let tenantId: string;
    try {
      tenantId = requireTenantId(request);
    } catch {
      return reply.code(401).send({ success: false, error: "Tenant lipsă în context" });
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write(": connected\n\n");

    const push = (payload: unknown) => {
      const body = JSON.stringify({
        type: "kpi" as const,
        ts: new Date().toISOString(),
        data: payload,
      });
      try {
        reply.raw.write(formatSsePayload(body));
      } catch {
        /* client disconnected */
      }
    };

    try {
      push(await loadDashboardStatsPayload(tenantId, app.log));
    } catch (err) {
      app.log.error({ err, tenantId }, "dashboard kpi-stream: primul push a eșuat");
      try {
        reply.raw.end();
      } catch {
        /* ignore */
      }
      return;
    }

    const intervalMs = 15_000;
    const timer = setInterval(() => {
      loadDashboardStatsPayload(tenantId, app.log)
        .then((payload) => push(payload))
        .catch((err) => {
          app.log.warn({ err, tenantId }, "dashboard kpi-stream: tick eșuat");
        });
    }, intervalMs);

    const onClose = () => {
      clearInterval(timer);
    };
    request.raw.on("close", onClose);
    request.raw.on("aborted", onClose);
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
