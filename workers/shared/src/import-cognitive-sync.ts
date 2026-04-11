import {
  db,
  importCognitiveEdges,
  importCognitiveNodes,
  importNodeAnomalies,
  sql,
  and,
  eq,
  inArray,
  isNull,
  isNotNull,
  lt,
  or,
} from "@cerniq/db";
import {
  COGNITIVE_NODE_CATALOG,
  SWIMLANES,
  getNodeByKey,
  getNodeByQueue,
  NeuronType,
} from "@cerniq/shared";
import type { ImportExecutionContext, ImportRuntimeStatus } from "./import-execution.js";

function neuronTypeToCognitiveType(nt: NeuronType): string {
  switch (nt) {
    case NeuronType.ReflexNeuron:
      return "REFLEX";
    case NeuronType.DeliberativeNeuron:
    case NeuronType.AssociativeNeuron:
    case NeuronType.ProceduralNeuron:
      return "DELIBERATIVE";
    case NeuronType.HumanNeuron:
      return "HUMAN";
    case NeuronType.ExecutiveNeuron:
    case NeuronType.AttentionNeuron:
      return "EXECUTIVE";
    case NeuronType.AutonomicNeuron:
    case NeuronType.MaintenanceNeuron:
    case NeuronType.MetaNeuron:
      return "MAINTENANCE";
    default:
      return "FACTUAL";
  }
}

function resolveQueueCanonical(queueName: string): string {
  return queueName.includes("__") ? queueName.replaceAll("__", ":") : queueName;
}

export function resolveNodeKeyForImportContext(
  ctx: ImportExecutionContext,
  queueName: string,
): string | null {
  if (typeof ctx.nodeKey === "string" && ctx.nodeKey.length > 0) return ctx.nodeKey;
  const canonical = resolveQueueCanonical(queueName);
  return getNodeByQueue(queueName)?.nodeKey ?? getNodeByQueue(canonical)?.nodeKey ?? null;
}

function runtimeStateToIcnStatus(state: ImportRuntimeStatus): string {
  switch (state) {
    case "paused":
      return "paused";
    case "failed":
    case "stale":
    case "terminal_error_skipped":
      return "error";
    case "completed":
      return "completed";
    case "queued":
      return "idle";
    case "running":
    case "recovering":
      return "active";
    default:
      return "idle";
  }
}

function pushSwimlaneLayerEdgesDb(
  fromNodes: (typeof COGNITIVE_NODE_CATALOG)[number][],
  toNodes: (typeof COGNITIVE_NODE_CATALOG)[number][],
  acc: Array<{
    tenantId: string;
    batchId: string;
    sourceNodeKey: string;
    targetNodeKey: string;
    edgeKind: "depends_on";
  }>,
  tenantId: string,
  batchId: string,
): void {
  for (const f of fromNodes) {
    for (const t of toNodes) {
      acc.push({
        tenantId,
        batchId,
        sourceNodeKey: f.nodeKey,
        targetNodeKey: t.nodeKey,
        edgeKind: "depends_on",
      });
    }
  }
}

function buildSwimlaneCatalogEdgeRows(
  tenantId: string,
  batchId: string,
): Array<{
  tenantId: string;
  batchId: string;
  sourceNodeKey: string;
  targetNodeKey: string;
  edgeKind: "depends_on";
}> {
  const rows: Array<{
    tenantId: string;
    batchId: string;
    sourceNodeKey: string;
    targetNodeKey: string;
    edgeKind: "depends_on";
  }> = [];
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
      pushSwimlaneLayerEdgesDb(fromNodes, toNodes, rows, tenantId, batchId);
    }
  }
  return rows;
}

/**
 * Inserează muchii statice per batch (idempotent) pentru propagare pause și topologie.
 */
export async function ensureImportCognitiveEdgesForBatch(
  tenantId: string,
  batchId: string,
): Promise<void> {
  const rows = buildSwimlaneCatalogEdgeRows(tenantId, batchId);
  if (rows.length === 0) return;
  await db.insert(importCognitiveEdges).values(rows).onConflictDoNothing();
}

export async function recordImportNodeFailureAnomaly(args: {
  tenantId: string;
  batchId: string;
  nodeKey: string;
  message: string;
}): Promise<void> {
  await db.insert(importNodeAnomalies).values({
    tenantId: args.tenantId,
    batchId: args.batchId,
    nodeKey: args.nodeKey,
    ruleKind: "retry_exhausted",
    payload: { lastError: args.message.slice(0, 2000) },
  });
}

/**
 * Upsert `import_cognitive_nodes` din starea jobului de import runtime.
 */
