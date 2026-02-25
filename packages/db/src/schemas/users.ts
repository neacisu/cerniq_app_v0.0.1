import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "manager",
  "operator",
  "viewer",
]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "pending", "locked"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash"),
    name: varchar("name", { length: 200 }).notNull(),
    role: userRoleEnum("role").notNull().default("viewer"),
    status: userStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("users_tenant_email_idx").on(t.tenantId, t.email),
    index("users_email_idx").on(t.email),
  ],
);
