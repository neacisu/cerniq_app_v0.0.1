import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditSchema } from "./audit.js";
import { tenants } from "./tenants.js";

/** Înregistrări audit apeluri LLM (Plan §XV / FAZA 15). */
export const auditLlmCalls = auditSchema.table(
  "audit_llm_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    workerQueue: varchar("worker_queue", { length: 256 }).notNull(),
    modelUsed: varchar("model_used", { length: 256 }).notNull(),
    isSelfhosted: boolean("is_selfhosted").notNull().default(false),
    provider: varchar("provider", { length: 64 }).notNull(),
    fallbackReason: text("fallback_reason"),
    promptHash: varchar("prompt_hash", { length: 64 }).notNull(),
    tokensInput: integer("tokens_input").notNull().default(0),
    tokensOutput: integer("tokens_output").notNull().default(0),
    latencyMs: integer("latency_ms").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    guardrailPassed: boolean("guardrail_passed").notNull().default(true),
    llmguardScores: jsonb("llmguard_scores").$type<Record<string, unknown>>(),
    guardrailViolations: jsonb("guardrail_violations").$type<Record<string, unknown>[]>(),
    regenerationAttempt: integer("regeneration_attempt").notNull().default(0),
    allResponses: jsonb("all_responses").$type<Record<string, unknown>[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_audit_llm_calls_tenant_created").on(t.tenantId, t.createdAt.desc()),
    index("idx_audit_llm_calls_tenant_model_created").on(
      t.tenantId,
      t.modelUsed,
      t.createdAt.desc(),
    ),
  ],
);
