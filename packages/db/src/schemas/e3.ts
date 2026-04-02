import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { goldSchema, goldCompanies } from "./gold.js";
import { halfvec } from "./pgvector.js";

function pgTsvector(name: string) {
  return customType<{ data: unknown; driverData: string }>({
    dataType() {
      return "tsvector";
    },
  })(name);
}

/**
 * Converts a readonly string tuple to a SQL IN-list literal.
 * e.g. ["A","B"] → "'A','B'"
 * Used in Drizzle check() constraints to avoid nested template literals (S4624).
 */
function sqlInList(values: readonly string[]): string {
  return values.map((v) => "'" + v + "'").join(",");
}

const negotiationStates = [
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSING",
  "PROFORMA_SENT",
  "INVOICED",
  "PAID",
  "DEAD",
] as const;

const aiMessageRoles = ["system", "user", "assistant", "tool"] as const;

const guardrailSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const oblioDocTypes = ["PROFORMA", "INVOICE", "CREDIT_NOTE"] as const;

const einvoiceStatuses = [
  "PENDING",
  "SENDING",
  "SENT",
  "PROCESSING",
  "VALIDATED",
  "REJECTED",
  "ERROR",
] as const;

export const goldProductCategories = goldSchema.table(
  "gold_product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name"),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    index("idx_gold_product_categories_tenant").on(t.tenantId),
    index("idx_gold_product_categories_parent").on(t.parentId),
  ],
);

export const goldProducts = goldSchema.table(
  "gold_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku"),
    description: text("description"),
    categoryId: uuid("category_id").references(() => goldProductCategories.id, {
      onDelete: "set null",
    }),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("RON"),
    searchVector: pgTsvector("search_vector"),
    nameTrigram: text("name_trigram"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_gold_products_tenant_sku").on(t.tenantId, t.sku),
    index("idx_gold_products_tenant").on(t.tenantId),
    index("idx_gold_products_tenant_active").on(t.tenantId, t.isActive),
    index("idx_gold_products_category").on(t.categoryId),
    index("idx_gold_products_search_vector").using("gin", t.searchVector),
    index("idx_gold_products_name_trgm").using("gin", sql`${t.nameTrigram} gin_trgm_ops`),
  ],
);

export const goldProductEmbeddings = goldSchema.table(
  "gold_product_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => goldProducts.id, { onDelete: "cascade" }),
    embedding: halfvec("embedding", { dimensions: 3072 }).notNull(),
    model: text("model").notNull().default("qwen3-embedding-8b"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_product_embeddings_tenant").on(t.tenantId),
    index("idx_gold_product_embeddings_product").on(t.productId),
    index("idx_gold_product_embeddings_embedding").using(
      "hnsw",
      t.embedding.op("halfvec_cosine_ops"),
    ),
  ],
);

export const goldProductChunks = goldSchema.table(
  "gold_product_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => goldProducts.id, { onDelete: "cascade" }),
    chunkText: text("chunk_text"),
    chunkIndex: integer("chunk_index"),
    embedding: halfvec("embedding", { dimensions: 3072 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_product_chunks_tenant").on(t.tenantId),
    index("idx_gold_product_chunks_product").on(t.productId),
  ],
);

export const priceRules = goldSchema.table(
  "price_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => goldProducts.id, { onDelete: "cascade" }),
    ruleType: text("rule_type"),
    minQuantity: integer("min_quantity"),
    discountPct: numeric("discount_pct", { precision: 5, scale: 2 }),
    minMarginPct: numeric("min_margin_pct", { precision: 5, scale: 2 }).notNull().default("8.0"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_price_rules_tenant_product").on(t.tenantId, t.productId)],
);

export const goldNegotiations = goldSchema.table(
  "gold_negotiations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    /**
     * Sticky WA phone assigned to this negotiation.
     * References outreach.wa_phone_numbers(id) — cross-schema, no FK constraint (plan L8409).
     * Used by J59 channel:whatsapp:send for consistent client communication.
     */
    assignedPhoneId: uuid("assigned_phone_id"),
    currentState: text("current_state").notNull().default("DISCOVERY"),
    /**
     * AI confidence score [0..1] from last C15 response:generate.
     * J56 handover:detect triggers handover when confidence < 0.3.
     */
    aiConfidenceScore: numeric("ai_confidence_score", { precision: 5, scale: 4 }),
    engagementScore: numeric("engagement_score", { precision: 5, scale: 2 }),
    closeProbability: numeric("close_probability", { precision: 5, scale: 2 }),
    totalValue: numeric("total_value", { precision: 14, scale: 2 }),
    /** Maximum discount offered during negotiation — J56 triggers handover if > 30%. */
    maxDiscountOffered: numeric("max_discount_offered", { precision: 5, scale: 2 }),
    /**
     * L68 mcp:session:manage — ID sesiune MCP activă (TTL 30min).
     * Corelat cu mcp_session_expires_at; NULL = nicio sesiune activă.
     */
    mcpSessionId: text("mcp_session_id"),
    /**
     * Timestamp expirare sesiune MCP. L68 expire curăță câmpul când < now().
     * L69 health:check numără negocierile cu sesiune activă (> now()).
     */
    mcpSessionExpiresAt: timestamp("mcp_session_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_gold_negotiations_state",
      sql`${t.currentState} IN (${sql.raw(sqlInList(negotiationStates))})`,
    ),
    index("idx_gold_negotiations_tenant").on(t.tenantId),
    index("idx_gold_negotiations_lead").on(t.leadId),
    index("idx_gold_negotiations_assigned").on(t.assignedUserId),
  ],
);

export const negotiationStateHistory = goldSchema.table(
  "negotiation_state_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    negotiationId: uuid("negotiation_id")
      .notNull()
      .references(() => goldNegotiations.id, { onDelete: "cascade" }),
    fromState: text("from_state"),
    toState: text("to_state"),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_negotiation_state_history_negotiation").on(t.negotiationId),
    index("idx_negotiation_state_history_tenant").on(t.tenantId),
  ],
);

