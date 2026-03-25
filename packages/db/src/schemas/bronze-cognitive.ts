import {
  pgSchema,
  uuid,
  text,
  timestamp,
  jsonb,
  real,
  bigserial,
  pgEnum,
} from "drizzle-orm/pg-core";

const bronze = pgSchema("bronze");

export const edgeKindEnum = pgEnum("edge_kind", [
  "triggers",
  "depends_on",
  "reads",
  "writes",
  "mutates",
  "blocks",
  "retries",
]);

export const mutationOperationEnum = pgEnum("mutation_operation", [
  "insert",
  "update",
  "merge",
  "soft_delete",
  "restore",
  "noop",
]);

export const configApplyStatusEnum = pgEnum("config_apply_status", [
  "immediate",
  "pending_apply",
  "applied",
]);

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

export const importCognitiveNodes = bronze.table("import_cognitive_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  rootBatchId: uuid("root_batch_id"),
  nodeKey: text("node_key").notNull(),
  cognitiveType: text("cognitive_type").notNull(),
  swimlane: text("swimlane").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  metrics: jsonb("metrics").default({}),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const importCognitiveEdges = bronze.table("import_cognitive_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  rootBatchId: uuid("root_batch_id"),
  sourceNodeKey: text("source_node_key").notNull(),
  targetNodeKey: text("target_node_key").notNull(),
  edgeKind: text("edge_kind").notNull().default("triggers"),
  weight: real("weight").default(1.0),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const importCognitiveEvents = bronze.table("import_cognitive_events", {
  eventId: bigserial("event_id", { mode: "number" }).primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  rootBatchId: uuid("root_batch_id"),
  nodeKey: text("node_key").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").default({}),
  traceId: text("trace_id"),
  spanId: text("span_id"),
  correlationId: uuid("correlation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const importDataMutations = bronze.table("import_data_mutations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  rootBatchId: uuid("root_batch_id"),
  sourceNodeKey: text("source_node_key").notNull(),
  targetTable: text("target_table").notNull(),
  targetEntityId: text("target_entity_id"),
  operation: text("operation").notNull().default("update"),
  changedFields: text("changed_fields").array(),
  beforeSnapshot: jsonb("before_snapshot"),
  afterSnapshot: jsonb("after_snapshot"),
  traceId: text("trace_id"),
  causationId: text("causation_id"),
  actorId: text("actor_id"),
  correlationId: uuid("correlation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const importNodeConfigs = bronze.table("import_node_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  rootBatchId: uuid("root_batch_id"),
  nodeKey: text("node_key").notNull(),
  config: jsonb("config").notNull().default({}),
  applyStatus: text("apply_status").notNull().default("immediate"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  appliedByWorkerInstance: text("applied_by_worker_instance"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const importNodeAnomalies = bronze.table("import_node_anomalies", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  rootBatchId: uuid("root_batch_id"),
  nodeKey: text("node_key").notNull(),
  anomalyKind: text("anomaly_kind").notNull(),
  severity: text("severity").notNull().default("WARNING"),
  details: jsonb("details").default({}),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