export async function syncImportCognitiveNodeFromRuntime(args: {
  ctx: ImportExecutionContext;
  queueName: string;
  state: ImportRuntimeStatus;
  metricsPatch?: Record<string, unknown> | null;
}): Promise<void> {
  const nodeKey = resolveNodeKeyForImportContext(args.ctx, args.queueName);
  if (!nodeKey) return;

  const entry =
    getNodeByKey(nodeKey) ??
    getNodeByQueue(args.queueName) ??
    getNodeByQueue(resolveQueueCanonical(args.queueName));
  if (!entry) return;

  const cognitiveType = neuronTypeToCognitiveType(entry.neuronType);
  const status = runtimeStateToIcnStatus(args.state);
  const now = new Date();
  const metricsJson =
    args.metricsPatch && Object.keys(args.metricsPatch).length > 0
      ? args.metricsPatch
      : { last_state: args.state };

  await db
    .insert(importCognitiveNodes)
    .values({
      tenantId: args.ctx.tenantId,
      batchId: args.ctx.batchId,
      nodeKey,
      cognitiveType,
      swimlane: entry.swimlane,
      status,
      metrics: metricsJson,
      heartbeatAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        importCognitiveNodes.tenantId,
        importCognitiveNodes.batchId,
        importCognitiveNodes.nodeKey,
      ],
      set: {
        status,
        cognitiveType,
        swimlane: entry.swimlane,
        heartbeatAt: now,
        updatedAt: now,
        metrics: sql`COALESCE(${importCognitiveNodes.metrics}, '{}'::jsonb) || ${JSON.stringify(metricsJson)}::jsonb`,
      },
    });
}

const STALE_HEARTBEAT_MS = 15 * 60 * 1000;

/**
 * Marchează noduri ICN cu heartbeat învechit (sau fără heartbeat dar neactualizate) ca `idle`
 * și inserează anomalii `stale_heartbeat` dacă nu există deja una nerezolvată pentru acel nod.
 * Apelat din API (rate-limit) sau din joburi de reconciliere — nu înlocuiește upsert-ul live din pipeline.
 */
export async function detectStaleImportCognitiveHeartbeatsForBatch(
  tenantId: string,
  batchId: string,
): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_HEARTBEAT_MS);
  const staleRows = await db
    .select({
      nodeKey: importCognitiveNodes.nodeKey,
    })
    .from(importCognitiveNodes)
    .where(
      and(
        eq(importCognitiveNodes.tenantId, tenantId),
        eq(importCognitiveNodes.batchId, batchId),
        inArray(importCognitiveNodes.status, ["active", "idle"]),
        or(
          and(
            isNotNull(importCognitiveNodes.heartbeatAt),
            lt(importCognitiveNodes.heartbeatAt, cutoff),
          ),
          and(isNull(importCognitiveNodes.heartbeatAt), lt(importCognitiveNodes.updatedAt, cutoff)),
        ),
      ),
    );

  if (staleRows.length === 0) return 0;

  const nodeKeys = staleRows.map((r) => r.nodeKey);
  const now = new Date();
  const metricsPatch = { stale_heartbeat_at: now.toISOString() };

  await db
    .update(importCognitiveNodes)
    .set({
      status: "idle",
      updatedAt: now,
      metrics: sql`COALESCE(${importCognitiveNodes.metrics}, '{}'::jsonb) || ${JSON.stringify(metricsPatch)}::jsonb`,
    })
    .where(
      and(
        eq(importCognitiveNodes.tenantId, tenantId),
        eq(importCognitiveNodes.batchId, batchId),
        inArray(importCognitiveNodes.nodeKey, nodeKeys),
      ),
    );

  const existing = await db
    .select({ nodeKey: importNodeAnomalies.nodeKey })
    .from(importNodeAnomalies)
    .where(
      and(
        eq(importNodeAnomalies.tenantId, tenantId),
        eq(importNodeAnomalies.batchId, batchId),
        eq(importNodeAnomalies.ruleKind, "stale_heartbeat"),
        isNull(importNodeAnomalies.resolvedAt),
        inArray(importNodeAnomalies.nodeKey, nodeKeys),
      ),
    );
  const already = new Set(existing.map((e) => e.nodeKey));
  const toInsert = nodeKeys.filter((k) => !already.has(k));
  if (toInsert.length > 0) {
    await db.insert(importNodeAnomalies).values(
      toInsert.map((nodeKey) => ({
        tenantId,
        batchId,
        nodeKey,
        ruleKind: "stale_heartbeat" as const,
        payload: { thresholdMs: STALE_HEARTBEAT_MS, detectedAt: now.toISOString() },
      })),
    );
  }

  return staleRows.length;
}

/**
 * Stub documentat: reconciliere secundară ICN din `import_runtime_jobs` (backfill / drift).
 * Sursa primară rămâne `syncImportCognitiveNodeFromRuntime`; acest job nu e conectat implicit la cron.
 */
export async function reconcileImportCognitiveNodesFromRuntimeJobs(
  _tenantId: string,
  _batchId: string,
): Promise<{ ok: true; message: string }> {
  return {
    ok: true,
    message: "reconcileImportCognitiveNodesFromRuntimeJobs not implemented — use live ICN sync",
  };
}
