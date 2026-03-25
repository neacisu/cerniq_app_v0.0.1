import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { bronzeSchema } from "./bronze.js";

export const importCognitiveNodes = bronzeSchema.table(
  "import_cognitive_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    rootBatchId: uuid("root_batch_id"),
    nodeKey: text("node_key").notNull(),
    cognitiveType: text("cognitive_type").notNull(),
    swimlane: text("swimlane").notNull(),
    status: text("status").notNull().default("IDLE"),
    metrics: jsonb("metrics").default({}),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_cognitive_nodes_tenant_batch").on(t.tenantId, t.rootBatchId),
    index("idx_cognitive_nodes_node_key").on(t.nodeKey),
  ],
);

export const importCognitiveEdges = bronzeSchema.table(
  "import_cognitive_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    rootBatchId: uuid("root_batch_id"),
    sourceNodeKey: text("source_node_key").notNull(),
    targetNodeKey: text("target_node_key").notNull(),
    edgeKind: text("edge_kind").notNull().default("triggers"),
    weight: real("weight").default(1.0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_cognitive_edges_source").on(t.sourceNodeKey),
    index("idx_cognitive_edges_target").on(t.targetNodeKey),
  ],
);

export const importCognitiveEvents = bronzeSchema.table(
  "import_cognitive_events",
  {
    eventId: bigint("event_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    rootBatchId: uuid("root_batch_id"),
    nodeKey: text("node_key").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").default({}),
    traceId: text("trace_id"),
    correlationId: uuid("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_cognitive_events_batch_id").on(t.rootBatchId, t.eventId),
    index("idx_cognitive_events_node").on(t.nodeKey, t.createdAt),
  ],
);

export const importDataMutations = bronzeSchema.table(
  "import_data_mutations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    rootBatchId: uuid("root_batch_id"),
    sourceNodeKey: text("source_node_key").notNull(),
    targetTable: text("target_table").notNull(),
    targetEntityId: uuid("target_entity_id"),
    operation: text("operation").notNull().default("update"),
    changedFields: text("changed_fields").array(),
    beforeSnapshot: jsonb("before_snapshot"),
    afterSnapshot: jsonb("after_snapshot"),
    traceId: text("trace_id"),
    causationId: text("causation_id"),
    actorId: uuid("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_data_mutations_batch").on(t.rootBatchId, t.createdAt),
    index("idx_data_mutations_entity").on(t.targetTable, t.targetEntityId),
  ],
);

export const importNodeConfigs = bronzeSchema.table(
  "import_node_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    rootBatchId: uuid("root_batch_id"),
    nodeKey: text("node_key").notNull(),
    config: jsonb("config").notNull().default({}),
    applyStatus: text("apply_status").notNull().default("immediate"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    appliedByWorkerInstance: text("applied_by_worker_instance"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("idx_node_configs_unique").on(t.tenantId, t.rootBatchId, t.nodeKey)],
);

export const importNodeAnomalies = bronzeSchema.table(
  "import_node_anomalies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    rootBatchId: uuid("root_batch_id"),
    nodeKey: text("node_key").notNull(),
    anomalyRuleKind: text("anomaly_rule_kind").notNull(),
    severity: text("severity").notNull().default("warning"),
    details: jsonb("details").default({}),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_node_anomalies_node").on(t.nodeKey, t.createdAt),
    index("idx_node_anomalies_unresolved")
      .on(t.tenantId, t.resolvedAt)
      .where(sql`${t.resolvedAt} IS NULL`),
  ],
);
