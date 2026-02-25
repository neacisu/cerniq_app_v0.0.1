import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { InferSelectModel } from "drizzle-orm";
import postgres from "postgres";

import * as tenants from "./schemas/tenants.js";
import * as users from "./schemas/users.js";
import * as rbac from "./schemas/rbac.js";
import * as approval from "./schemas/approval.js";
import * as audit from "./schemas/audit.js";

const schema = { ...tenants, ...users, ...rbac, ...approval, ...audit };

const poolSize =
  typeof process.env.DB_POOL_SIZE === "string"
    ? Math.max(1, Math.min(100, parseInt(process.env.DB_POOL_SIZE, 10) || 10))
    : 10;

const postgresOptions = {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: true,
} as const;

export function createDbClient(connectionString: string) {
  const sql = postgres(connectionString, postgresOptions);
  const db = drizzle(sql, { schema });
  return { db, sql };
}

const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost:6432/cerniq";

let connection = createDbClient(connectionString);

/** Proxy so that all consumers always see the current DB client after refreshDbConnection(). */
export const db = new Proxy(connection.db, {
  get(_, prop: string) {
    return Reflect.get(connection.db, prop);
  },
}) as PostgresJsDatabase<typeof schema>;

/**
 * Reload DB connection using current process.env.DATABASE_URL.
 * Call this after reloading secrets (e.g. on SIGHUP) so the pool uses new credentials.
 */
export async function refreshDbConnection(): Promise<void> {
  await connection.sql.end();
  const url = process.env.DATABASE_URL ?? "postgresql://localhost:6432/cerniq";
  connection = createDbClient(url);
}

/** Close the DB connection (e.g. on graceful shutdown). Call once before process exit. */
export async function closeDbConnection(): Promise<void> {
  await connection.sql.end();
}

const SENTINEL_TENANT_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Set session variable app.tenant_id for RLS policies.
 * Call at the start of each request (e.g. from tenant-context onRequest).
 * Use SENTINEL when tenantId is null so current_setting('app.tenant_id') does not throw and RLS filters all rows.
 */
export async function setSessionTenantId(tenantId: string | null): Promise<void> {
  const value = tenantId ?? SENTINEL_TENANT_ID;
  await connection.sql`SELECT set_config('app.tenant_id', ${value}, true)`;
}

/** Look up user by email (SECURITY DEFINER, bypasses RLS). Use for login only. */
export async function get_user_by_email(
  email: string,
): Promise<InferSelectModel<typeof users.users> | null> {
  type RawRow = {
    id: string;
    tenant_id: string;
    email: string;
    password_hash: string | null;
    name: string;
    role: string;
    status: string;
    created_at: Date;
    updated_at: Date;
  };
  const rows = await connection.sql<[RawRow]>`SELECT * FROM get_user_by_email(${email})`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role as InferSelectModel<typeof users.users>["role"],
    status: row.status as InferSelectModel<typeof users.users>["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
