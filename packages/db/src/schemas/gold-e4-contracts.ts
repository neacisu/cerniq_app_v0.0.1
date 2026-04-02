/**
 * gold-e4-contracts.ts — Schema E4: Contracte, Template-uri, Clauze, Audit Log partiționat
 *
 * riskTierEnum este importat din gold-e4-credit.ts (plan E4: enum partajat).
 *
 * gold_audit_logs_etapa4 este definit în Drizzle pentru type safety, dar
 * în baza de date este creat ca tabel PARTIȚIONAT BY RANGE (created_at).
 * Partiționarea și partițiile inițiale sunt gestionate exclusiv în SQL:
 * packages/db/drizzle/0046_e4_contracts.sql (ADR-0095).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { goldSchema, goldCompanies } from "./gold.js";
import { goldOrders } from "./gold-e4-orders.js";
import { riskTierEnum } from "./gold-e4-credit.js";

// ---------------------------------------------------------------------------
// ENUM-URI E4 Contracts
// ---------------------------------------------------------------------------

export const contractStatusEnum = pgEnum("contract_status", [
  "DRAFT",
  "PENDING_SIGNATURE",
  "SENT_DOCUSIGN",
  "SIGNED",
  "EXPIRED",
  "CANCELLED",
]);

export const actorTypeEnum = pgEnum("actor_type", ["SYSTEM", "USER", "WORKER", "CRON"]);

// riskTierEnum partajat cu gold-e4-credit.ts (plan E4: același enum pentru credit și contracte)
export { riskTierEnum } from "./gold-e4-credit.js";

// ---------------------------------------------------------------------------
// gold_contracts
// ---------------------------------------------------------------------------

export const goldContracts = goldSchema.table(
  "gold_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => goldOrders.id, {
      onDelete: "set null",
    }),
    riskTier: riskTierEnum("risk_tier").notNull().default("MEDIUM"),
    status: contractStatusEnum("status").notNull().default("DRAFT"),
    docusignEnvelopeId: varchar("docusign_envelope_id", { length: 255 }),
    docusignStatus: varchar("docusign_status", { length: 100 }),
    pdfUrl: varchar("pdf_url", { length: 500 }),
    signedPdfUrl: varchar("signed_pdf_url", { length: 500 }),
    /** Array de coduri clauze: ["C001", "C002", ...] */
    clausesUsed: jsonb("clauses_used").notNull().default([]),
    validForDays: integer("valid_for_days").notNull().default(30),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_contracts_tenant_status").on(t.tenantId, t.status),
    index("idx_gold_contracts_docusign").on(t.docusignEnvelopeId),
    index("idx_gold_contracts_client").on(t.clientId),
    check("chk_gold_contracts_valid_days", sql`${t.validForDays} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// gold_contract_templates
// ---------------------------------------------------------------------------

export const goldContractTemplates = goldSchema.table(
  "gold_contract_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    version: integer("version").notNull().default(1),
    templateDocxUrl: varchar("template_docx_url", { length: 500 }),
    /** Array de risk tiers aplicabile: ["LOW", "MEDIUM", ...] */
    applicableRiskTiers: jsonb("applicable_risk_tiers").notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_contract_templates_tenant_active").on(t.tenantId, t.isActive),
    check("chk_gold_contract_template_version", sql`${t.version} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// gold_contract_clauses
// ---------------------------------------------------------------------------

export const goldContractClauses = goldSchema.table(
  "gold_contract_clauses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull(),
    content: text("content").notNull(),
    isMandatory: boolean("is_mandatory").notNull().default(false),
    /** Array de risk tiers aplicabile: ["LOW", "MEDIUM", ...] */
    applicableRiskTiers: jsonb("applicable_risk_tiers").notNull().default([]),
    category: varchar("category", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_gold_contract_clauses_code").on(t.code)],
);

// ---------------------------------------------------------------------------
// gold_audit_logs_etapa4
//
// IMPORTANT: Drizzle nu suportă nativ PARTITION BY RANGE.
// Tabelul fizic este creat în SQL cu partitionare (ADR-0095).
// Această definiție Drizzle servește exclusiv pentru type safety și
// generarea tipurilor TypeScript. Nu se executa `drizzle-kit push` pe
// acest tabel — se folosesc exclusiv migrațiile SQL manuale.
//
// PK în SQL este composite: PRIMARY KEY (id, created_at) — cerință PostgreSQL
// pentru tabele partiționate. În Drizzle declarăm doar id ca PK (type safety).
// ---------------------------------------------------------------------------

export const goldAuditLogsEtapa4 = goldSchema.table(
  "gold_audit_logs_etapa4",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    actorId: uuid("actor_id"),
    actorType: actorTypeEnum("actor_type").notNull().default("SYSTEM"),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    /**
     * SHA-256 hash chain: sha256(id || eventType || entityId || createdAt || prevHash)
     * Garantează integritatea auditului: orice modificare anterioară
     * invalidează hash-urile ulterioare (ADR-0095).
     */
    prevHash: varchar("prev_hash", { length: 64 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_audit_e4_tenant_entity").on(t.tenantId, t.entityType, t.entityId),
    index("idx_gold_audit_e4_tenant_event").on(t.tenantId, t.eventType),
    index("idx_gold_audit_e4_created").on(t.createdAt),
  ],
);
