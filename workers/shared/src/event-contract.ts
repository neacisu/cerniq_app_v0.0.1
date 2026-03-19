import { randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * Standardized event contract envelope for all inter-worker messages.
 * Ensures idempotency, traceability and tenant isolation.
 */
export const eventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string().min(1).max(128),
  idempotencyKey: z.string().min(1).max(256),
  timestamp: z.string().datetime(),
  correlationId: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  source: z.string().min(1).max(64),
  version: z.literal("1.0").default("1.0"),
  payload: z.record(z.string(), z.unknown()),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

/**
 * Creates a standardized event envelope with auto-generated IDs.
 */
export function createEvent(args: {
  eventType: string;
  tenantId: string;
  source: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  idempotencyKey?: string;
}): EventEnvelope {
  const eventId = randomUUID();
  return {
    eventId,
    eventType: args.eventType,
    idempotencyKey: args.idempotencyKey ?? `${args.eventType}:${eventId}`,
    timestamp: new Date().toISOString(),
    correlationId: args.correlationId,
    tenantId: args.tenantId,
    source: args.source,
    version: "1.0",
    payload: args.payload,
  };
}

/**
 * Validates an incoming event envelope.
 * Throws a descriptive error if invalid.
 */
export function validateEvent(raw: unknown): EventEnvelope {
  const result = eventEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid event envelope: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }
  return result.data;
}

/**
 * Known event types for Etapa 1 pipeline.
 */
export const EVENT_TYPES = {
  // Ingest
  BRONZE_CONTACT_INGESTED: "bronze.contact.ingested",
  BRONZE_BATCH_COMPLETED: "bronze.batch.completed",
  // Normalize
  BRONZE_NORMALIZED: "bronze.contact.normalized",
  // Promote
  SILVER_COMPANY_CREATED: "silver.company.created",
  SILVER_COMPANY_UPDATED: "silver.company.updated",
  SILVER_COMPANY_MERGED: "silver.company.merged",
  // Enrich
  SILVER_ENRICHMENT_STARTED: "silver.enrichment.started",
  SILVER_ENRICHMENT_COMPLETED: "silver.enrichment.completed",
  SILVER_ENRICHMENT_FAILED: "silver.enrichment.failed",
  // Score
  SILVER_SCORED: "silver.company.scored",
  // Dedup
  DEDUP_CANDIDATE_FOUND: "silver.dedup.candidate_found",
  DEDUP_DECISION_MADE: "silver.dedup.decision_made",
  // Gold
  GOLD_COMPANY_CREATED: "gold.company.created",
  GOLD_COMPANY_UPDATED: "gold.company.updated",
  GOLD_LEAD_STATE_CHANGED: "gold.lead.state_changed",
  // HITL
  HITL_TASK_CREATED: "hitl.task.created",
  HITL_TASK_RESOLVED: "hitl.task.resolved",
  HITL_TASK_ESCALATED: "hitl.task.escalated",
  HITL_TASK_EXPIRED: "hitl.task.expired",
  // Pipeline
  PIPELINE_STAGE_COMPLETED: "pipeline.stage.completed",
  PIPELINE_ERROR: "pipeline.error",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
