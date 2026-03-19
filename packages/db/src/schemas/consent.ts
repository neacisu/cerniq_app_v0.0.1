import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { users } from "./users.js";

export const userConsentLogs = pgTable(
  "user_consent_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userIdentifier: text("user_identifier").notNull(),
    consentVersion: integer("consent_version").notNull().default(1),
    consentCategories: jsonb("consent_categories").notNull(),
    bannerVersion: varchar("banner_version", { length: 50 }).notNull(),
    consentGivenAt: timestamp("consent_given_at", { withTimezone: true }).notNull().defaultNow(),
    consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW() + INTERVAL '12 months'`),
    consentWithdrawnAt: timestamp("consent_withdrawn_at", { withTimezone: true }),
    consentIpHash: text("consent_ip_hash").notNull(),
    userAgent: text("user_agent"),
    consentMethod: varchar("consent_method", { length: 30 }).notNull().default("banner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_consent_user").on(t.userId),
    index("idx_consent_identifier").on(t.userIdentifier),
    index("idx_consent_tenant").on(t.tenantId),
    index("idx_consent_expires").on(t.consentExpiresAt),
    check(
      "valid_categories",
      sql`${t.consentCategories} ? 'necessary' AND (${t.consentCategories}->>'necessary')::boolean = true`,
    ),
  ],
);
