import { describe, it, expect } from "vitest";
import { tenants } from "../src/schemas/tenants.js";
import { users } from "../src/schemas/users.js";
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from "../src/schemas/rbac.js";
import { approvalTasks, approvalTypeConfigs } from "../src/schemas/approval.js";
import { approvalAuditLog } from "../src/schemas/audit.js";

describe("Database Schemas", () => {
  it("tenants table has required columns", () => {
    expect(tenants.id).toBeDefined();
    expect(tenants.name).toBeDefined();
    expect(tenants.slug).toBeDefined();
    expect(tenants.status).toBeDefined();
    expect(tenants.createdAt).toBeDefined();
  });

  it("users table has tenant_id FK", () => {
    expect(users.tenantId).toBeDefined();
    expect(users.email).toBeDefined();
  });

  it("RBAC tables exist", () => {
    expect(roles).toBeDefined();
    expect(permissions).toBeDefined();
    expect(rolePermissions).toBeDefined();
    expect(userRoles).toBeDefined();
  });

  it("approval tables exist in approval schema", () => {
    expect(approvalTasks).toBeDefined();
    expect(approvalTypeConfigs).toBeDefined();
  });

  it("audit log table exists", () => {
    expect(approvalAuditLog).toBeDefined();
  });
});
