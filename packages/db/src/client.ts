import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { InferSelectModel } from "drizzle-orm";
import postgres from "postgres";

import * as tenants from "./schemas/tenants.js";
import * as users from "./schemas/users.js";
import * as rbac from "./schemas/rbac.js";
import * as approval from "./schemas/approval.js";
import * as audit from "./schemas/audit.js";
import * as consent from "./schemas/consent.js";
import * as inviteCodesSchema from "./schemas/invite-codes.js";
import * as bronze from "./schemas/bronze.js";
import * as silver from "./schemas/silver.js";
import * as gold from "./schemas/gold.js";
import * as outreachEnums from "./schemas/outreach-enums.js";
import * as outreach from "./schemas/outreach.js";

const schema = {
  ...tenants,
  ...users,
  ...rbac,
  ...approval,
  ...audit,
  ...consent,
  ...inviteCodesSchema,
  ...bronze,
  ...silver,
  ...gold,
  ...outreachEnums,
  ...outreach,
};

const poolSize =
  typeof process.env.DB_POOL_SIZE === "string"
    ? Math.max(1, Math.min(100, Number.parseInt(process.env.DB_POOL_SIZE, 10) || 10))
    : 10;

// Non-secret safety sentinel used to keep RLS fail-closed when tenant is absent.
const SENTINEL_TENANT_ID = "00000000-0000-0000-0000-000000000000";
const SENTINEL_USER_ID = "00000000-0000-0000-0000-000000000000";

const postgresOptions = {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
};

/**
 * Do NOT pass custom PostgreSQL startup parameters (e.g. app.tenant_id) via postgres.js
 * `connection: { ... }`: PgBouncer rejects unknown keys with
 * "unsupported startup parameter" (see ignore_startup_parameters in pgbouncer.ini).
 * With pool_mode=transaction, session GUCs belong in set_config at the start of each
 * request/transaction (see API tenant-context plugin and resetSessionContext for workers).
 */
export function createDbClient(connectionString: string) {
  const sql = postgres(connectionString, {
    ...postgresOptions,
  });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    throw new Error("DATABASE_URL is required for @cerniq/db");
  }
  return url.trim();
}

const connectionString = requireDatabaseUrl();

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
  const url = requireDatabaseUrl();
  connection = createDbClient(url);
}

/** Close the DB connection (e.g. on graceful shutdown). Call once before process exit. */
export async function closeDbConnection(): Promise<void> {
  await connection.sql.end();
}

/**
 * Set session variable app.tenant_id for RLS policies.
 * Call at the start of each request (e.g. from tenant-context onRequest).
 * Use SENTINEL when tenantId is null so current_setting('app.tenant_id') does not throw and RLS filters all rows.
 */
export async function setSessionTenantId(tenantId: string | null): Promise<void> {
  const value = tenantId ?? SENTINEL_TENANT_ID;
  // Session-level scope is required because request queries are not wrapped in a single DB transaction.
  await connection.sql`SELECT set_config('app.tenant_id', ${value}, false)`;
}

/**
 * Set request/session context for both tenant and actor.
 * Uses sentinels when values are absent so SQL consumers can fail closed.
 */
export async function setSessionRequestContext(args: {
  tenantId: string | null;
  userId: string | null;
}): Promise<void> {
  const tenantValue = args.tenantId ?? SENTINEL_TENANT_ID;
  const userValue = args.userId ?? SENTINEL_USER_ID;
  await connection.sql`
    SELECT
      set_config('app.tenant_id', ${tenantValue}, false),
      set_config('app.current_user_id', ${userValue}, false)
  `;
}

/**
 * Reset session variables to sentinel values (fail-closed for RLS).
 * Call after completing a unit of work (e.g. at the end of a worker job)
 * to prevent tenant context from leaking to the next connection consumer.
 */
export async function resetSessionContext(): Promise<void> {
  await connection.sql`
    SELECT
      set_config('app.tenant_id', ${SENTINEL_TENANT_ID}, false),
      set_config('app.current_user_id', ${SENTINEL_USER_ID}, false)
  `;
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
  const rows = await connection.sql<[RawRow]>`SELECT * FROM get_user_by_email(${email}::text)`;
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

export type InsertTenantResult = { id: string; name: string; slug: string; status: string };

/** Insert tenant (raw SQL, bypasses RLS). Use for register only. */
export async function insert_tenant(name: string, slug: string): Promise<InsertTenantResult> {
  const rows = await connection.sql<[InsertTenantResult]>`
    INSERT INTO tenants (name, slug, status)
    VALUES (${name}, ${slug}, 'trial')
    RETURNING id::text, name, slug, status
  `;
  const row = rows[0];
  if (!row) throw new Error("insert_tenant failed");
  return { id: row.id, name: row.name, slug: row.slug, status: row.status };
}

export type InsertUserResult = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  status: string;
};

