import { describe, it, expect, expectTypeOf } from "vitest";
import type { AuditLogInsertRow } from "../src/schemas/audit.js";
import type { JobLogInsertRow } from "../src/schemas/observability.js";
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

describe("Tipuri insert exportate (paritate @cerniq/observability)", () => {
  it("AuditLogInsertRow și JobLogInsertRow sunt definite lângă tabele", () => {
    expectTypeOf<AuditLogInsertRow>().toMatchTypeOf<Record<string, unknown>>();
    expectTypeOf<JobLogInsertRow>().toMatchTypeOf<Record<string, unknown>>();
    const sampleAudit: AuditLogInsertRow = {
      method: "GET",
      routePattern: "/x",
      statusCode: 200,
      eventHash: "a".repeat(64),
    };
    expect(sampleAudit.method).toBe("GET");
    const sampleJob: JobLogInsertRow = {
      tenantId: "00000000-0000-0000-0000-000000000001",
      etapa: "e1",
      workerName: "w",
      message: "m",
    };
    expect(sampleJob.etapa).toBe("e1");
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
