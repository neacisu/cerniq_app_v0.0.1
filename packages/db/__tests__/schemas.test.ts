import { describe, it, expect } from "vitest";
import { tenants } from "../src/schemas/tenants.js";
import { users } from "../src/schemas/users.js";
import { roles, permissions, rolePermissions, userRoles } from "../src/schemas/rbac.js";
import { approvalTasks, approvalTypeConfigs } from "../src/schemas/approval.js";
import { approvalAuditLog } from "../src/schemas/audit.js";
import {
  importRuntimeJobs,
  importRuntimeSessions,
  importRuntimeWorkerCounters,
} from "../src/schemas/bronze.js";

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

describe("Import runtime tables (bronze schema)", () => {
  it("importRuntimeJobs has required columns", () => {
    expect(importRuntimeJobs.id).toBeDefined();
    expect(importRuntimeJobs.tenantId).toBeDefined();
    expect(importRuntimeJobs.batchId).toBeDefined();
    expect(importRuntimeJobs.sessionId).toBeDefined();
    expect(importRuntimeJobs.runtimeJobKey).toBeDefined();
    expect(importRuntimeJobs.workerName).toBeDefined();
    expect(importRuntimeJobs.state).toBeDefined();
  });

  it("importRuntimeSessions has required columns", () => {
    expect(importRuntimeSessions.id).toBeDefined();
    expect(importRuntimeSessions.tenantId).toBeDefined();
    expect(importRuntimeSessions.batchId).toBeDefined();
    expect(importRuntimeSessions.kind).toBeDefined();
    expect(importRuntimeSessions.status).toBeDefined();
  });

  it("importRuntimeWorkerCounters has required columns", () => {
    expect(importRuntimeWorkerCounters.id).toBeDefined();
    expect(importRuntimeWorkerCounters.tenantId).toBeDefined();
    expect(importRuntimeWorkerCounters.sessionId).toBeDefined();
    expect(importRuntimeWorkerCounters.workerName).toBeDefined();
  });
});
