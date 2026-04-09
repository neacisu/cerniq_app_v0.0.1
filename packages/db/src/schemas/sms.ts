/**
 * SMS channel — tabele dedicate workerilor SMS (FAZA 15).
 *
 * **Raport la `communication_log`:**
 * - Mesajele „omnichannel” rămân în `outreach.communication_log` cu `channel = 'SMS'` și
 *   `status` din `message_status_enum` (nu include REJECTED/OPTED_OUT).
 * - `sms_messages` stochează detalii specifice furnizorului (cost, segmente, provider id),
 *   inclusiv statusuri SMS-only (`REJECTED`, `OPTED_OUT`) prin varchar + CHECK.
 * - La livrare, workerii pot înscrie rând în ambele locuri: audit general + telemetrie SMS.
 */
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { goldCompanies } from "./gold.js";
import { leadJourney, outreachSchema } from "./outreach.js";
import { messageDirectionEnum } from "./outreach-enums.js";

/** Valori permise — trebuie să coincidă cu `chk_sms_messages_provider` în migrare. */
export const SMS_PROVIDER_VALUES = ["TWILIO", "VONAGE", "AWS_SNS", "SMSADVERT"] as const;
export type SmsProvider = (typeof SMS_PROVIDER_VALUES)[number];

/** Status livrare SMS — include valori care nu există în `message_status_enum`. */
export const SMS_MESSAGE_STATUS_VALUES = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "REJECTED",
  "OPTED_OUT",
] as const;
export type SmsMessageStatus = (typeof SMS_MESSAGE_STATUS_VALUES)[number];

/** Sursă înregistrare opt-out (GDPR/TCPA). */
export const SMS_OPT_OUT_SOURCE_VALUES = ["REPLY_STOP", "MANUAL", "API"] as const;
export type SmsOptOutSource = (typeof SMS_OPT_OUT_SOURCE_VALUES)[number];

export const smsMessages = outreachSchema.table(
  "sms_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    journeyId: uuid("journey_id")
      .notNull()
      .references(() => leadJourney.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
    provider: varchar("provider", { length: 16 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    direction: messageDirectionEnum("direction").notNull(),
    content: text("content").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("QUEUED"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    segments: integer("segments").notNull().default(1),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    failedReason: text("failed_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_sms_messages_tenant_created").on(t.tenantId, t.createdAt.desc()),
    index("idx_sms_messages_journey").on(t.journeyId, t.createdAt.desc()),
    index("idx_sms_messages_provider_msg").on(t.provider, t.providerMessageId),
    check(
      "chk_sms_messages_provider",
      sql`${t.provider} IN ('TWILIO','VONAGE','AWS_SNS','SMSADVERT')`,
    ),
    check(
      "chk_sms_messages_status",
      sql`${t.status} IN ('QUEUED','SENT','DELIVERED','FAILED','REJECTED','OPTED_OUT')`,
    ),
  ],
);

export const smsOptOuts = outreachSchema.table(
  "sms_opt_outs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
    source: varchar("source", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
  },
  (t) => [
    unique("uq_sms_opt_outs_tenant_phone").on(t.tenantId, t.phoneNumber),
    index("idx_sms_opt_outs_tenant").on(t.tenantId),
    check("chk_sms_opt_outs_source", sql`${t.source} IN ('REPLY_STOP','MANUAL','API')`),
  ],
);

export const smsTemplates = outreachSchema.table(
  "sms_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    bodyTemplate: text("body_template").notNull(),
    variables: jsonb("variables").notNull().default({}).$type<Record<string, unknown>>(),
    maxSegments: integer("max_segments").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_sms_templates_tenant_name").on(t.tenantId, t.name),
    index("idx_sms_templates_tenant_active").on(t.tenantId, t.isActive),
    check("chk_sms_templates_max_segments", sql`${t.maxSegments} >= 1 AND ${t.maxSegments} <= 10`),
  ],
);
