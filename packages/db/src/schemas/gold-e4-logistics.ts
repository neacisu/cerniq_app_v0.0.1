/**
 * gold-e4-logistics.ts — Schema E4: Adrese, Livrări, Tracking, Colectări COD
 *
 * Ordinea de creare în SQL:
 *   1. gold_addresses  (nu depinde de alte tabele E4)
 *   2. gold_shipments  (depinde de gold_orders și gold_addresses)
 *   3. gold_shipment_tracking (depinde de gold_shipments)
 *   4. gold_cod_collections   (depinde de gold_shipments)
 *
 * La finalul migrației 0045_e4_logistics.sql se adaugă cu ALTER TABLE
 * FK-urile circulare pe gold_orders:
 *   - gold_orders.credit_approval_id → gold_credit_reservations
 *   - gold_orders.shipment_id        → gold_shipments
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  numeric,
  pgEnum,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { goldSchema, goldCompanies } from "./gold.js";
import { goldOrders } from "./gold-e4-orders.js";

// ---------------------------------------------------------------------------
// ENUM-URI E4 Logistics
// ---------------------------------------------------------------------------

export const carrierEnum = pgEnum("carrier", ["SAMEDAY", "FAN_COURIER", "CARGUS", "DPD", "GLS"]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "CREATED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNED",
]);

export const deliveryTypeEnum = pgEnum("delivery_type", ["STANDARD", "EXPRESS", "LOCKER"]);

export const codTypeEnum = pgEnum("cod_type", ["NONE", "CASH", "CARD"]);

// ---------------------------------------------------------------------------
// gold_addresses
// ---------------------------------------------------------------------------

export const goldAddresses = goldSchema.table(
  "gold_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    street: varchar("street", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    county: varchar("county", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    country: varchar("country", { length: 2 }).notNull().default("RO"),
    contactName: varchar("contact_name", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 32 }),
    isDefault: boolean("is_default").notNull().default(false),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_addresses_tenant_client").on(t.tenantId, t.clientId),
    check(
      "chk_gold_addresses_coords",
      sql`(${t.latitude} IS NULL AND ${t.longitude} IS NULL) OR (${t.latitude} BETWEEN -90 AND 90 AND ${t.longitude} BETWEEN -180 AND 180)`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// gold_shipments
// ---------------------------------------------------------------------------

export const goldShipments = goldSchema.table(
  "gold_shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => goldOrders.id, { onDelete: "restrict" }),
    awbNumber: varchar("awb_number", { length: 100 }),
    carrier: carrierEnum("carrier").notNull(),
    status: shipmentStatusEnum("status").notNull().default("CREATED"),
    deliveryType: deliveryTypeEnum("delivery_type").notNull().default("STANDARD"),
    codType: codTypeEnum("cod_type").notNull().default("NONE"),
    codAmount: numeric("cod_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    codCollected: boolean("cod_collected").notNull().default(false),
    samedayParcelId: varchar("sameday_parcel_id", { length: 100 }),
    trackingUrl: varchar("tracking_url", { length: 500 }),
    labelPdfUrl: varchar("label_pdf_url", { length: 500 }),
    estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
    actualDelivery: timestamp("actual_delivery", { withTimezone: true }),
    weight: numeric("weight", { precision: 8, scale: 2 }),
    addressId: uuid("address_id").references(() => goldAddresses.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_shipments_tenant_status").on(t.tenantId, t.status),
    index("idx_gold_shipments_awb").on(t.awbNumber),
    index("idx_gold_shipments_order").on(t.orderId),
    check("chk_gold_shipments_cod_amount", sql`${t.codAmount} >= 0`),
    check("chk_gold_shipments_weight", sql`${t.weight} IS NULL OR ${t.weight} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// gold_shipment_tracking
// ---------------------------------------------------------------------------

export const goldShipmentTracking = goldSchema.table(
  "gold_shipment_tracking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => goldShipments.id, { onDelete: "cascade" }),
    statusCode: varchar("status_code", { length: 50 }),
    statusText: varchar("status_text", { length: 255 }),
    locationCity: varchar("location_city", { length: 100 }),
    locationCounty: varchar("location_county", { length: 100 }),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_gold_shipment_tracking_shipment_ts").on(t.shipmentId, t.eventTimestamp)],
);

// ---------------------------------------------------------------------------
// gold_cod_collections
// ---------------------------------------------------------------------------

export const goldCodCollections = goldSchema.table(
  "gold_cod_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => goldShipments.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
    transferredToAccount: boolean("transferred_to_account").notNull().default(false),
    transferDate: timestamp("transfer_date", { withTimezone: true }),
  },
  (t) => [
    index("idx_gold_cod_collections_shipment").on(t.shipmentId),
    check("chk_gold_cod_amount", sql`${t.amount} > 0`),
  ],
);
