import { describe, it, expect } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  ensureRequestTenantIdFromJwtIfMissing,
  resolveTenantIdFromJwtUser,
} from "../src/routes/utils.js";

function mockRequest(partial: {
  user?: Record<string, unknown>;
  tenantId?: string | null;
  headers?: Record<string, string | string[] | undefined>;
}): FastifyRequest {
  return {
    user: partial.user,
    tenantId: partial.tenantId,
    headers: partial.headers ?? {},
  } as FastifyRequest;
}

describe("resolveTenantIdFromJwtUser", () => {
  it("citește tenantId din payload", () => {
    const req = mockRequest({
      user: { tenantId: "  t1-uuid  ", role: "admin" },
    });
    expect(resolveTenantIdFromJwtUser(req)).toBe("t1-uuid");
  });

  it("acceptă tenant_id (snake_case)", () => {
    const req = mockRequest({
      user: { tenant_id: "t2-uuid", role: "admin" },
    });
    expect(resolveTenantIdFromJwtUser(req)).toBe("t2-uuid");
  });

  it("superadmin + X-Tenant-ID suprascrie", () => {
    const req = mockRequest({
      user: { tenantId: "ignored", role: "superadmin" },
      headers: { "x-tenant-id": "impersonated-tenant" },
    });
    expect(resolveTenantIdFromJwtUser(req)).toBe("impersonated-tenant");
  });

  it("returnează null dacă lipsește tenant în payload", () => {
    const req = mockRequest({ user: { role: "admin" } });
    expect(resolveTenantIdFromJwtUser(req)).toBeNull();
  });
});

describe("ensureRequestTenantIdFromJwtIfMissing", () => {
  it("nu suprascrie tenantId deja setat", () => {
    const req = mockRequest({
      tenantId: "existing",
      user: { tenantId: "from-jwt" },
    });
    ensureRequestTenantIdFromJwtIfMissing(req);
    expect(req.tenantId).toBe("existing");
  });

  it("completează din JWT când lipsește", () => {
    const req = mockRequest({
      tenantId: null,
      user: {
        tenantId: "122a572a-ab53-4436-a49b-2c7e828fb970",
        role: "admin",
      },
    });
    ensureRequestTenantIdFromJwtIfMissing(req);
    expect(req.tenantId).toBe("122a572a-ab53-4436-a49b-2c7e828fb970");
  });
});
