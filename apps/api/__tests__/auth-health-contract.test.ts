import { describe, it, expect, beforeAll, afterAll } from "vitest";

/** Rutele auth împart rate-limit Redis per IP+scope; suite-urile paralele pot depăși pragul. */
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

/** Aliniat la `issueAuthTokens` din `auth.ts` + verificare `@fastify/jwt` (iss/aud). */
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

function parseSetCookieNames(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const lines = Array.isArray(raw) ? raw : [raw];
  return lines.map((line) => line.split(";")[0]?.split("=")[0]?.trim() ?? "").filter(Boolean);
}

function setCookieHeaderLines(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  if (Array.isArray(raw)) return raw;
  return [raw];
}

describeSequential("Contract API: /api/v1/auth (integrare DB/Redis)", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let userEmail: string;
  /** IP sintetic unic per rulare — rate-limit login/register e per `request.ip`+scope; Redis partajat între suite face pragul 10 ușor atins. */
  let suiteForwardedFor: string;

  beforeAll(async () => {
    suiteForwardedFor = `10.27.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    app = await buildApp();
    await app.ready();

    const tenant = await insert_tenant(
      `auth-contract-${Date.now()}`,
      `auth-contract-${Date.now()}`,
    );
    tenantId = tenant.id;
    await setSessionTenantId(tenantId);
    userEmail = `auth-contract-${Date.now()}@example.com`;
    const user = await insert_user(
      tenantId,
      userEmail,
      TEST_PASSWORD_HASH,
      "Auth Contract User",
      "admin",
      "active",
    );
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
    if (tenantId) {
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }
    await app.close();
  });

  function authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-forwarded-for": suiteForwardedFor,
      ...extra,
    };
  }

  describe("POST /api/v1/auth/login", () => {
    it("400 — email invalid (Zod)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/login`,
        headers: authHeaders(),
        payload: { email: "not-an-email", password: "x" },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload) as {
        success?: boolean;
        error?: string;
        details?: unknown;
      };
      expect(body.success).toBe(false);
      expect(body.error).toBe("Invalid email or password");
      expect(body.details).toBeDefined();
    });

    it("401 — parolă greșită", async () => {
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/login`,
        headers: authHeaders(),
        payload: { email: userEmail, password: "WrongPass1!" },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload) as { success?: boolean; error?: string };
      expect(body.success).toBe(false);
      expect(body.error).toBe("Invalid email or password");
    });

    it("401 — cont inactive", async () => {
      const t = await insert_tenant(`auth-inactive-${Date.now()}`, `auth-inactive-${Date.now()}`);
      await setSessionTenantId(t.id);
      const email = `inactive-${Date.now()}@example.com`;
      const u = await insert_user(
        t.id,
        email,
        TEST_PASSWORD_HASH,
        "Inactive",
        "viewer",
        "inactive",
      );
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/login`,
        headers: authHeaders(),
        payload: { email, password: TEST_PASSWORD_CONSTANT },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload) as { success?: boolean; error?: string };
      expect(body.success).toBe(false);
      expect(body.error).toBe("Account is not active");
      await db.delete(users).where(eq(users.id, u.id));
      await db.delete(tenants).where(eq(tenants.id, t.id));
    });

    it("200 — login reușit: shape data + Set-Cookie refresh + csrf", async () => {
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/login`,
        headers: authHeaders(),
        payload: { email: userEmail, password: TEST_PASSWORD_CONSTANT },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload) as {
        success?: boolean;
        data?: {
          token: string;
          refreshToken: string;
          csrfToken: string;
          user: { id: string; email: string; name: string; tenantId: string; role: string };
          expiresIn: string;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data?.token?.length).toBeGreaterThan(20);
      expect(body.data?.refreshToken?.length).toBeGreaterThan(20);
      expect(body.data?.csrfToken?.length).toBe(64);
      expect(body.data?.user?.id).toBe(userId);
      expect(body.data?.user?.email).toBe(userEmail);
      expect(body.data?.user?.tenantId).toBe(tenantId);
      expect(body.data?.expiresIn).toBe(envConfig.JWT_EXPIRES_IN);

      const cookieHeader = res.headers["set-cookie"];
      const names = parseSetCookieNames(cookieHeader);
      expect(names).toContain("refreshToken");
      expect(names).toContain("cerniq_csrf");
    });
  });

  describe("POST /api/v1/auth/register", () => {
    it("400 — parolă slabă (Zod)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/register`,
        headers: authHeaders(),
        payload: {
          name: "Test User",
          email: `weak-${Date.now()}@example.com`,
          password: "short",
          mode: "new_company",
          companyName: "Co Test SRL",
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload) as {
        success?: boolean;
        error?: string;
        details?: unknown;
      };
      expect(body.success).toBe(false);
      expect(body.error).toBe("Date invalide");
      expect(body.details).toBeDefined();
    });

    it("409 — email deja înregistrat", async () => {
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/register`,
        headers: authHeaders(),
        payload: {
          name: "Dup",
          email: userEmail,
          password: "SecurePass1!",
          mode: "new_company",
          companyName: "Duplicate Co SRL",
        },
      });
      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload) as { success?: boolean; error?: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain("înregistrat");
    });

    it("200 — register new_company: success + cleanup tenant", async () => {
      const stamp = Date.now();
      const email = `newco-${stamp}@example.com`;
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/register`,
        headers: authHeaders(),
        payload: {
          name: "Owner New",
          email,
          password: "SecurePass1!",
          mode: "new_company",
          companyName: `Company Reg ${stamp}`,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload) as {
        success?: boolean;
        data?: {
          user?: { tenantId: string };
          token?: string;
          refreshToken?: string;
          csrfToken?: string;
        };
      };
      expect(body.success).toBe(true);
      const regTenantId = body.data?.user?.tenantId;
      expect(regTenantId).toBeDefined();
      expect(body.data?.token?.length).toBeGreaterThan(20);
      if (!regTenantId) {
        throw new Error("register contract: lipsă tenantId în răspuns");
      }
      await db.delete(tenants).where(eq(tenants.id, regTenantId));
    });
  });

  describe("POST /api/v1/auth/refresh + CSRF", () => {
    it("401 — fără refresh token", async () => {
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/refresh`,
        headers: authHeaders(),
        payload: {},
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload) as { success?: boolean; error?: string };
      expect(body.success).toBe(false);
      expect(body.error).toBe("Refresh token lipsa");
    });

    it("401 — refresh token invalid", async () => {
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/refresh`,
        headers: authHeaders(),
        payload: { refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("403 — CSRF: cookie refreshToken dar header lipsă / nepotrivit", async () => {
      const loginRes = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/login`,
        headers: authHeaders(),
        payload: { email: userEmail, password: TEST_PASSWORD_CONSTANT },
      });
      expect(loginRes.statusCode).toBe(200);
      const setCookie = loginRes.headers["set-cookie"];
      const cookieLines = setCookieHeaderLines(setCookie);
      const cookiePairs = cookieLines.map((c) => c.split(";")[0]).filter(Boolean);
      const cookieHeader = cookiePairs.join("; ");

      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/refresh`,
        headers: {
          ...authHeaders(),
          cookie: cookieHeader,
          "x-csrf-token": "wrong-token-not-matching-cookie",
        },
        payload: {},
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload) as { success?: boolean; error?: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain("CSRF");
    });

    it("200 — refresh cu body.refreshToken (fără cookie → fără CSRF obligatoriu)", async () => {
      const loginRes = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/login`,
        headers: authHeaders(),
        payload: { email: userEmail, password: TEST_PASSWORD_CONSTANT },
      });
      const loginBody = JSON.parse(loginRes.payload) as { data?: { refreshToken?: string } };
      const rt = loginBody.data?.refreshToken;
      expect(rt).toBeDefined();

      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/refresh`,
        headers: authHeaders(),
        payload: { refreshToken: rt },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload) as {
        success?: boolean;
        data?: { token: string; refreshToken: string; csrfToken: string; expiresIn: string };
      };
      expect(body.success).toBe(true);
      expect(body.data?.token?.length).toBeGreaterThan(20);
      expect(body.data?.refreshToken?.length).toBeGreaterThan(20);
      expect(body.data?.expiresIn).toBe(envConfig.JWT_EXPIRES_IN);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("200 — logout fără token (idempotent)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `${AUTH_BASE}/logout`,
        headers: authHeaders(),
        payload: {},
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload) as { success?: boolean; data?: { loggedOut?: boolean } };
      expect(body.success).toBe(true);
      expect(body.data?.loggedOut).toBe(true);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("401 — fără Authorization", async () => {
      const res = await app.inject({ method: "GET", url: `${AUTH_BASE}/me` });
      expect([400, 401]).toContain(res.statusCode);
    });

    it("200 — Bearer access token (payload aliniat producției)", async () => {
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
      const body = JSON.parse(res.payload) as {
        success?: boolean;
        data?: { user?: Record<string, unknown> };
      };
      expect(body.success).toBe(true);
      expect(body.data?.user).toBeDefined();
    });
  });

  describe("Rate limit login (max 10 / 15m per IP+scope)", () => {
    it("al 11-lea POST /login de pe același IP primește 429", async () => {
      const isolatedIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
      let lastStatus = 0;
      for (let i = 0; i < 11; i++) {
        const res = await app.inject({
          method: "POST",
          url: `${AUTH_BASE}/login`,
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": isolatedIp,
          },
          payload: { email: `rate-${isolatedIp}-${i}@example.com`, password: "whatever1A!" },
        });
        lastStatus = res.statusCode;
        if (i < 10) {
          expect([400, 401]).toContain(res.statusCode);
        }
      }
      expect(lastStatus).toBe(429);
    });
  });
});
