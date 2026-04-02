/**
 * gold-e4-orders.ts — Schema E4: Comenzi, Plăți, Reconcilieri, Rambursuri, Webhooks Revolut
 *
 * Notă arhitecturală: gold_orders.credit_approval_id și gold_orders.shipment_id
 * sunt UUID-uri fără constraint FK inline din cauza dependenței circulare cu
 * gold_credit_reservations și gold_shipments. FK-urile sunt adăugate cu
 * ALTER TABLE în migrația 0045_e4_logistics.sql (după crearea ambelor tabele).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { goldSchema, goldCompanies } from "./gold.js";
import { goldProducts } from "./e3.js";

// ---------------------------------------------------------------------------
// ENUM-URI E4 Orders
// ---------------------------------------------------------------------------

const orderStates = [
  "DRAFT",
  "CONFIRMED",
  "PROFORMA_SENT",
  "PROFORMA_PAID",
  "CREDIT_APPROVED",
  "CREDIT_PENDING",
  "CREDIT_REJECTED",
  "STOCK_RESERVED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNED",
  "RETURN_PROCESSING",
  "INVOICED",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "CANCELLED",
  "COMPLETED",
] as const;

export const orderStatusEnum = pgEnum("order_status", [...orderStates]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "BANK_TRANSFER",
  "REVOLUT",
  "CARD",
  "COD",
  "CREDIT",
]);

export const paymentSourceEnum = pgEnum("payment_source", [
  "REVOLUT",
  "BANK_TRANSFER",
  "CARD",
  "COD",
  "MANUAL",
]);

export const reconciliationStatusEnum = pgEnum("reconciliation_status", [
  "PENDING",
  "MATCHED_EXACT",
  "MATCHED_FUZZY",
  "UNMATCHED",
  "MANUAL_MATCHED",
  "DISPUTED",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "REQUESTED",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
]);

export const matchTypeEnum = pgEnum("match_type", [
  "EXACT_REFERENCE",
  "FUZZY_NAME_AMOUNT",
  "MANUAL",
  "AUTO_PARTIAL",
]);

// ---------------------------------------------------------------------------
// gold_orders
// ---------------------------------------------------------------------------

export const goldOrders = goldSchema.table(
  "gold_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "restrict" }),
    orderNumber: varchar("order_number", { length: 50 }).notNull(),
    status: orderStatusEnum("status").notNull().default("DRAFT"),
    paymentMethod: paymentMethodEnum("payment_method"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    amountDue: numeric("amount_due", { precision: 12, scale: 2 }).notNull().default("0"),
    /**
     * FK → gold_credit_reservations.id
     * Deferred: FK adăugat cu ALTER TABLE în 0045_e4_logistics.sql
     * (dependență circulară: gold_orders ↔ gold_credit_reservations)
     */
    creditApprovalId: uuid("credit_approval_id"),
    /**
     * FK → gold_shipments.id
     * Deferred: FK adăugat cu ALTER TABLE în 0045_e4_logistics.sql
     * (dependență circulară: gold_orders ↔ gold_shipments)
     */
    shipmentId: uuid("shipment_id"),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),
    /**
     * Data scadentă a plății pentru această comandă.
     * Setat la creare (default: created_at + 30 zile) sau explicit de API.
     * Utilizat de B11 (payment:overdue:detect) pentru detectarea restanțelor.
     * Adăugat în migrația 0047_e4_payment_due_date.sql (FAZA 8c).
     */
    paymentDueAt: timestamp("payment_due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    unique("uq_gold_orders_tenant_number").on(t.tenantId, t.orderNumber),
    index("idx_gold_orders_tenant_status").on(t.tenantId, t.status),
    index("idx_gold_orders_tenant_lead").on(t.tenantId, t.leadId),
    index("idx_gold_orders_number").on(t.orderNumber),
    index("idx_gold_orders_soft_delete")
      .on(t.deletedAt)
      .where(sql`${t.deletedAt} IS NOT NULL`),
    check(
      "chk_gold_orders_amounts",
      sql`${t.totalAmount} >= 0 AND ${t.amountPaid} >= 0 AND ${t.amountDue} >= 0`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// gold_order_items
// ---------------------------------------------------------------------------

export const goldOrderItems = goldSchema.table(
  "gold_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => goldOrders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => goldProducts.id, {
      onDelete: "set null",
    }),
    productName: varchar("product_name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    stockReserved: boolean("stock_reserved").notNull().default(false),
    stockDeducted: boolean("stock_deducted").notNull().default(false),
  },
  (t) => [
    index("idx_gold_order_items_order").on(t.orderId),
    check("chk_gold_order_items_qty", sql`${t.quantity} > 0`),
    check("chk_gold_order_items_discount", sql`${t.discountPercent} BETWEEN 0 AND 100`),
  ],
);

// ---------------------------------------------------------------------------
// gold_payments
// ---------------------------------------------------------------------------

export const goldPayments = goldSchema.table(
  "gold_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => goldOrders.id, {
      onDelete: "set null",
    }),
    externalId: varchar("external_id", { length: 255 }),
    externalSource: paymentSourceEnum("external_source").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),
    reconciliationStatus: reconciliationStatusEnum("reconciliation_status")
      .notNull()
      .default("PENDING"),
    counterpartyName: varchar("counterparty_name", { length: 255 }),
    counterpartyIban: varchar("counterparty_iban", { length: 34 }),
    reference: varchar("reference", { length: 500 }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_gold_payments_external_id").on(t.externalId),
    index("idx_gold_payments_tenant_status").on(t.tenantId, t.reconciliationStatus),
    index("idx_gold_payments_order").on(t.orderId),
    check("chk_gold_payments_amount", sql`${t.amount} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// gold_payment_reconciliations
// ---------------------------------------------------------------------------

export const goldPaymentReconciliations = goldSchema.table(
  "gold_payment_reconciliations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => goldPayments.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => goldOrders.id, { onDelete: "cascade" }),
    matchType: matchTypeEnum("match_type").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    matchedBy: varchar("matched_by", { length: 100 }),
    matchedAt: timestamp("matched_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_gold_payment_reconciliations_payment").on(t.paymentId),
    check(
      "chk_gold_reconciliation_confidence",
      sql`${t.confidence} IS NULL OR (${t.confidence} BETWEEN 0 AND 1)`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// gold_refunds
// ---------------------------------------------------------------------------

export const goldRefunds = goldSchema.table(
  "gold_refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => goldPayments.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => goldOrders.id, { onDelete: "restrict" }),
    status: refundStatusEnum("status").notNull().default("REQUESTED"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason"),
    revolutRefundId: varchar("revolut_refund_id", { length: 255 }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_refunds_tenant_status").on(t.tenantId, t.status),
    index("idx_gold_refunds_order").on(t.orderId),
    check("chk_gold_refunds_amount", sql`${t.amount} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// revolut_webhooks_raw
// ---------------------------------------------------------------------------

export const revolutWebhooksRaw = goldSchema.table(
  "revolut_webhooks_raw",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    signature: varchar("signature", { length: 500 }),
    verified: boolean("verified").notNull().default(false),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_revolut_webhooks_idempotency").on(t.idempotencyKey),
    index("idx_revolut_webhooks_tenant_event").on(t.tenantId, t.eventType),
  ],
);
