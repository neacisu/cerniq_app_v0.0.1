import IORedis from "ioredis";
import { trace, type Span } from "@opentelemetry/api";
import {
  cognitiveEvents,
  cognitiveNodeConfigs,
  dataMutations,
  importCognitiveEdges,
  db,
  eq,
  and,
  or,
} from "@cerniq/db";
import { getNodeByKey } from "@cerniq/shared";
import type { ImportExecutionContext } from "./import-execution.js";
import { getRedisConnectionOptions } from "./redis.js";

let _pubRedis: IORedis | null = null;

function getPubRedis(): IORedis {
  _pubRedis ??= new IORedis(getRedisConnectionOptions());
  return _pubRedis;
}

export async function closeCognitiveRedis(): Promise<void> {
  if (_pubRedis) {
    await _pubRedis.quit();
    _pubRedis = null;
  }
}

// ---------------------------------------------------------------------------
// PII Redaction
// ---------------------------------------------------------------------------

/**
 * Câmpuri permise în before/after snapshots ale mutațiilor de date.
 * Toate celelalte câmpuri sunt înlocuite cu `"[REDACTED]"` pentru protecție PII.
 */
export const DATA_MUTATION_PII_ALLOWLIST: readonly string[] = [
  "id",
  "tenantId",
  "batchId",
  "companyId",
  "entityId",
  "entityType",
  "cui",
  "nrRegCom",
  "codCaen",
  "stareInregistrare",
  "status",
  "applyStatus",
  "mutationIntent",
  "createdAt",
  "updatedAt",
  "source",
  "stage",
];

/**
 * Redactează câmpurile PII dintr-un obiect de date,
 * păstrând DOAR câmpurile din allowlist.
 * Câmpurile nelistate sunt înlocuite cu `"[REDACTED]"`.
 *
 * @param data      - Obiectul de redactat (null-safe)
 * @param allowlist - Lista câmpurilor permise (implicit: DATA_MUTATION_PII_ALLOWLIST)
 */
export function redactPII(
  data: Record<string, unknown> | null | undefined,
  allowlist: readonly string[] = DATA_MUTATION_PII_ALLOWLIST,
): Record<string, unknown> | null {
  if (data === null || data === undefined) return null;
  const allowSet = new Set(allowlist);
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, allowSet.has(key) ? value : "[REDACTED]"]),
  );
}

// ---------------------------------------------------------------------------
// 1. emitCognitiveEvent
// ---------------------------------------------------------------------------

/**
 * Contract JSON Redis / SSE (tenant-scoped), aliniat la `mapEventRow` din API:
 * - `id` — bigserial după INSERT (absent dacă nu s-a scris în DB)
 * - `tenantId` — obligatoriu pe firul live când evenimentul e per-tenant
 * - `batchId` — opțional; canal Redis = `cognitive:events:{batchId}` sau `cognitive:events`
 * - `nodeKey`, `eventType`, `timestamp` (ISO)
 * - `data` — payload eveniment + `traceId`, `spanId`, `correlationId` (UUID sau null)
 *
 * Evenimente fără `ctx.tenantId` nu sunt publicate pe Redis (API le respinge oricum).
 */
const CORRELATION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCorrelationUuid(v: string | null | undefined): string | null {
  if (v == null || typeof v !== "string") return null;
  const t = v.trim();
  return CORRELATION_UUID_RE.test(t) ? t : null;
}

