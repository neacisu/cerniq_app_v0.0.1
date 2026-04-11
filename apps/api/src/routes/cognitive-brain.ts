import type { FastifyInstance, FastifyRequest } from "fastify";
import { trace } from "@opentelemetry/api";
import { enterCorrelationContext } from "@cerniq/observability";
import { z } from "zod";
import Redis from "ioredis";
import {
  cognitiveEvents,
  cognitiveNodeConfigs,
  dataMutations,
  importCognitiveNodes,
  importCognitiveEdges,
  importNodeAnomalies,
  db,
  eq,
  and,
  gte,
  asc,
  desc,
  isNull,
} from "@cerniq/db";
import { COGNITIVE_NODE_CATALOG, CATALOG_STATS, SWIMLANES, getNodeByKey } from "@cerniq/shared";
import type {
  AnomalyRecord,
  CognitiveBrain,
  CognitiveEdge,
  CognitiveNode,
  NodeControlState,
} from "@cerniq/shared";
import {
  propagatePause,
  detectStaleImportCognitiveHeartbeatsForBatch,
} from "@cerniq/worker-shared";
import { envConfig } from "../config.js";
import {
  evaluateCognitiveSseLiveMessage,
  MAX_SSE_BRAIN_PAYLOAD_BYTES,
} from "../lib/cognitive-sse-live-message.js";
import { requireRole } from "../middleware/authz.js";
import {
  sseBrainLiveEventsDroppedTotal,
  sseBrainRedisMessagesTotal,
  sseConnectionErrorsTotal,
  sseEventsSentTotal,
} from "../plugins/metrics.js";
import { requireTenantId, parseLimit, ensureRequestTenantIdFromJwtIfMissing } from "./utils.js";

const SSE_ROUTE_COGNITIVE_EVENTS = "/api/v1/brain/events/stream";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const traceIdParamsSchema = z.object({
  traceId: z.string().min(1).max(256),
});
const batchIdParamsSchema = z.object({
  batchId: z.uuid(),
});
const nodeKeyParamsSchema = z.object({
  nodeKey: z
    .string()
    .min(1)
    .max(256)
    .refine((k) => getNodeByKey(k) !== undefined, {
      message: "Unknown cognitive nodeKey",
    }),
});
const topologyQuerySchema = z.object({
  batchId: z.uuid().optional(),
});
const sseQuerySchema = z.object({
  /** Token JWT ca fallback pentru EventSource care nu poate trimite Authorization header. */
  token: z.string().min(1).optional(),
  /** Paritate cu `x-correlation-id` sesiune din SPA (EventSource fără headere custom). */
  correlationId: z.string().min(1).max(128).optional(),
  /** Abonare Redis `cognitive:events:{batchId}` + filtru evenimente pentru batch-ul selectat în UI. */
  batchId: z.uuid().optional(),
});
const pauseBodySchema = z
  .object({
    batchId: z.uuid().optional(),
  })
  .optional();
const nodeTracesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  since: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid ISO datetime" })
    .optional(),
  traceId: z.string().min(1).max(256).optional(),
});
const nodeConfigBodySchema = z
  .object({
    concurrency: z.number().int().positive().max(1000).optional(),
    rateLimitMax: z.number().int().positive().optional(),
    rateLimitDuration: z.number().int().positive().optional(),
    paused: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: "Body must include at least one field" });

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pushSwimlaneLayerEdges(
  fromNodes: (typeof COGNITIVE_NODE_CATALOG)[number][],
  toNodes: (typeof COGNITIVE_NODE_CATALOG)[number][],
  edges: CognitiveEdge[],
): void {
  for (const f of fromNodes) {
    for (const t of toNodes) {
      edges.push({
        sourceNodeKey: f.nodeKey,
        targetNodeKey: t.nodeKey,
        edgeType: "DATA_FLOW",
        weight: 1,
      });
    }
  }
}

