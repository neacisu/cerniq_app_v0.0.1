/**
 * Strat de abstractizare integrări externe (Plan §XXI Faza 21c).
 * `encrypted_value` = ciphertext OpenBao Transit / KMS — niciodată secret plain în DB.
 *
 * Tipurile PostgreSQL ENUM sunt create în migrare (schema `integration`); în Drizzle folosim varchar aliniat la aceleași valori.
 */
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";

export const integrationSchema = pgSchema("integration");

const allowedProviders = [
  "anaf",
  "termene",
  "onrc",
  "hunter",
  "zerobounce",
  "timelinesai",
  "instantly",
  "oblio",
  "sameday",
  "docusign",
] as const;

function sqlProviderInList(): ReturnType<typeof sql> {
  return sql.raw(allowedProviders.map((p) => `'${p}'`).join(","));
}

export const integrationConfigs = integrationSchema.table(
  "integration_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    config: jsonb("config").notNull().default({}).$type<Record<string, unknown>>(),
    active: boolean("active").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    rateLimitOverride: jsonb("rate_limit_override").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_integration_configs_tenant_provider").on(t.tenantId, t.provider),
    index("idx_integration_configs_tenant_active").on(t.tenantId, t.active),
    check("chk_integration_configs_provider", sql`${t.provider} IN (${sqlProviderInList()})`),
  ],
);

export const integrationCredentials = integrationSchema.table(
  "integration_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    integrationConfigId: uuid("integration_config_id").references(() => integrationConfigs.id, {
      onDelete: "set null",
    }),
    credentialType: varchar("credential_type", { length: 24 }).notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastRotatedAt: timestamp("last_rotated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_integration_credentials_tenant").on(t.tenantId),
    index("idx_integration_credentials_config").on(t.integrationConfigId),
    check(
      "chk_integration_credentials_type",
      sql`${t.credentialType} IN ('API_KEY','OAUTH_TOKEN','BEARER','BASIC_AUTH')`,
    ),
  ],
);

export const integrationHealthEvents = integrationSchema.table(
  "integration_health_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 32 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    latencyMs: integer("latency_ms"),
    errorMessage: text("error_message"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("idx_integration_health_provider_checked").on(t.provider, t.checkedAt.desc()),
    check("chk_integration_health_status", sql`${t.status} IN ('HEALTHY','DEGRADED','DOWN')`),
  ],
);

export const auditRetentionPolicies = integrationSchema.table(
  "audit_retention_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    dataType: varchar("data_type", { length: 64 }).notNull(),
    retentionDays: integer("retention_days").notNull(),
    anonymizeAfterDays: integer("anonymize_after_days"),
    autoDelete: boolean("auto_delete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_audit_retention_tenant_datatype").on(t.tenantId, t.dataType),
    index("idx_audit_retention_tenant").on(t.tenantId),
  ],
);
