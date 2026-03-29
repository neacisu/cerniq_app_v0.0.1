import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { bronzeSchema } from "./bronze.js";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Tip relație direcționată între noduri cognitive în dependency graph. */
export const cognitiveEdgeKindEnum = pgEnum("cognitive_edge_kind", [
  "triggers",
  "depends_on",
  "reads",
  "writes",
  "mutates",
  "blocks",
  "retries",
]);

/** Starea ciclului de aplicare a unui config de nod cognitiv.
 *  - immediate:      config aplicabil imediat (bootstrapped la pornire worker)
 *  - pending_apply:  necesită restart worker pentru aplicare (ex: schimbare concurrency)
 *  - applied:        confirmat de fleet prin heartbeat
 */
export const cognitiveApplyStatusEnum = pgEnum("cognitive_apply_status", [
  "immediate",
  "pending_apply",
  "applied",
]);

/** Clasa de regulă care a detectat anomalia.
 *  Fiecare valoare corespunde unui detector implementat în cognitive-helpers.
 */
export const anomalyRuleKindEnum = pgEnum("anomaly_rule_kind", [
  "stale_heartbeat",
  "counter_drift",
  "orphan_job",
  "missing_parent_context",
  "retry_exhausted",
  "mutation_without_provenance",
  "queue_backpressure",
  "config_pending_apply",
]);

// ─── Tabele existente (0034) ───────────────────────────────────────────────────

export const cognitiveEvents = bronzeSchema.table(
  "cognitive_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    nodeKey: text("node_key").notNull(),
    eventType: text("event_type").notNull(),
    traceId: text("trace_id"),
    spanId: text("span_id"),
    correlationId: uuid("correlation_id"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_cognitive_events_tenant_created").on(t.tenantId, t.createdAt),
    index("idx_cognitive_events_node_created").on(t.nodeKey, t.createdAt),
    index("idx_cognitive_events_correlation").on(t.correlationId),
  ],
);

/** Tabel de audit pentru mutații de date în pipeline.
 *  Coloanele added în 0036: changedFields, traceId, causationId, actorId.
 */
export const dataMutations = bronzeSchema.table(
  "data_mutations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    batchId: uuid("batch_id").notNull(),
    nodeKey: text("node_key").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    mutationIntent: text("mutation_intent").notNull(),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    // Coloane adăugate în 0036_cognitive_brain_v2 (provenance complet)
    changedFields: text("changed_fields").array(),
    traceId: text("trace_id"),
    causationId: text("causation_id"),
    actorId: text("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_data_mutations_tenant_batch").on(t.tenantId, t.batchId),
    index("idx_data_mutations_entity").on(t.entityId, t.entityType),
    index("idx_data_mutations_node").on(t.nodeKey),
    index("idx_data_mutations_trace_id").on(t.traceId),
  ],
);

/** Config per nod cognitiv per tenant.
 *  Coloanele added în 0036: applyStatus, appliedAt, appliedByWorkerInstance.
 */
export const cognitiveNodeConfigs = bronzeSchema.table(
  "cognitive_node_configs",
  {
    id: serial("id").primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    nodeKey: text("node_key").notNull(),
    concurrency: integer("concurrency").notNull().default(1),
    rateLimitMax: integer("rate_limit_max"),
    rateLimitDuration: integer("rate_limit_duration"),
    paused: boolean("paused").notNull().default(false),
    configOverrides: jsonb("config_overrides").notNull().default({}),
    // Coloane adăugate în 0036_cognitive_brain_v2 (config lifecycle)
    applyStatus: cognitiveApplyStatusEnum("apply_status").notNull().default("immediate"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    appliedByWorkerInstance: text("applied_by_worker_instance"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_cognitive_node_configs_tenant_node").on(t.tenantId, t.nodeKey)],
);

// ─── Tabele noi (0036) ────────────────────────────────────────────────────────

/** Catalog live al nodurilor cognitive active per batch de import.
 *  Actualizat prin heartbeat de fiecare worker la fiecare ciclu de procesare.
 *  Permite vizualizarea stării întregului sistem cognitiv per batch.
 */
export const importCognitiveNodes = bronzeSchema.table(
  "import_cognitive_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    batchId: uuid("batch_id").notNull(),
    nodeKey: text("node_key").notNull(),
    /** Tipul cognitiv al nodului: REFLEX | DELIBERATIVE | FACTUAL | EXECUTIVE | MAINTENANCE | HUMAN */
    cognitiveType: text("cognitive_type").notNull(),
    /** Swimlane funcțional (ex: 'factual-memory', 'executive-control', 'reflex-arc') */
    swimlane: text("swimlane").notNull(),
    /** Starea curentă a nodului (active | idle | error | paused | completed) */
    status: text("status").notNull().default("active"),
    /** Metrici operaționale (jobs_processed, failures, avg_duration_ms, etc.) */
    metrics: jsonb("metrics").notNull().default({}),
    /** Timestamp ultimului heartbeat primit de la worker */
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_import_cognitive_nodes_tenant_batch_node").on(t.tenantId, t.batchId, t.nodeKey),
    index("idx_import_cognitive_nodes_tenant_batch").on(t.tenantId, t.batchId),
    index("idx_import_cognitive_nodes_node_heartbeat").on(t.nodeKey, t.heartbeatAt),
  ],
);

/** Relații direcționate între noduri cognitive, scoped per batch.
 *  Permite traversarea dependency graph pentru propagare pause/resume
 *  prin funcția `propagatePause(nodeId, rootBatchId)` din cognitive-helpers.
 */
export const importCognitiveEdges = bronzeSchema.table(
  "import_cognitive_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    batchId: uuid("batch_id").notNull(),
    sourceNodeKey: text("source_node_key").notNull(),
    targetNodeKey: text("target_node_key").notNull(),
    edgeKind: cognitiveEdgeKindEnum("edge_kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_import_cognitive_edges_tenant_batch_src_tgt_kind").on(
      t.tenantId,
      t.batchId,
      t.sourceNodeKey,
      t.targetNodeKey,
      t.edgeKind,
    ),
    index("idx_import_cognitive_edges_tenant_batch").on(t.tenantId, t.batchId),
    index("idx_import_cognitive_edges_source").on(t.batchId, t.sourceNodeKey),
    index("idx_import_cognitive_edges_target").on(t.batchId, t.targetNodeKey),
  ],
);

// ─── Tabele noi (0037) ────────────────────────────────────────────────────────

/** Catalog de anomalii detectate de Cognitive Brain per nod, per batch.
 *  Fiecare intrare reprezintă o abatere comportamentală detectată de un detector
 *  (stale heartbeat, counter drift, queue backpressure etc.).
 *  Stocate pentru audit trail, HITL escalation și dashboard Grafana.
 */
export const importNodeAnomalies = bronzeSchema.table(
  "import_node_anomalies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    batchId: uuid("batch_id").notNull(),
    nodeKey: text("node_key").notNull(),
    ruleKind: anomalyRuleKindEnum("rule_kind").notNull(),
    /** Momentul detectării anomaliei */
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    /** Momentul rezolvării (NULL = anomalie activă) */
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    /** Context suplimentar (threshold, valoare observată, etc.) */
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_import_node_anomalies_tenant_batch").on(t.tenantId, t.batchId, t.detectedAt),
    index("idx_import_node_anomalies_node_unresolved").on(t.nodeKey, t.ruleKind),
  ],
);