function buildEdgesFromSwimlaneFlow(): CognitiveEdge[] {
  const edges: CognitiveEdge[] = [];
  const byEtapa = new Map<number, typeof COGNITIVE_NODE_CATALOG>();
  for (const entry of COGNITIVE_NODE_CATALOG) {
    const list = byEtapa.get(entry.etapa) ?? [];
    list.push(entry);
    byEtapa.set(entry.etapa, list);
  }
  for (const nodes of byEtapa.values()) {
    const bySwim = new Map<string, typeof COGNITIVE_NODE_CATALOG>();
    for (const n of nodes) {
      const arr = bySwim.get(n.swimlane) ?? [];
      arr.push(n);
      bySwim.set(n.swimlane, arr);
    }
    for (let i = 0; i < SWIMLANES.length - 1; i++) {
      const fromNodes = bySwim.get(SWIMLANES[i]) ?? [];
      const toNodes = bySwim.get(SWIMLANES[i + 1]) ?? [];
      if (fromNodes.length === 0 || toNodes.length === 0) continue;
      pushSwimlaneLayerEdges(fromNodes, toNodes, edges);
    }
  }
  return edges;
}

/** Determină statusul unui nod din starea live DB (fără nesting ternary). */
function liveNodeStatus(liveStatus: string | undefined): CognitiveNode["status"] {
  if (liveStatus === "paused") return "PAUSED";
  if (liveStatus === "error") return "ERROR";
  if (liveStatus === "idle") return "IDLE";
  if (liveStatus === "completed") return "COMPLETED";
  return "ACTIVE";
}

/** Construiește topology per-batch din importCognitiveNodes + importCognitiveEdges. */
function mergeBatchTopologyEdges(
  staticEdges: CognitiveEdge[],
  dbEdges: { sourceNodeKey: string; targetNodeKey: string; edgeKind: string }[],
): CognitiveEdge[] {
  const seen = new Set<string>();
  const edges: CognitiveEdge[] = [];

  for (const dbEdge of dbEdges) {
    const key = `${dbEdge.sourceNodeKey}→${dbEdge.targetNodeKey}:${dbEdge.edgeKind}`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push({
        sourceNodeKey: dbEdge.sourceNodeKey,
        targetNodeKey: dbEdge.targetNodeKey,
        edgeType: dbEdge.edgeKind as CognitiveEdge["edgeType"],
        weight: 1,
      });
    }
  }
  for (const staticEdge of staticEdges) {
    const key = `${staticEdge.sourceNodeKey}→${staticEdge.targetNodeKey}:${staticEdge.edgeType}`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push(staticEdge);
    }
  }
  return edges;
}

/**
 * Replays cognitive events from DB since `rawLastId` into the SSE response.
 * Returns `false` if the client disconnected during replay.
 * Gracefully degrades (returns `true`) if DB is unavailable.
 */
async function replayFromLastEventId(
  rawResponse: import("node:http").ServerResponse,
  tenantId: string,
  rawLastId: string,
  onEventSent: () => void,
): Promise<boolean> {
  const lastId = Number(rawLastId);
  if (!Number.isFinite(lastId) || lastId <= 0) return true;
  try {
    const rows = await db
      .select()
      .from(cognitiveEvents)
      .where(and(eq(cognitiveEvents.tenantId, tenantId), gte(cognitiveEvents.id, lastId + 1)))
      .orderBy(asc(cognitiveEvents.id))
      .limit(500);
    for (const row of rows) {
      try {
        rawResponse.write(`id: ${row.id}\n`);
        rawResponse.write(formatSseData(JSON.stringify(mapEventRow(row))));
        onEventSent();
      } catch {
        sseConnectionErrorsTotal.inc({ route: SSE_ROUTE_COGNITIVE_EVENTS, phase: "replay" });
        return false; // Client gone during replay
      }
    }
  } catch {
    // DB indisponibil — degradare grațioasă
  }
  return true;
}

let commandRedis: Redis | null = null;

function getCommandRedis(): Redis {
  if (!commandRedis) {
    commandRedis = new Redis(envConfig.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 10000),
    });
    commandRedis.on("error", () => {});
  }
  return commandRedis;
}

function pauseKey(nodeKey: string): string {
  return `cognitive:pause:${nodeKey}`;
}

function formatSseData(payload: string): string {
  const lines = payload.split("\n");
  return lines.map((line) => `data: ${line}`).join("\n") + "\n\n";
}

