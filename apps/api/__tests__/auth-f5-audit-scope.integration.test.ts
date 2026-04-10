/**
 * F5.1 decizie scope (anti-dublare cu audit-trail generic):
 * - Plugin `audit-trail`: `recordAuditEvent` pentru POST mutating, DAR `SKIP_PREFIXES` include
 *   `/api/v1/auth/login|register|refresh|logout` → acolo nu se scrie audit generic.
 * - Rutele auth folosesc explicit `auditWriter` via `auth-audit.ts` (succes + eșecuri login/register/refresh/logout + CSRF).
 * - GET `/me`: fără `auditWriter` dedicat (citire; plugin nu auditează GET).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

const auditWriteMock = vi.hoisted(() => vi.fn());

vi.mock("@cerniq/observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cerniq/observability")>();
  return {
    ...actual,
    auditWriter: { ...actual.auditWriter, write: auditWriteMock },
  };
});

const describeSequential = describe.sequential;

import { buildApp } from "../src/app.js";
import { envConfig } from "../src/config.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  eq,
  insert_tenant,
  insert_user,
  setSessionTenantId,
  tenants,
  users,
  TEST_PASSWORD_HASH,
} from "@cerniq/db";
import { TEST_PASSWORD_CONSTANT } from "@cerniq/db/test-utils";

const AUTH_BASE = "/api/v1/auth";

function signProductionAccessToken(
  app: FastifyInstance,
  user: { id: string; email: string; tenantId: string; role: string },
): string {
  return app.jwt.sign(
    {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      sub: user.id,
      iss: "cerniq.app",
      aud: "cerniq-api",
      tokenType: "access",
    },
    { expiresIn: envConfig.JWT_EXPIRES_IN },
  );
}

describeSequential("F5.1 auth: număr apeluri auditWriter (scope)", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let userEmail: string;
  let suiteForwardedFor: string;

  beforeAll(async () => {
    suiteForwardedFor = `10.31.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    app = await buildApp();
    await app.ready();

    const tenant = await insert_tenant(
      `auth-f5-scope-${Date.now()}`,
      `auth-f5-scope-${Date.now()}`,
    );
    tenantId = tenant.id;
    await setSessionTenantId(tenantId);
    userEmail = `auth-f5-scope-${Date.now()}@example.com`;
    const user = await insert_user(
      tenantId,
      userEmail,
      TEST_PASSWORD_HASH,
      "F5 Scope User",
      "admin",
      "active",
    );
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await db.delete(users).where(eq(users.id, userId));
    if (tenantId) await db.delete(tenants).where(eq(tenants.id, tenantId));
    await app.close();
  });

  beforeEach(() => {
    auditWriteMock.mockClear();
  });

  function headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-forwarded-for": suiteForwardedFor,
    };
  }

  it("GET /me 200 — zero apeluri auditWriter din handler auth", async () => {
    const token = signProductionAccessToken(app, {
      id: userId,
      email: userEmail,
      tenantId,
      role: "admin",
    });
    const res = await app.inject({
      method: "GET",
      url: `${AUTH_BASE}/me`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(auditWriteMock).not.toHaveBeenCalled();
  });

  it("POST /login 200 — exact un write cu action login", async () => {
    const res = await app.inject({
      method: "POST",
      url: `${AUTH_BASE}/login`,
      headers: headers(),
      payload: { email: userEmail, password: TEST_PASSWORD_CONSTANT },
    });
    expect(res.statusCode).toBe(200);
    expect(auditWriteMock).toHaveBeenCalledTimes(1);
    expect(auditWriteMock.mock.calls[0][0]).toMatchObject({ action: "login", statusCode: 200 });
  });

  it("POST /login 401 — exact un write login_failed", async () => {
    const res = await app.inject({
      method: "POST",
      url: `${AUTH_BASE}/login`,
      headers: headers(),
      payload: { email: userEmail, password: "WrongPass1!" },
    });
    expect(res.statusCode).toBe(401);
    expect(auditWriteMock).toHaveBeenCalledTimes(1);
    expect(auditWriteMock.mock.calls[0][0]).toMatchObject({ action: "login_failed" });
  });

  it("POST /register 409 — un write register_failed (email deja înregistrat)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `${AUTH_BASE}/register`,
      headers: headers(),
      payload: {
        name: "Dup",
        email: userEmail,
        password: "SecurePass1!",
        mode: "new_company",
        companyName: "Dup Co SRL",
      },
    });
    expect(res.statusCode).toBe(409);
    expect(auditWriteMock).toHaveBeenCalledTimes(1);
    expect(auditWriteMock.mock.calls[0][0]).toMatchObject({
      action: "register_failed",
      statusCode: 409,
      metadata: expect.objectContaining({ reason: "email_already_registered" }),
    });
  });

  it("POST /refresh 401 — fără token: refresh_failed", async () => {
    const res = await app.inject({
      method: "POST",
      url: `${AUTH_BASE}/refresh`,
      headers: headers(),
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    expect(auditWriteMock).toHaveBeenCalledTimes(1);
    expect(auditWriteMock.mock.calls[0][0]).toMatchObject({
      action: "refresh_failed",
      metadata: expect.objectContaining({ reason: "missing_refresh_token" }),
    });
  });

  it("POST /logout 200 — exact un write logout (idempotent)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `${AUTH_BASE}/logout`,
      headers: headers(),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(auditWriteMock).toHaveBeenCalledTimes(1);
    expect(auditWriteMock.mock.calls[0][0]).toMatchObject({ action: "logout", statusCode: 200 });
  });

  it("POST /refresh 200 — exact un write refresh (body.refreshToken, fără CSRF)", async () => {
    const loginRes = await app.inject({
      method: "POST",
      url: `${AUTH_BASE}/login`,
      headers: headers(),
      payload: { email: userEmail, password: TEST_PASSWORD_CONSTANT },
    });
    expect(loginRes.statusCode).toBe(200);
    auditWriteMock.mockClear();

    const loginBody = JSON.parse(loginRes.payload) as { data?: { refreshToken?: string } };
    const rt = loginBody.data?.refreshToken;
    expect(rt).toBeDefined();

    const res = await app.inject({
      method: "POST",
      url: `${AUTH_BASE}/refresh`,
      headers: headers(),
      payload: { refreshToken: rt },
    });
    expect(res.statusCode).toBe(200);
    expect(auditWriteMock).toHaveBeenCalledTimes(1);
    expect(auditWriteMock.mock.calls[0][0]).toMatchObject({ action: "refresh", statusCode: 200 });
  });
});
