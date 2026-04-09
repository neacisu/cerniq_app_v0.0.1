import { index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

/**
 * Payload-uri mari pentru job-uri (ex. BullMQ >10KB) — referință UUID în Redis.
 * Izolare tenant prin RLS (app.tenant_id).
 */
export const jobPayloads = pgTable(
  "job_payloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_job_payloads_tenant_created").on(t.tenantId, t.createdAt.desc()),
    index("idx_job_payloads_expires_at").on(t.expiresAt),
  ],
);
