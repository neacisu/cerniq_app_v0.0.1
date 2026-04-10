/**
 * GET /api/v1/imports/:importId/logs/stream — SSE pentru `observability.job_logs` (etapa e1).
 * Last-Event-ID: `ISO8601#uuid` (ultimul rând livrat). `catchup` = linii istorice la deschidere.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { trace } from "@opentelemetry/api";
import { z } from "zod";
import { db, eq, jobLogs, setSessionTenantId, sql, and, asc, desc, gte } from "@cerniq/db";
import { sseConnectionErrorsTotal, sseEventsSentTotal } from "../plugins/metrics.js";
import { requireTenantId } from "./utils.js";

const SSE_ROUTE_IMPORT_LOGS = "/api/v1/imports/:importId/logs/stream";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const paramsSchema = z.object({ importId: z.uuid() });

const streamQuerySchema = z.object({
  catchup: z.coerce.number().int().min(0).max(1000).default(200),
});

type JobLogRow = typeof jobLogs.$inferSelect;

type Cursor = { createdAt: Date; id: string };

function normalizeLevel(level: string): string {
  return level === "debug" ? "step" : level;
}

function formatLogPayload(row: JobLogRow) {
  const details =
    row.context && typeof row.context === "object"
      ? (row.context as Record<string, unknown>)
      : null;
  const durationMs =
    details && typeof details.durationMs === "number" ? Math.round(details.durationMs) : null;
  return {
    id: row.id,
    batchId: row.batchId,
    sessionId: row.sessionId ?? null,
    workerName: row.workerName,
    jobId: row.jobId ?? null,
    level: normalizeLevel(row.level),
    step: row.step ?? "event",
    message: row.message,
    details,
    durationMs,
    createdAt: row.createdAt.toISOString(),
    correlationId: row.correlationId ?? null,
    traceId: row.traceId ?? null,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
  };
}

function parseLastEventId(raw: string | undefined): Cursor | null {
  if (!raw || typeof raw !== "string") return null;
  const idx = raw.indexOf("#");
  if (idx <= 0) return null;
  const iso = raw.slice(0, idx);
  const id = raw.slice(idx + 1);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return null;
  return { createdAt: d, id: parsed.data };
}

export async function importLogsStreamRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  app.get("/imports/:importId/logs/stream", { ...authOpts }, async (request, reply) => {
    const tenantId = requireTenantId(request);
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ success: false, error: "importId invalid" });
    }
    const q = streamQuerySchema.parse(request.query);
    const batchId = params.data.importId;

    const batch = await db.query.bronzeImportBatches.findFirst({
      where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, batchId)),
      columns: { id: true },
    });
    if (!batch) {
      return reply.status(404).send({ success: false, error: "Import batch not found" });
    }

    await setSessionTenantId(tenantId);

    const lastEventHeader = request.headers["last-event-id"];
    const lastEventRaw = Array.isArray(lastEventHeader) ? lastEventHeader[0] : lastEventHeader;
    let cursor: Cursor | null = parseLastEventId(lastEventRaw);
    const liveSince = new Date();
    let liveOnly = !cursor && q.catchup === 0;

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write(": import logs stream\n\n");

    let sseEventsSent = 0;
    const writeRow = (row: JobLogRow, setCursor: boolean) => {
      const payload = JSON.stringify(formatLogPayload(row));
      const composite = `${row.createdAt.toISOString()}#${row.id}`;
      try {
        reply.raw.write(`id: ${composite}\ndata: ${payload}\n\n`);
        sseEventsSent += 1;
        sseEventsSentTotal.inc({ route: SSE_ROUTE_IMPORT_LOGS });
      } catch {
        sseConnectionErrorsTotal.inc({ route: SSE_ROUTE_IMPORT_LOGS, phase: "write_row" });
      }
      if (setCursor) {
        cursor = { createdAt: row.createdAt, id: row.id };
      }
    };

    if (!cursor && q.catchup > 0) {
      const initial = await db
        .select()
        .from(jobLogs)
        .where(
          and(
            eq(jobLogs.tenantId, tenantId),
            eq(jobLogs.batchId, batchId),
            eq(jobLogs.etapa, "e1"),
          ),
        )
        .orderBy(desc(jobLogs.createdAt))
        .limit(q.catchup);
      const chronological = initial.toReversed();
      for (const row of chronological) {
        writeRow(row, true);
      }
      liveOnly = false;
    }

    if (!cursor && liveOnly) {
      cursor = { createdAt: liveSince, id: ZERO_UUID };
    }

    const poll = async () => {
      try {
        const base = and(
          eq(jobLogs.tenantId, tenantId),
          eq(jobLogs.batchId, batchId),
          eq(jobLogs.etapa, "e1"),
        );
        let whereClause;
        if (cursor === null) {
          whereClause = base;
        } else {
          let afterCursor;
          if (liveOnly && cursor.id === ZERO_UUID) {
            afterCursor = gte(jobLogs.createdAt, cursor.createdAt);
          } else {
            afterCursor = sql`(${jobLogs.createdAt}, ${jobLogs.id}) > (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`;
          }
          whereClause = and(base, afterCursor);
        }

        const rows = await db
          .select()
          .from(jobLogs)
          .where(whereClause)
          .orderBy(asc(jobLogs.createdAt), asc(jobLogs.id))
          .limit(200);
        for (const row of rows) {
          writeRow(row, true);
        }
        if (liveOnly && rows.length > 0) {
          liveOnly = false;
        }
      } catch {
        sseConnectionErrorsTotal.inc({ route: SSE_ROUTE_IMPORT_LOGS, phase: "poll" });
      }
    };

    await poll();
    const interval = setInterval(() => {
      void poll();
    }, 2000);

    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(": ping\n\n");
      } catch {
        sseConnectionErrorsTotal.inc({ route: SSE_ROUTE_IMPORT_LOGS, phase: "heartbeat" });
        clearInterval(interval);
        clearInterval(heartbeat);
      }
    }, 25000);

    const cleanup = () => {
      trace.getActiveSpan()?.addEvent("sse.session_end", {
        "sse.events_sent": sseEventsSent,
        "sse.route": SSE_ROUTE_IMPORT_LOGS,
      });
      clearInterval(interval);
      clearInterval(heartbeat);
    };
    request.raw.on("close", cleanup);
    request.raw.on("aborted", cleanup);
  });
}