export async function emitCognitiveEvent(
  nodeKey: string,
  event: { eventType: string; data?: Record<string, unknown> },
  ctx?: Partial<ImportExecutionContext>,
): Promise<void> {
  const now = new Date();
  const payload = event.data ?? {};
  const correlationUuid = parseCorrelationUuid(ctx?.correlationId ?? undefined);

  let insertedId: number | undefined;
  if (ctx?.tenantId) {
    const activeSpan = trace.getActiveSpan();
    const spanId = activeSpan?.spanContext().spanId ?? null;
    const [row] = await db
      .insert(cognitiveEvents)
      .values({
        tenantId: ctx.tenantId,
        nodeKey,
        eventType: event.eventType,
        traceId: ctx.traceId ?? null,
        spanId,
        correlationId: correlationUuid,
        payload,
        createdAt: now,
      })
      .returning({ id: cognitiveEvents.id });
    insertedId = row?.id;
  }

  if (!ctx?.tenantId) {
    return;
  }

  const traceId = ctx.traceId ?? null;
  const activeSpan = trace.getActiveSpan();
  const spanId = activeSpan?.spanContext().spanId ?? null;
  const wire = {
    id: insertedId,
    tenantId: ctx.tenantId,
    ...(ctx.batchId ? { batchId: ctx.batchId } : {}),
    nodeKey,
    eventType: event.eventType,
    timestamp: now.toISOString(),
    data: {
      ...payload,
      traceId,
      spanId,
      correlationId: correlationUuid,
    },
  };

  const channel = ctx.batchId ? `cognitive:events:${ctx.batchId}` : "cognitive:events";
  await getPubRedis().publish(channel, JSON.stringify(wire));
}

// ---------------------------------------------------------------------------
// 2. recordDataMutation
// ---------------------------------------------------------------------------

/**
 * Înregistrează o mutație de date în `bronze.data_mutations` cu redactare PII automată.
 * Câmpurile `beforeData`/`afterData` sunt filtrate prin `redactPII(data, PII_ALLOWLIST)`.
 *
 * @param mutation - Detaliile mutației (cu `changedFields` opțional)
 * @param ctx      - Context opțional: `traceId`, `causationKey`→`causation_id`, `actorId`
 */
export async function recordDataMutation(
  mutation: {
    tenantId: string;
    batchId: string;
    nodeKey: string;
    entityType: string;
    entityId: string;
    mutationIntent: "CREATE" | "UPDATE" | "ENRICH" | "PROMOTE";
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
    changedFields?: string[];
  },
  ctx?: Partial<ImportExecutionContext> & { actorId?: string },
): Promise<void> {
  await db.insert(dataMutations).values({
    tenantId: mutation.tenantId,
    batchId: mutation.batchId,
    nodeKey: mutation.nodeKey,
    entityType: mutation.entityType,
    entityId: mutation.entityId,
    mutationIntent: mutation.mutationIntent,
    beforeData: redactPII(mutation.beforeData),
    afterData: redactPII(mutation.afterData),
    changedFields: mutation.changedFields ?? null,
    traceId: ctx?.traceId ?? null,
    causationId: ctx?.causationKey ?? null,
    actorId: ctx?.actorId ?? null,
  });
}

// ---------------------------------------------------------------------------
// 3. withCognitiveSpan
// ---------------------------------------------------------------------------

const tracer = trace.getTracer("cerniq");

/** Marchează spanul OTel ca să detectăm același `nodeKey` (factory + procesor). */
export const CERNIQ_COGNITIVE_SPAN_NODE_KEY = "__cerniqCognitiveNodeKey" as const;

/**
 * Instrumentare OTel pentru un nod cognitiv.
 * Când `ctx` este prezent, emite automat: `node_started`, `node_completed`, `node_failed`.
 * Evenimentele de observabilitate sunt fire-and-forget (nu blochează execuția la eroare).
 *
 * @param nodeKey - Cheia nodului din catalog (ex: "e1:ai:structure-xai")
 * @param fn      - Funcția async de instrumentat
 * @param ctx     - Context opțional pentru atribute suplimentare + auto-emit events
 */
