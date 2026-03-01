import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";
import { users } from "./users.js";

export const inviteCodes = pgTable("invite_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  maxUses: integer("max_uses").default(10),
  usedCount: integer("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