export const negotiationItems = goldSchema.table(
  "negotiation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    negotiationId: uuid("negotiation_id")
      .notNull()
      .references(() => goldNegotiations.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => goldProducts.id, { onDelete: "restrict" }),
    quantity: integer("quantity"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    discountPct: numeric("discount_pct", { precision: 5, scale: 2 }),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_negotiation_items_negotiation").on(t.negotiationId),
    index("idx_negotiation_items_product").on(t.productId),
  ],
);

export const stockInventory = goldSchema.table(
  "stock_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => goldProducts.id, { onDelete: "cascade" }),
    sku: text("sku"),
    totalQuantity: integer("total_quantity").notNull().default(0),
    reservedQuantity: integer("reserved_quantity").notNull().default(0),
    warehouseLocation: text("warehouse_location"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_stock_inventory_tenant_product").on(t.tenantId, t.productId)],
);

export const stockReservations = goldSchema.table(
  "stock_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => stockInventory.id, { onDelete: "cascade" }),
    negotiationId: uuid("negotiation_id")
      .notNull()
      .references(() => goldNegotiations.id, { onDelete: "cascade" }),
    quantity: integer("quantity"),
    reservationState: text("reservation_state"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_stock_reservations_inventory").on(t.inventoryId),
    index("idx_stock_reservations_negotiation").on(t.negotiationId),
  ],
);

export const aiConversations = goldSchema.table(
  "ai_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => goldCompanies.id, { onDelete: "set null" }),
    negotiationId: uuid("negotiation_id").references(() => goldNegotiations.id, {
      onDelete: "set null",
    }),
    sessionId: text("session_id"),
    /**
     * L68 mcp:session:manage — ID sesiune MCP asociată conversației.
     * Legat de mcp_session_id pe gold_negotiations.
     */
    mcpSessionId: text("mcp_session_id"),
    modelUsed: text("model_used"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    totalTokens: integer("total_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_ai_conversations_tenant").on(t.tenantId),
    index("idx_ai_conversations_lead").on(t.leadId),
    index("idx_ai_conversations_negotiation").on(t.negotiationId),
  ],
);

export const aiConversationMessages = goldSchema.table(
  "ai_conversation_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content"),
    tokens: integer("tokens"),
    /**
     * K61 sentiment:analyze rezultat — stocat pe mesaj pentru K64 trend analysis.
     * Score -1..1: -1=extrem negativ, 0=neutru, 1=extrem pozitiv.
     */
    sentimentScore: numeric("sentiment_score", { precision: 4, scale: 3 }),
    /** K61 label: POSITIVE | NEUTRAL | NEGATIVE */
    sentimentLabel: text("sentiment_label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_ai_conversation_messages_role",
      sql`${t.role} IN (${sql.raw(sqlInList(aiMessageRoles))})`,
    ),
    index("idx_ai_conversation_messages_conversation").on(t.conversationId),
    index("idx_ai_conversation_messages_sentiment").on(t.sentimentScore, t.createdAt),
  ],
);