/** Insert user (raw SQL, bypasses RLS). Use for register only. */
export async function insert_user(
  tenantId: string,
  email: string,
  passwordHash: string,
  name: string,
  role: string,
  status: string,
): Promise<InsertUserResult> {
  const rows = await connection.sql<[InsertUserResult]>`
    INSERT INTO users (tenant_id, email, password_hash, name, role, status)
    VALUES (${tenantId}::uuid, ${email}, ${passwordHash}, ${name}, ${role}::user_role, ${status}::user_status)
    RETURNING id::text, tenant_id::text AS "tenantId", email, name, role, status
  `;
  const row = rows[0];
  if (!row) throw new Error("insert_user failed");
  return row;
}

export type InviteCodeRow = {
  id: string;
  tenant_id: string;
  code: string;
  max_uses: number | null;
  used_count: number;
  expires_at: Date | null;
};

/** Get invite code by code string if valid (not expired, under max uses). Returns null if not found or invalid. */
export async function get_invite_code(code: string): Promise<InviteCodeRow | null> {
  const rows = await connection.sql<[InviteCodeRow]>`
    SELECT id::text, tenant_id::text, code, max_uses, used_count, expires_at
    FROM invite_codes
    WHERE code = ${code}
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR used_count < max_uses)
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    tenant_id: row.tenant_id,
    used_count: Number(row.used_count),
  };
}

/** Increment used_count for an invite code. */
export async function increment_invite_code_usage(codeId: string): Promise<void> {
  await connection.sql`
    UPDATE invite_codes
    SET used_count = used_count + 1
    WHERE id = ${codeId}::uuid
  `;
}

export type GenerateInviteCodeResult = { id: string; code: string };

/** Generate a new invite code for a tenant. Code is 8-char alphanumeric. */
export async function generate_invite_code(
  tenantId: string,
  createdBy: string | null,
): Promise<GenerateInviteCodeResult> {
  const { randomBytes } = await import("node:crypto");
  const code = randomBytes(4).toString("hex");
  const rows = await connection.sql<[{ id: string; code: string }]>`
    INSERT INTO invite_codes (tenant_id, code, max_uses, used_count, created_by)
    VALUES (${tenantId}::uuid, ${code}, 10, 0, ${createdBy ?? null}::uuid)
    RETURNING id::text, code
  `;
  const row = rows[0];
  if (!row) throw new Error("generate_invite_code failed");
  return { id: row.id, code: row.code };
}

/** Register new company + owner user + default invite code in a single transaction. */
export async function register_new_company(
  companyName: string,
  slug: string,
  email: string,
  passwordHash: string,
  name: string,
): Promise<InsertUserResult> {
  const { randomBytes } = await import("node:crypto");
  const inviteCode = randomBytes(4).toString("hex");
  return connection.sql.begin(async (sql: unknown) => {
    const tx = sql as typeof connection.sql;
    const [tenantRow] = await tx<[{ id: string }]>`
      INSERT INTO tenants (name, slug, status)
      VALUES (${companyName}, ${slug}, 'trial')
      RETURNING id::text
    `;
    if (!tenantRow) throw new Error("insert_tenant failed");
    const tenantId = tenantRow.id;
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    const [userRow] = await tx<[InsertUserResult]>`
      INSERT INTO users (tenant_id, email, password_hash, name, role, status)
      VALUES (${tenantId}::uuid, ${email}, ${passwordHash}, ${name}, 'owner'::user_role, 'active'::user_status)
      RETURNING id::text, tenant_id::text AS "tenantId", email, name, role, status
    `;
    if (!userRow) throw new Error("insert_user failed");
    await tx`
      INSERT INTO invite_codes (tenant_id, code, max_uses, used_count, created_by)
      VALUES (${tenantId}::uuid, ${inviteCode}, 10, 0, ${userRow.id}::uuid)
    `;
    return userRow;
  });
}

/** Register user with invite code in a single transaction (increment usage + insert user). */
export async function register_with_invite_code(
  inviteCodeRow: InviteCodeRow,
  email: string,
  passwordHash: string,
  name: string,
): Promise<InsertUserResult> {
  return connection.sql.begin(async (sql: unknown) => {
    const tx = sql as typeof connection.sql;
    await tx`SELECT set_config('app.tenant_id', ${inviteCodeRow.tenant_id}, true)`;
    const [userRow] = await tx<[InsertUserResult]>`
      INSERT INTO users (tenant_id, email, password_hash, name, role, status)
      VALUES (${inviteCodeRow.tenant_id}::uuid, ${email}, ${passwordHash}, ${name}, 'viewer'::user_role, 'active'::user_status)
      RETURNING id::text, tenant_id::text AS "tenantId", email, name, role, status
    `;
    if (!userRow) throw new Error("insert_user failed");
    await tx`
      UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ${inviteCodeRow.id}::uuid
    `;
    return userRow;
  });
}