export async function withCognitiveSpan<T>(
  nodeKey: string,
  fn: (span: Span) => Promise<T>,
  ctx?: Partial<ImportExecutionContext>,
): Promise<T> {
  const active = trace.getActiveSpan() as (Span & Record<string, unknown>) | undefined;
  if (active?.[CERNIQ_COGNITIVE_SPAN_NODE_KEY] === nodeKey) {
    return fn(active as Span);
  }

  const catalogEntry = getNodeByKey(nodeKey);
  return tracer.startActiveSpan(`cognitive:${nodeKey}`, async (span: Span) => {
    (span as Span & Record<string, unknown>)[CERNIQ_COGNITIVE_SPAN_NODE_KEY] = nodeKey;
    span.setAttribute("cognitive.nodeKey", nodeKey);
    if (catalogEntry) {
      span.setAttribute("cognitive.neuronType", catalogEntry.neuronType);
      span.setAttribute("cognitive.swimlane", catalogEntry.swimlane);
      span.setAttribute("cognitive.etapa", catalogEntry.etapa);
      span.setAttribute("cognitive.function", catalogEntry.cognitiveFunction);
    }
    if (ctx?.tenantId) span.setAttribute("tenant.id", ctx.tenantId);
    if (ctx?.batchId) span.setAttribute("batch.id", ctx.batchId);

    const startedAt = new Date().toISOString();

    if (ctx) {
      void emitCognitiveEvent(
        nodeKey,
        { eventType: "node_started", data: { startedAt } },
        ctx,
      ).catch(() => undefined);
    }

    try {
      const result = await fn(span);
      if (ctx) {
        void emitCognitiveEvent(
          nodeKey,
          {
            eventType: "node_completed",
            data: {
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - new Date(startedAt).getTime(),
            },
          },
          ctx,
        ).catch(() => undefined);
      }
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      if (ctx) {
        void emitCognitiveEvent(
          nodeKey,
          {
            eventType: "node_failed",
            data: {
              failedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error),
            },
          },
          ctx,
        ).catch(() => undefined);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

// ---------------------------------------------------------------------------
// 4. resolveNodeConfig
// ---------------------------------------------------------------------------

/**
 * Rezolvă configurarea unui nod cognitiv cu lanț de precedență:
 * 1. Override per batch (din `configOverrides.batchOverrides[batchId]`) dacă `batchId` prezent
 * 2. Config tenant din `bronze.cognitive_node_configs`
 * 3. Default din catalogul cognitiv (`CognitiveNodeEntry.supervisorApplyConfig + rateLimits`)
 *
 * @param nodeKey  - Cheia nodului cognitiv
 * @param tenantId - ID tenant (necesar pentru lookup per-tenant)
 * @param batchId  - ID batch pentru override specific (opțional)
 */
export async function resolveNodeConfig(
  nodeKey: string,
  tenantId?: string,
  batchId?: string,
): Promise<typeof cognitiveNodeConfigs.$inferSelect | null> {
  const conditions = tenantId
    ? and(eq(cognitiveNodeConfigs.nodeKey, nodeKey), eq(cognitiveNodeConfigs.tenantId, tenantId))
    : eq(cognitiveNodeConfigs.nodeKey, nodeKey);

  const [row] = await db.select().from(cognitiveNodeConfigs).where(conditions).limit(1);

  if (row) {
    // Aplică override per batch dacă există în configOverrides.batchOverrides
    if (batchId) {
      const overrides = row.configOverrides as Record<string, unknown>;
      const batchOverrides = overrides.batchOverrides as Record<string, unknown> | undefined;
      const batchOverride = batchOverrides?.[batchId];
      if (
        batchOverride !== null &&
        batchOverride !== undefined &&
        typeof batchOverride === "object"
      ) {
        return { ...row, ...(batchOverride as Partial<typeof cognitiveNodeConfigs.$inferSelect>) };
      }
    }
    return row;
  }

  // Fallback la catalog defaults dacă nu există row în DB
  const catalogEntry = getNodeByKey(nodeKey);
  if (!catalogEntry) return null;

  return {
    id: 0,
    tenantId: tenantId ?? "",
    nodeKey,
    concurrency: catalogEntry.supervisorApplyConfig?.concurrency ?? 1,
    rateLimitMax: catalogEntry.rateLimits?.requestsPerMinute ?? null,
    rateLimitDuration: catalogEntry.rateLimits ? 60_000 : null,
    paused: false,
    configOverrides: {},
    applyStatus: "immediate" as const,
    appliedAt: null,
    appliedByWorkerInstance: null,
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// 5. propagatePause
// ---------------------------------------------------------------------------

/**
 * Propagă pauzarea unui nod cognitiv în sens downstream via `import_cognitive_edges`.
 * BFS traversal urmând muchiile "triggers" și "blocks".
 *
 * Fără `rootBatchId`/`tenantId`: comportament original (pauza doar nodul solicitat).
 * Cu ambele: BFS complet în graful de dependențe per batch.
 *
 * @param nodeKey     - Nodul de pauzat
 * @param rootBatchId - ID batch pentru traversarea grafului (opțional)
 * @param tenantId    - ID tenant pentru query DB (opțional; fără el, traversarea e omisă)
 */
export async function propagatePause(
  nodeKey: string,
  rootBatchId?: string,
  tenantId?: string,
): Promise<void> {
  const redis = getPubRedis();

  if (!tenantId) {
    await redis.set(`cognitive:pause:${nodeKey}`, "1");
    return;
  }
  if (!rootBatchId) {
    await redis.set(`cognitive:pause:${nodeKey}`, "1");
    await emitCognitiveEvent(
      nodeKey,
      {
        eventType: "PAUSE_PROPAGATED",
        data: { pausedAt: new Date().toISOString() },
      },
      { tenantId },
    );
    return;
  }

  // BFS: pauzează nodeKey + toate nodurile downstream din graful per batch
  const visited = new Set<string>();
  const queue: string[] = [nodeKey];

  while (queue.length > 0) {
    const currentKey = queue.shift();
    if (currentKey === undefined || visited.has(currentKey)) continue;
    visited.add(currentKey);

    await redis.set(`cognitive:pause:${currentKey}`, "1");
    await emitCognitiveEvent(
      currentKey,
      {
        eventType: "PAUSE_PROPAGATED",
        data: {
          pausedAt: new Date().toISOString(),
          rootNodeKey: nodeKey,
          rootBatchId,
        },
      },
      { tenantId, batchId: rootBatchId },
    );

    // Descoperă noduri downstream (triggerate sau blocate de currentKey)
    const edges = await db
      .select({ targetNodeKey: importCognitiveEdges.targetNodeKey })
      .from(importCognitiveEdges)
      .where(
        and(
          eq(importCognitiveEdges.tenantId, tenantId),
          eq(importCognitiveEdges.batchId, rootBatchId),
          eq(importCognitiveEdges.sourceNodeKey, currentKey),
          or(
            eq(importCognitiveEdges.edgeKind, "triggers"),
            eq(importCognitiveEdges.edgeKind, "blocks"),
          ),
        ),
      );

    for (const { targetNodeKey } of edges) {
      if (!visited.has(targetNodeKey)) {
        queue.push(targetNodeKey);
      }
    }
  }
}

/** Telemetrie muchie — eveniment cognitiv pe nodul sursă cuținta în payload. */
export async function emitCognitiveEdgeHandoff(
  sourceNodeKey: string,
  targetNodeKey: string,
  ctx: Partial<ImportExecutionContext> & { tenantId: string },
  detail?: Record<string, unknown>,
): Promise<void> {
  await emitCognitiveEvent(
    sourceNodeKey,
    {
      eventType: "edge_handoff",
      data: { targetNodeKey, ...detail },
    },
    ctx,
  );
}

// ── LLM cost tracker (Plan §XVI.B) — re-export pentru workeri / API; apelurile LLM sunt în `llm-fallback` / E3. ──
export {
  BudgetExceededError,
  TIER_CAPS_USD,
  checkLlmBudget,
  recordLlmCost,
} from "./llm-cost-tracker.js";
