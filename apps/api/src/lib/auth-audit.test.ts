import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  writeAuthAuditEvent,
  writeAuthCsrfDeniedAudit,
  writeRbacDeniedAudit,
  logAndAuditLoginFailure,
  logAndAuditRefreshFailure,
  logAndAuditRegisterFailure,
  logAndAuditLogoutValidationFailure,
  hashEmailForAuthLog,
} from "./auth-audit.js";

const writeMock = vi.fn();

vi.mock("@cerniq/observability", () => ({
  auditWriter: { write: (...args: unknown[]) => writeMock(...args) },
}));

function mockRouteOptions(url: string): FastifyRequest["routeOptions"] {
  return { url } as FastifyRequest["routeOptions"];
}

function req(partial: Record<string, unknown>): FastifyRequest {
  return partial as unknown as FastifyRequest;
}

function mockRequestLog(warn: ReturnType<typeof vi.fn>): FastifyRequest["log"] {
  return { warn } as unknown as FastifyRequest["log"];
}

describe("auth-audit", () => {
  beforeEach(() => {
    writeMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hashEmailForAuthLog este determinist", () => {
    expect(hashEmailForAuthLog("Test@Example.com")).toBe(hashEmailForAuthLog("test@example.com"));
    expect(hashEmailForAuthLog("a@b.co").length).toBe(16);
  });

  it("writeAuthAuditEvent pentru register și refresh (același contract ca login)", () => {
    writeAuthAuditEvent(
      req({
        method: "POST",
        routeOptions: mockRouteOptions("/api/v1/auth/register"),
        url: "/api/v1/auth/register",
        ip: "10.0.0.1",
        headers: {},
      }),
      { action: "register", statusCode: 200, tenantId: "t1", userId: "u1" },
    );
    writeAuthAuditEvent(
      req({
        method: "POST",
        routeOptions: mockRouteOptions("/api/v1/auth/refresh"),
        url: "/api/v1/auth/refresh",
        ip: "10.0.0.1",
        headers: {},
      }),
      { action: "refresh", statusCode: 200, tenantId: "t1", userId: "u1" },
    );
    writeAuthAuditEvent(
      req({
        method: "POST",
        routeOptions: mockRouteOptions("/api/v1/auth/logout"),
        url: "/api/v1/auth/logout",
        ip: "10.0.0.1",
        headers: {},
      }),
      { action: "logout", statusCode: 200, tenantId: null, userId: null },
    );
    expect(writeMock).toHaveBeenCalledTimes(3);
    expect(writeMock.mock.calls.map((c) => (c[0] as { action: string }).action)).toEqual([
      "register",
      "refresh",
      "logout",
    ]);
  });

  it("writeAuthAuditEvent trimite câmpuri așteptate", () => {
    writeAuthAuditEvent(
      req({
        method: "POST",
        routeOptions: mockRouteOptions("/api/v1/auth/login"),
        url: "/api/v1/auth/login",
        ip: "10.0.0.1",
        headers: { "x-correlation-id": "550e8400-e29b-41d4-a716-446655440000" },
        user: { id: "u1" },
      }),
      { action: "login", statusCode: 200, tenantId: "t1", userId: "u1" },
    );
    expect(writeMock).toHaveBeenCalledTimes(1);
    const arg = writeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.action).toBe("login");
    expect(arg.resource).toBe("user");
    expect(arg.statusCode).toBe(200);
    expect(arg.tenantId).toBe("t1");
    expect(arg.userId).toBe("u1");
    expect(arg.correlationId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("correlationId UUID din al doilea element header (primul gol)", () => {
    writeAuthAuditEvent(
      req({
        method: "POST",
        routeOptions: mockRouteOptions("/api/v1/auth/login"),
        url: "/api/v1/auth/login",
        ip: "10.0.0.1",
        headers: {
          "x-correlation-id": ["", "550e8400-e29b-41d4-a716-446655440001"],
        },
      }),
      { action: "login", statusCode: 200, tenantId: "t1", userId: "u1" },
    );
    const arg = writeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.correlationId).toBe("550e8400-e29b-41d4-a716-446655440001");
    expect(arg.metadata).toEqual(
      expect.objectContaining({
        httpCorrelationIdRaw: "550e8400-e29b-41d4-a716-446655440001",
      }),
    );
  });

  it("header non-UUID: correlationId null, păstrează raw trunchiat în metadata", () => {
    writeAuthAuditEvent(
      req({
        method: "POST",
        routeOptions: mockRouteOptions("/api/v1/auth/login"),
        url: "/api/v1/auth/login",
        ip: "10.0.0.1",
        headers: { "x-correlation-id": "acme-trace-opaque-xyz" },
      }),
      { action: "login", statusCode: 200, tenantId: "t1", userId: "u1" },
    );
    const arg = writeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.correlationId).toBeNull();
    expect(arg.metadata).toEqual(
      expect.objectContaining({ httpCorrelationIdRaw: "acme-trace-opaque-xyz" }),
    );
  });

  it("logAndAuditRefreshFailure și register/logout eșecuri structurate", () => {
    const warn = vi.fn();
    const base = {
      method: "POST" as const,
      routeOptions: mockRouteOptions("/api/v1/auth/refresh"),
      url: "/api/v1/auth/refresh",
      log: mockRequestLog(warn),
      ip: "10.0.0.9",
      headers: {},
    };
    logAndAuditRefreshFailure(req({ ...base }), {
      reason: "invalid_jwt",
      statusCode: 401,
    });
    logAndAuditRegisterFailure(
      req({
        ...base,
        routeOptions: mockRouteOptions("/api/v1/auth/register"),
        url: "/api/v1/auth/register",
      }),
      {
        reason: "email_already_registered",
        statusCode: 409,
        email: "x@y.com",
      },
    );
    logAndAuditLogoutValidationFailure(
      req({
        ...base,
        routeOptions: mockRouteOptions("/api/v1/auth/logout"),
        url: "/api/v1/auth/logout",
      }),
    );
    expect(warn).toHaveBeenCalledTimes(3);
    expect(writeMock.mock.calls.map((c) => (c[0] as { action: string }).action)).toEqual([
      "refresh_failed",
      "register_failed",
      "logout_failed",
    ]);
  });

  it("writeAuthCsrfDeniedAudit folosește action csrf_validation_failed", () => {
    writeAuthCsrfDeniedAudit(
      req({
        method: "POST",
        routeOptions: mockRouteOptions("/api/v1/auth/logout"),
        ip: "10.0.0.2",
        headers: {},
      }),
    );
    expect(writeMock.mock.calls[0][0]).toMatchObject({
      statusCode: 403,
      action: "csrf_validation_failed",
      resource: "auth",
    });
  });

  it("logAndAuditLoginFailure apelează auditWriter cu reason", () => {
    const warn = vi.fn();
    logAndAuditLoginFailure(
      req({
        method: "POST",
        routeOptions: mockRouteOptions("/api/v1/auth/login"),
        log: mockRequestLog(warn),
        ip: "10.0.0.3",
        headers: {},
      }),
      { email: "x@y.com", reason: "invalid_credentials", statusCode: 401 },
    );
    expect(warn).toHaveBeenCalled();
    expect(writeMock.mock.calls[0][0]).toMatchObject({
      action: "login_failed",
      statusCode: 401,
      metadata: expect.objectContaining({ reason: "invalid_credentials" }),
    });
  });

  it("writeRbacDeniedAudit scrie authz_forbidden cu roluri", () => {
    const warn = vi.fn();
    writeRbacDeniedAudit(
      req({
        method: "PATCH",
        routeOptions: mockRouteOptions("/api/v1/x"),
        log: mockRequestLog(warn),
        ip: "10.0.0.4",
        headers: {},
      }),
      {
        statusCode: 403,
        reason: "insufficient_rank",
        currentRole: "viewer",
        requiredRoles: ["admin", "owner"],
      },
    );
    expect(warn).toHaveBeenCalled();
    expect(writeMock.mock.calls[0][0]).toMatchObject({
      action: "authz_forbidden",
      statusCode: 403,
      resource: "rbac",
      metadata: expect.objectContaining({
        reason: "insufficient_rank",
        currentRole: "viewer",
      }),
    });
  });
});