/** Mapează un row de `cognitiveEvents` la un obiect de răspuns API. */
function mapEventRow(r: {
  id: number;
  tenantId: string;
  nodeKey: string;
  eventType: string;
  createdAt: Date;
  payload: unknown;
  traceId: string | null;
  spanId: string | null;
  correlationId: string | null;
}) {
  return {
    id: r.id,
    tenantId: r.tenantId,
    nodeKey: r.nodeKey,
    eventType: r.eventType,
    timestamp: r.createdAt.toISOString(),
    data: {
      ...(r.payload as Record<string, unknown>),
      traceId: r.traceId,
      spanId: r.spanId,
      correlationId: r.correlationId,
    },
  };
}

const MAX_SSE_BRAIN_CONNECTIONS_PER_TENANT = 64;
/** Limită anti-furtun: evenimente SSE trimise într-o singură sesiune live (după replay). */
const MAX_SSE_BRAIN_EVENTS_PER_SESSION = 25_000;
const sseBrainConnectionsByTenant = new Map<string, number>();
const topologyStaleHeartbeatLastRunMs = new Map<string, number>();
const TOPOLOGY_STALE_HEARTBEAT_MIN_INTERVAL_MS = 60_000;

function shouldRunTopologyStaleCheck(tenantId: string, batchId: string): boolean {
  const key = `${tenantId}:${batchId}`;
  const now = Date.now();
  const last = topologyStaleHeartbeatLastRunMs.get(key) ?? 0;
  if (now - last < TOPOLOGY_STALE_HEARTBEAT_MIN_INTERVAL_MS) return false;
  topologyStaleHeartbeatLastRunMs.set(key, now);
  return true;
}

function mapAnomalyRow(r: typeof importNodeAnomalies.$inferSelect): AnomalyRecord {
  return {
    id: r.id,
    tenantId: r.tenantId,
    batchId: r.batchId,
    nodeKey: r.nodeKey,
    ruleKind: r.ruleKind as AnomalyRecord["ruleKind"],
    detectedAt: r.detectedAt.toISOString(),
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    payload: (r.payload as Record<string, unknown>) ?? {},
  };
}

function buildNodeControlState(
  config: typeof cognitiveNodeConfigs.$inferSelect | undefined,
  redisPaused: boolean,
): NodeControlState | undefined {
  if (!config && !redisPaused) return undefined;
  const applyStatus = config?.applyStatus ?? "immediate";
  return {
    paused: redisPaused || (config?.paused ?? false),
    applyStatus,
    concurrency: config?.concurrency,
    rateLimitMax: config?.rateLimitMax ?? null,
    rateLimitDuration: config?.rateLimitDuration ?? null,
    requiresWorkerRestart: applyStatus === "pending_apply",
    appliedAt: config?.appliedAt ? config.appliedAt.toISOString() : null,
    appliedByWorkerInstance: config?.appliedByWorkerInstance ?? null,
  };
}

// ─── Route plugin ─────────────────────────────────────────────────────────────

