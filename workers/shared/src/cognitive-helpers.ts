import { trace, type Span } from "@opentelemetry/api";

const tracer = trace.getTracer("cerniq-cognitive");

/**
 * Wraps a function execution in an OTel span with cognitive attributes.
 * Used by workers to create spans with neuron type, swimlane, etc.
 */
export async function withCognitiveSpan<T>(
  nodeKey: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  return tracer.startActiveSpan(nodeKey, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }
      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Emits a cognitive event via Redis PUBLISH for real-time SSE streaming.
 * Events are also persisted to bronze.import_cognitive_events by the caller.
 */
export function emitCognitiveEvent(
  redis: { publish: (channel: string, message: string) => Promise<number> },
  batchId: string,
  payload: {
    nodeKey: string;
    eventType: string;
    data?: Record<string, unknown>;
    traceId?: string;
    correlationId?: string;
  },
): Promise<number> {
  const channel = `cognitive:events:${batchId}`;
  const message = JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
  });
  return redis.publish(channel, message);
}

/**
 * Records a data mutation for provenance tracking.
 * Inserts into bronze.import_data_mutations.
 */
export interface DataMutationInput {
  tenantId: string;
  rootBatchId?: string;
  sourceNodeKey: string;
  targetTable: string;
  targetEntityId?: string;
  operation: "insert" | "update" | "merge" | "soft_delete" | "restore" | "noop";
  changedFields?: string[];
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  traceId?: string;
  causationId?: string;
  actorId?: string;
}

export async function recordDataMutation(
  db: { execute: (query: unknown) => Promise<unknown> },
  mutation: DataMutationInput,
): Promise<void> {
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    INSERT INTO bronze.import_data_mutations 
    (tenant_id, root_batch_id, source_node_key, target_table, target_entity_id,
     operation, changed_fields, before_snapshot, after_snapshot,
     trace_id, causation_id, actor_id)
    VALUES (
      ${mutation.tenantId}::uuid,
      ${mutation.rootBatchId ?? null}::uuid,
      ${mutation.sourceNodeKey},
      ${mutation.targetTable},
      ${mutation.targetEntityId ?? null}::uuid,
      ${mutation.operation},
      ${mutation.changedFields ?? null},
      ${mutation.beforeSnapshot ? JSON.stringify(mutation.beforeSnapshot) : null}::jsonb,
      ${mutation.afterSnapshot ? JSON.stringify(mutation.afterSnapshot) : null}::jsonb,
      ${mutation.traceId ?? null},
      ${mutation.causationId ?? null},
      ${mutation.actorId ?? null}::uuid
    )
  `);
}