export const aiToolCalls = goldSchema.table(
  "ai_tool_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => aiConversationMessages.id, {
      onDelete: "set null",
    }),
    toolName: text("tool_name"),
    input: jsonb("input"),
    output: jsonb("output"),
    durationMs: integer("duration_ms"),
    success: boolean("success"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_ai_tool_calls_conversation").on(t.conversationId),
    index("idx_ai_tool_calls_message").on(t.messageId),
  ],
);

export const guardrailViolations = goldSchema.table(
  "guardrail_violations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nodeKey: text("node_key"),
    violationType: text("violation_type"),
    severity: text("severity").notNull(),
    details: jsonb("details"),
    resolution: text("resolution"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_guardrail_violations_severity",
      sql`${t.severity} IN (${sql.raw(sqlInList(guardrailSeverities))})`,
    ),
    index("idx_guardrail_violations_tenant_created").on(t.tenantId, t.createdAt),
  ],
);

export const oblioDocuments = goldSchema.table(
  "oblio_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    series: text("series"),
    number: integer("number"),
    oblioId: text("oblio_id"),
    status: text("status"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    vat: numeric("vat", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_oblio_documents_type",
      sql`${t.documentType} IN (${sql.raw(sqlInList(oblioDocTypes))})`,
    ),
    check("chk_oblio_documents_total", sql`${t.total} = ${t.subtotal} + ${t.vat}`),
    unique("uq_oblio_documents_tenant_type_series_num").on(
      t.tenantId,
      t.documentType,
      t.series,
      t.number,
    ),
    index("idx_oblio_documents_tenant").on(t.tenantId),
  ],
);

export const einvoiceSubmissions = goldSchema.table(
  "einvoice_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    oblioDocumentId: uuid("oblio_document_id")
      .notNull()
      .references(() => oblioDocuments.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("PENDING"),
    indexSpv: text("index_spv"),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_einvoice_submissions_status",
      sql`${t.status} IN (${sql.raw(sqlInList(einvoiceStatuses))})`,
    ),
    index("idx_einvoice_submissions_document").on(t.oblioDocumentId),
    index("idx_einvoice_submissions_tenant_status").on(t.tenantId, t.status),
  ],
);

export const fiscalAuditTrail = goldSchema.table(
  "fiscal_audit_trail",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    action: text("action"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    prevHash: text("prev_hash"),
    hash: text("hash"),
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_fiscal_audit_trail_tenant_entity").on(t.tenantId, t.entityType, t.entityId)],
);

export const fsmValidTransitions = goldSchema.table(
  "fsm_valid_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fsmType: text("fsm_type").notNull(),
    fromState: text("from_state").notNull(),
    toState: text("to_state").notNull(),
    requiresRole: text("requires_role"),
  },
  (t) => [
    unique("uq_fsm_valid_transitions").on(t.fsmType, t.fromState, t.toState),
    index("idx_fsm_valid_transitions_fsm").on(t.fsmType),
  ],
);

export const fsmStateAllowedTools = goldSchema.table(
  "fsm_state_allowed_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fsmType: text("fsm_type").notNull(),
    state: text("state").notNull(),
    toolName: text("tool_name").notNull(),
  },
  (t) => [
    unique("uq_fsm_state_allowed_tools").on(t.fsmType, t.state, t.toolName),
    index("idx_fsm_state_allowed_tools_fsm_state").on(t.fsmType, t.state),
  ],
);

/**
 * K65 feedback:collect — NPS 1-5 + free text per negociere.
 * Stochează feedback-ul colectat după fiecare interacțiune AI sau la finalul
 * negocierii pentru quality monitoring și model improvement.
 *
 * FAZA 7l — Plan L1905.
 */
export const goldNegotiationFeedback = goldSchema.table(
  "gold_negotiation_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    negotiationId: uuid("negotiation_id")
      .notNull()
      .references(() => goldNegotiations.id, { onDelete: "cascade" }),
    /** NPS score 1-5 (1=very dissatisfied, 5=very satisfied). */
    nps: integer("nps").notNull(),
    freeText: text("free_text"),
    /** Channel-ul de unde a venit feedback-ul: WA, EMAIL, IN_APP, API. */
    sourceChannel: text("source_channel"),
    /** ID-ul mesajului AI care a declanșat colectarea feedback-ului. */
    triggerMessageId: uuid("trigger_message_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_negotiation_feedback_nps", sql`${t.nps} BETWEEN 1 AND 5`),
    index("idx_negotiation_feedback_negotiation").on(t.negotiationId),
    index("idx_negotiation_feedback_tenant_created").on(t.tenantId, t.createdAt),
  ],
);