export default async function cognitiveBrainRoutes(app: FastifyInstance) {
  const viewerAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("viewer")],
  };
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  const topologyEdges = buildEdgesFromSwimlaneFlow();

  // ── GET /catalog ────────────────────────────────────────────────────────────

  app.get(
    "/catalog",
    {
      ...viewerAuth,
      schema: {
        tags: ["cognitive-brain"],
        summary: "Cognitive node catalog (118 neurons E1+E2, static metadata)",
        response: { 200: z.unknown(), 401: errorResponseSchema, 403: errorResponseSchema },
      },
    },
    async (_request, _reply) => {
      const byEtapa: Record<string, number> = {};
      const bySwimlane: Record<string, number> = {};
      const byNeuronType: Record<string, number> = {};

      for (const entry of COGNITIVE_NODE_CATALOG) {
        const etapaKey = `e${entry.etapa}`;
        byEtapa[etapaKey] = (byEtapa[etapaKey] ?? 0) + 1;
        bySwimlane[entry.swimlane] = (bySwimlane[entry.swimlane] ?? 0) + 1;
        byNeuronType[entry.neuronType] = (byNeuronType[entry.neuronType] ?? 0) + 1;
      }

      return {
        success: true,
        data: {
          nodes: COGNITIVE_NODE_CATALOG,
          stats: {
            total: CATALOG_STATS.total,
            skippedTotal: CATALOG_STATS.skippedTotal,
            skippedQueues: CATALOG_STATS.skippedQueues,
            byEtapa,
            bySwimlane,
            byNeuronType,
          },
        },
      };
    },
  );

  // ── GET /topology[?batchId=] ─────────────────────────────────────────────────

  app.get(
    "/topology",
    {
      ...viewerAuth,
      schema: {
        tags: ["cognitive-brain"],
        summary: "Cognitive brain neuron graph — global catalog or per-batch live state",
        querystring: topologyQuerySchema,
        response: {
          200: z.unknown(),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const queryParsed = topologyQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Query params invalizi",
          details: queryParsed.error.issues,
        });
      }
      const { batchId } = queryParsed.data;

      // ── Topology per-batch: live state din DB ──
      if (batchId) {
        const tenantId = requireTenantId(request);

        let pauseFlags: (string | null)[];
        try {
          const redis = getCommandRedis();
          const keys = COGNITIVE_NODE_CATALOG.map((e) => pauseKey(e.nodeKey));
          pauseFlags = await redis.mget(keys);
        } catch {
          pauseFlags = COGNITIVE_NODE_CATALOG.map(() => null);
        }
        const redisPausedByNode = new Map(
          COGNITIVE_NODE_CATALOG.map((e, i) => [e.nodeKey, pauseFlags[i] === "1"]),
        );

        const [liveNodes, liveEdges, anomalyRows, configRows] = await Promise.all([
          db
            .select()
            .from(importCognitiveNodes)
            .where(
              and(
                eq(importCognitiveNodes.tenantId, tenantId),
                eq(importCognitiveNodes.batchId, batchId),
              ),
            ),
          db
            .select()
            .from(importCognitiveEdges)
            .where(
              and(
                eq(importCognitiveEdges.tenantId, tenantId),
                eq(importCognitiveEdges.batchId, batchId),
              ),
            ),
          db
            .select()
            .from(importNodeAnomalies)
            .where(
              and(
                eq(importNodeAnomalies.tenantId, tenantId),
                eq(importNodeAnomalies.batchId, batchId),
                isNull(importNodeAnomalies.resolvedAt),
              ),
            ),
          db.select().from(cognitiveNodeConfigs).where(eq(cognitiveNodeConfigs.tenantId, tenantId)),
        ]);

        const configByNode = new Map(configRows.map((c) => [c.nodeKey, c]));
        const anomaliesByNode = new Map<string, AnomalyRecord[]>();
        for (const ar of anomalyRows) {
          const list = anomaliesByNode.get(ar.nodeKey) ?? [];
          list.push(mapAnomalyRow(ar));
          anomaliesByNode.set(ar.nodeKey, list);
        }

        // Index live node state per nodeKey
        const liveMap = new Map(liveNodes.map((n) => [n.nodeKey, n]));

        // Merge: catalog nodes enriched with live state
        const nodes: CognitiveNode[] = COGNITIVE_NODE_CATALOG.map((entry) => {
          const live = liveMap.get(entry.nodeKey);
          const liveMetrics = live?.metrics as Record<string, number> | undefined;
          const cfg = configByNode.get(entry.nodeKey);
          const redisPaused = redisPausedByNode.get(entry.nodeKey) ?? false;
          return {
            nodeKey: entry.nodeKey,
            queueName: entry.queueName,
            neuronType: entry.neuronType,
            swimlane: entry.swimlane,
            status: liveNodeStatus(live?.status),
            metrics: {
              processed: liveMetrics?.jobs_processed ?? 0,
              failed: liveMetrics?.failures ?? 0,
              avgLatency: liveMetrics?.avg_duration_ms ?? 0,
            },
            controlState: buildNodeControlState(cfg, redisPaused),
            anomalies: anomaliesByNode.get(entry.nodeKey),
          };
        });

        const dbEdgesForMerge = liveEdges.map((e) => ({
          sourceNodeKey: e.sourceNodeKey,
          targetNodeKey: e.targetNodeKey,
          edgeKind: e.edgeKind,
        }));
        const edges = mergeBatchTopologyEdges(topologyEdges, dbEdgesForMerge);

        const activeNeurons = nodes.filter((n) => n.status === "ACTIVE").length;
        const brain: CognitiveBrain = {
          nodes,
          edges,
          metadata: {
            totalNeurons: nodes.length,
            activeNeurons,
            lastUpdated: new Date().toISOString(),
          },
        };
        if (shouldRunTopologyStaleCheck(tenantId, batchId)) {
          detectStaleImportCognitiveHeartbeatsForBatch(tenantId, batchId).catch(() => undefined);
        }
        return { success: true, data: brain, batchId };
      }

      // ── Topology globală: catalog + Redis pause flags ──
      let pausedFlags: (string | null)[];
      try {
        const redis = getCommandRedis();
        const keys = COGNITIVE_NODE_CATALOG.map((e) => pauseKey(e.nodeKey));
        pausedFlags = await redis.mget(keys);
      } catch {
        // Redis indisponibil — degradare grațioasă: toți neuronii ACTIVE din catalog
        pausedFlags = COGNITIVE_NODE_CATALOG.map(() => null);
      }

      const nodes: CognitiveNode[] = COGNITIVE_NODE_CATALOG.map((e, i) => {
        const paused = pausedFlags[i] === "1";
        return {
          nodeKey: e.nodeKey,
          queueName: e.queueName,
          neuronType: e.neuronType,
          swimlane: e.swimlane,
          status: paused ? "PAUSED" : "ACTIVE",
          metrics: { processed: 0, failed: 0, avgLatency: 0 },
        };
      });

      const activeNeurons = nodes.filter((n) => n.status === "ACTIVE").length;
      const brain: CognitiveBrain = {
        nodes,
        edges: topologyEdges,
        metadata: {
          totalNeurons: nodes.length,
          activeNeurons,
          lastUpdated: new Date().toISOString(),
        },
      };
      return { success: true, data: brain };
    },
  );

  // ── GET /events/stream (SSE + Last-Event-ID replay) ──────────────────────────

  app.get(
    "/events/stream",
    {
      // Fără viewerAuth predefint — facem verificare manuală pentru a suporta
      // ?token= query param (EventSource nativ nu poate trimite Authorization header)
      schema: {
        tags: ["cognitive-brain"],
        summary: "SSE stream of cognitive events — supports Last-Event-ID replay from DB",
        querystring: sseQuerySchema,
        response: {
          401: errorResponseSchema,
          403: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // ── Autentificare SSE: Authorization header sau ?token= query param ──────
      // EventSource nativ (browser) nu poate trimite headere custom.
      // Token-ul JWT din localStorage este pasat ca query param.
      const queryParsed = sseQuerySchema.safeParse(request.query);
      const queryToken = queryParsed.success ? queryParsed.data.token : undefined;
      const queryCid =
        queryParsed.success && queryParsed.data.correlationId
          ? queryParsed.data.correlationId.trim()
          : "";
      if (queryCid) {
        (request.headers as Record<string, string>)["x-correlation-id"] = queryCid;
        reply.header("x-correlation-id", queryCid);
        enterCorrelationContext({
          correlationId: queryCid,
          requestId: String(request.headers["x-request-id"] ?? ""),
        });
      }

      try {
        if (queryToken) {
          // Injectează token-ul din query param ca header virtual pentru jwtVerify
          (request.headers as Record<string, string>).authorization = `Bearer ${queryToken}`;
        }
        await request.jwtVerify();
        await requireRole("viewer")(request, reply);
      } catch {
        return reply
          .code(401)
          .send({ success: false, error: "Autentificare SSE eșuată — token lipsă sau expirat" });
      }

      // requireRole poate trimite 403 fără throw — nu continua spre hijack / writeHead
      if (reply.sent) {
        return;
      }

      ensureRequestTenantIdFromJwtIfMissing(request);

      let tenantId: string;
      try {
        tenantId = requireTenantId(request);
      } catch {
        return reply
          .code(403)
          .send({ success: false, error: "Tenant JWT necesar pentru fluxul Brain" });
      }

      const queryBatchId = queryParsed.success ? queryParsed.data.batchId : undefined;

      const currentConn = sseBrainConnectionsByTenant.get(tenantId) ?? 0;
      if (currentConn >= MAX_SSE_BRAIN_CONNECTIONS_PER_TENANT) {
        return reply.code(429).send({
          success: false,
          error: "Limită conexiuni SSE Brain atinsă pentru acest tenant",
        });
      }

      const subscriber = new Redis(envConfig.REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 200, 10000),
      });
      subscriber.on("error", () => {});

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      reply.raw.write(": connected\n\n");
      request.raw.socket?.setTimeout(900_000);

      sseBrainConnectionsByTenant.set(tenantId, currentConn + 1);

      let sseEventsSent = 0;
      const recordSseEvent = () => {
        sseEventsSent += 1;
        sseEventsSentTotal.inc({ route: SSE_ROUTE_COGNITIVE_EVENTS });
      };

      const releaseConn = () => {
        const n = (sseBrainConnectionsByTenant.get(tenantId) ?? 1) - 1;
        if (n <= 0) sseBrainConnectionsByTenant.delete(tenantId);
        else sseBrainConnectionsByTenant.set(tenantId, n);
      };

      // ── Last-Event-ID replay din DB ──────────────────────────────────────────
      const rawLastIdHeader = request.headers["last-event-id"];
      const rawLastId = Array.isArray(rawLastIdHeader) ? rawLastIdHeader[0] : rawLastIdHeader;
      if (rawLastId) {
        const clientAlive = await replayFromLastEventId(
          reply.raw,
          tenantId,
          rawLastId,
          recordSseEvent,
        );
        if (!clientAlive) {
          releaseConn();
          await subscriber.quit().catch(() => undefined);
          return;
        }
      }

      // ── Live events via Redis pub/sub (PSUBSCRIBE cognitive:events*) ─────────
      await subscriber.psubscribe("cognitive:events*");

      const closePromise = new Promise<void>((resolve) => {
        request.raw.on("close", resolve);
        request.raw.on("aborted", resolve);
      });

      const onPMessage = (_pattern: string, _channel: string, message: string) => {
        sseBrainRedisMessagesTotal.inc({
          route: SSE_ROUTE_COGNITIVE_EVENTS,
          channel_pattern: "cognitive:events*",
        });
        if (sseEventsSent >= MAX_SSE_BRAIN_EVENTS_PER_SESSION) {
          sseBrainLiveEventsDroppedTotal.inc({
            route: SSE_ROUTE_COGNITIVE_EVENTS,
            reason: "event_flood",
          });
          return;
        }
        const evalResult = evaluateCognitiveSseLiveMessage(
          message,
          tenantId,
          queryBatchId,
          MAX_SSE_BRAIN_PAYLOAD_BYTES,
        );
        if (!evalResult.ok) {
          sseBrainLiveEventsDroppedTotal.inc({
            route: SSE_ROUTE_COGNITIVE_EVENTS,
            reason: evalResult.reason,
          });
          return;
        }
        const wire = evalResult.wire;
        try {
          const idPart =
            wire.id !== undefined && Number.isFinite(wire.id) ? `id: ${wire.id}\n` : "";
          reply.raw.write(idPart);
          reply.raw.write(formatSseData(JSON.stringify(wire)));
          recordSseEvent();
        } catch {
          sseConnectionErrorsTotal.inc({
            route: SSE_ROUTE_COGNITIVE_EVENTS,
            phase: "redis_message",
          });
        }
      };
      subscriber.on("pmessage", onPMessage);

      await closePromise;

      trace.getActiveSpan()?.addEvent("sse.session_end", {
        "sse.events_sent": sseEventsSent,
        "sse.route": SSE_ROUTE_COGNITIVE_EVENTS,
        "sse.batch_scope": queryBatchId ?? "",
      });

      releaseConn();
      subscriber.off("pmessage", onPMessage);
      await subscriber.punsubscribe("cognitive:events*").catch(() => undefined);
      await subscriber.quit().catch(() => undefined);
    },
  );

  // ── GET /traces/:traceId ─────────────────────────────────────────────────────

  app.get(
    "/traces/:traceId",
    {
      ...viewerAuth,
      schema: {
        tags: ["cognitive-brain"],
        summary: "Cognitive events for an OpenTelemetry trace id",
        params: traceIdParamsSchema,
        response: {
          200: z.unknown(),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = traceIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Parametri invalizi", details: parsed.error.issues });
      }
      const { traceId } = parsed.data;
      const rows = await db
        .select()
        .from(cognitiveEvents)
        .where(and(eq(cognitiveEvents.tenantId, tenantId), eq(cognitiveEvents.traceId, traceId)))
        .orderBy(asc(cognitiveEvents.createdAt));

      return { success: true, data: rows.map(mapEventRow) };
    },
  );

  // ── GET /nodes/:nodeKey/traces ───────────────────────────────────────────────

  app.get(
    "/nodes/:nodeKey/traces",
    {
      ...viewerAuth,
      schema: {
        tags: ["cognitive-brain"],
        summary: "Cognitive events for a specific neuron (latest first, optional filters)",
        params: nodeKeyParamsSchema,
        querystring: nodeTracesQuerySchema,
        response: {
          200: z.unknown(),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const paramsParsed = nodeKeyParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "nodeKey invalid", details: paramsParsed.error.issues });
      }
      const queryParsed = nodeTracesQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Query params invalizi",
          details: queryParsed.error.issues,
        });
      }

      const { nodeKey } = paramsParsed.data;
      const { limit = 25, since, traceId } = queryParsed.data;
      const safeLimit = parseLimit(limit, 25, 100);

      const conditions = [
        eq(cognitiveEvents.tenantId, tenantId),
        eq(cognitiveEvents.nodeKey, nodeKey),
        ...(since ? [gte(cognitiveEvents.createdAt, new Date(since))] : []),
        ...(traceId ? [eq(cognitiveEvents.traceId, traceId)] : []),
      ];

      const rows = await db
        .select()
        .from(cognitiveEvents)
        .where(and(...conditions))
        .orderBy(desc(cognitiveEvents.createdAt))
        .limit(safeLimit);

      return {
        success: true,
        data: rows.map(mapEventRow),
        meta: { nodeKey, limit: safeLimit, total: rows.length },
      };
    },
  );

  // ── GET /mutations/:batchId ──────────────────────────────────────────────────

  app.get(
    "/mutations/:batchId",
    {
      ...viewerAuth,
      schema: {
        tags: ["cognitive-brain"],
        summary:
          "Data mutations scoped la batchId de import (bronze). Nu acoperă toate pipeline-urile (ex. E3 fără batchId); tab Mutații reflectă doar înregistrările `recordDataMutation`.",
        params: batchIdParamsSchema,
        response: {
          200: z.unknown(),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = batchIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Parametri invalizi", details: parsed.error.issues });
      }
      const { batchId } = parsed.data;
      const rows = await db
        .select()
        .from(dataMutations)
        .where(and(eq(dataMutations.tenantId, tenantId), eq(dataMutations.batchId, batchId)));

      const data = rows.map((r) => ({
        batchId: r.batchId,
        nodeKey: r.nodeKey,
        entityId: r.entityId,
        before: (r.beforeData as Record<string, unknown> | null) ?? null,
        after: (r.afterData as Record<string, unknown> | null) ?? null,
        mutationIntent: r.mutationIntent as "CREATE" | "UPDATE" | "ENRICH" | "PROMOTE",
        changedFields: r.changedFields ?? [],
        traceId: r.traceId ?? null,
        causationId: r.causationId ?? null,
        actorId: r.actorId ?? null,
        timestamp: r.createdAt.toISOString(),
      }));
      return { success: true, data };
    },
  );

  // ── POST /nodes/:nodeKey/pause (cu propagatePause BFS) ───────────────────────

  app.post(
    "/nodes/:nodeKey/pause",
    {
      ...adminAuth,
      schema: {
        tags: ["cognitive-brain"],
        summary: "Pause neuron — propagatePause BFS downstream via import_cognitive_edges",
        params: nodeKeyParamsSchema,
        body: pauseBodySchema,
        response: {
          200: z.object({
            success: z.literal(true),
            nodeKey: z.string(),
            status: z.literal("PAUSED"),
            propagated: z.boolean(),
            batchId: z.uuid().nullable(),
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const paramsParsed = nodeKeyParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "nodeKey invalid", details: paramsParsed.error.issues });
      }
      const { nodeKey } = paramsParsed.data;

      const bodyParsed = pauseBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Body invalid", details: bodyParsed.error.issues });
      }
      const batchId = bodyParsed.data?.batchId ?? null;

      const tenantId = requireTenantId(request);

      // propagatePause: BFS cu edge traversal dacă batchId prezent, altfel simplu Redis set
      await propagatePause(nodeKey, batchId ?? undefined, tenantId);

      return {
        success: true as const,
        nodeKey,
        status: "PAUSED" as const,
        propagated: batchId !== null,
        batchId,
      };
    },
  );

  // ── POST /nodes/:nodeKey/resume ──────────────────────────────────────────────

  app.post(
    "/nodes/:nodeKey/resume",
    {
      ...adminAuth,
      schema: {
        tags: ["cognitive-brain"],
        summary: "Resume neuron (remove Redis pause flag)",
        params: nodeKeyParamsSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            nodeKey: z.string(),
            status: z.literal("ACTIVE"),
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = nodeKeyParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "nodeKey invalid", details: parsed.error.issues });
      }
      const { nodeKey } = parsed.data;
      await getCommandRedis().del(pauseKey(nodeKey));
      return { success: true, nodeKey, status: "ACTIVE" as const };
    },
  );

  // ── PUT /nodes/:nodeKey/config (cu applyStatus distinction) ─────────────────

  app.put(
    "/nodes/:nodeKey/config",
    {
      ...adminAuth,
      schema: {
        tags: ["cognitive-brain"],
        summary: "Upsert runtime cognitive node config — sets applyStatus based on changed fields",
        params: nodeKeyParamsSchema,
        body: nodeConfigBodySchema,
        response: {
          200: z.unknown(),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const paramsParsed = nodeKeyParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "nodeKey invalid", details: paramsParsed.error.issues });
      }
      const bodyParsed = nodeConfigBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply
          .code(400)
          .send({ success: false, error: "Body invalid", details: bodyParsed.error.issues });
      }
      const { nodeKey } = paramsParsed.data;
      const body = bodyParsed.data;

      const [existing] = await db
        .select()
        .from(cognitiveNodeConfigs)
        .where(
          and(
            eq(cognitiveNodeConfigs.tenantId, tenantId),
            eq(cognitiveNodeConfigs.nodeKey, nodeKey),
          ),
        )
        .limit(1);

      const merged = {
        concurrency: body.concurrency ?? existing?.concurrency ?? 1,
        rateLimitMax: body.rateLimitMax ?? existing?.rateLimitMax ?? null,
        rateLimitDuration: body.rateLimitDuration ?? existing?.rateLimitDuration ?? null,
        paused: body.paused ?? existing?.paused ?? false,
      };

      /**
       * applyStatus distinction:
       * - concurrency / rateLimitMax / rateLimitDuration changes → pending_apply (worker restart required)
       * - paused change only → immediate (aplică via Redis flag fără restart)
       */
      const concurrencyChanged =
        body.concurrency !== undefined && body.concurrency !== (existing?.concurrency ?? 1);
      const rateLimitChanged =
        (body.rateLimitMax !== undefined &&
          body.rateLimitMax !== (existing?.rateLimitMax ?? null)) ||
        (body.rateLimitDuration !== undefined &&
          body.rateLimitDuration !== (existing?.rateLimitDuration ?? null));

      const newApplyStatus: "immediate" | "pending_apply" =
        concurrencyChanged || rateLimitChanged ? "pending_apply" : "immediate";

      // Dacă `paused` se schimbă, sincronizează Redis flag imediat
      if (body.paused === true) {
        await getCommandRedis().set(pauseKey(nodeKey), "1");
      } else if (body.paused === false) {
        await getCommandRedis().del(pauseKey(nodeKey));
      }

      const now = new Date();
      await db
        .insert(cognitiveNodeConfigs)
        .values({
          tenantId,
          nodeKey,
          concurrency: merged.concurrency,
          rateLimitMax: merged.rateLimitMax,
          rateLimitDuration: merged.rateLimitDuration,
          paused: merged.paused,
          configOverrides: existing?.configOverrides ?? {},
          applyStatus: newApplyStatus,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [cognitiveNodeConfigs.tenantId, cognitiveNodeConfigs.nodeKey],
          set: {
            concurrency: merged.concurrency,
            rateLimitMax: merged.rateLimitMax,
            rateLimitDuration: merged.rateLimitDuration,
            paused: merged.paused,
            applyStatus: newApplyStatus,
            updatedAt: now,
          },
        });

      const [row] = await db
        .select()
        .from(cognitiveNodeConfigs)
        .where(
          and(
            eq(cognitiveNodeConfigs.tenantId, tenantId),
            eq(cognitiveNodeConfigs.nodeKey, nodeKey),
          ),
        )
        .limit(1);

      return {
        success: true,
        data: row,
        meta: {
          applyStatus: newApplyStatus,
          requiresWorkerRestart: newApplyStatus === "pending_apply",
        },
      };
    },
  );
}
