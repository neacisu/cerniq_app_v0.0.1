import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as tenants from "./schemas/tenants.js";
import * as users from "./schemas/users.js";
import * as rbac from "./schemas/rbac.js";
import * as approval from "./schemas/approval.js";
import * as audit from "./schemas/audit.js";

const schema = { ...tenants, ...users, ...rbac, ...approval, ...audit };

export function createDbClient(connectionString: string) {
  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return drizzle(sql, { schema });
}

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://localhost:6432/cerniq";

export const db = createDbClient(connectionString);
