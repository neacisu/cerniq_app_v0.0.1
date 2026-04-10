import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { insertAuditLogRowsMock } = vi.hoisted(() => ({
  insertAuditLogRowsMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@cerniq/db", () => ({
  insertAuditLogRows: insertAuditLogRowsMock,
}));

describe("audit-writer", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    insertAuditLogRowsMock.mockResolvedValue(undefined);
    const { resetAuditWriterTestState } = await import("./audit-writer.js");
    resetAuditWriterTestState();
  });

  afterEach(async () => {
    const { resetAuditWriterTestState } = await import("./audit-writer.js");
    resetAuditWriterTestState();
  });

  it("enqueue + flushAuditBuffer inserează în audit_log", async () => {
    const { recordAuditEvent, flushAuditBuffer } = await import("./audit-writer.js");
    recordAuditEvent({
      tenantId: "00000000-0000-0000-0000-000000000099",
      method: "POST",
      routePattern: "/api/v1/x",
      statusCode: 201,
      correlationId: "00000000-0000-4000-8000-0000000000aa",
    });
    await flushAuditBuffer();
    expect(insertAuditLogRowsMock).toHaveBeenCalledTimes(1);
    expect(insertAuditLogRowsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        method: "POST",
        routePattern: "/api/v1/x",
        statusCode: 201,
      }),
    ]);
  });

  it("writeAuditEvent / auditWriter.write mapează action, resource, resourceId în metadata", async () => {
    const { auditWriter, flushAuditBuffer } = await import("./audit-writer.js");
    auditWriter.write({
      tenantId: "00000000-0000-0000-0000-000000000099",
      method: "PUT",
      routePattern: "/api/v1/r",
      statusCode: 200,
      action: "update",
      resource: "contacts",
      resourceId: "00000000-0000-0000-0000-000000000001",
      metadata: { path: "/x" },
    });
    await flushAuditBuffer();
    expect(insertAuditLogRowsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        metadata: expect.objectContaining({
          action: "update",
          resource: "contacts",
          resourceId: "00000000-0000-0000-0000-000000000001",
          path: "/x",
        }),
      }),
    ]);
  });
});
