/**
 * Contract securitate: `compliance.ts` (GET decizie AI) + `webhooks.ts` (POST semnătură, JSON invalid).
 * Semnătură validă + provenance job: vezi `webhooks-signature-provenance.test.ts`.
 * Anti-halucinare: citite integral handler-ele; fără presupuneri despre idempotency — documentată ca gap.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  tenants,
  users,
  eq,
  TEST_PASSWORD_HASH,
  insert_tenant,
  insert_user,
  setSessionRequestContext,
  setSessionTenantId,
} from "@cerniq/db";

const NONEXISTENT_COMPANY_UUID = "a1a1a1a1-a1a1-41a1-a1a1-a1a1a1a1a1a1";

describe("Compliance AI — GET /api/v1/ai/decisions/:id/explanation", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const t = await insert_tenant(`cmp-ai-${Date.now()}`, `cmp-${Date.now()}`);
    tenantId = t.id;
    await setSessionTenantId(tenantId);
    const u = await insert_user(
      tenantId,
      `cmp-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Compliance AI Test",
      "admin",
      "active",
    );
    userId = u.id;
    token = app.jwt.sign({
      id: userId,
      userId,
      sub: userId,
      tenantId,
      role: "admin",
      tokenType: "access",
    });
  });

  beforeEach(async () => {
    await setSessionRequestContext({ tenantId, userId });
  });

  afterAll(async () => {
    await setSessionRequestContext({ tenantId, userId });
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await app.close();
  });

  it("GET — 401 fără JWT", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/ai/decisions/${NONEXISTENT_COMPANY_UUID}/explanation`,
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET — 400 id non-UUID", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/ai/decisions/not-a-uuid/explanation",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { success: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toMatch(/INVALID/i);
  });

  it("GET — 404 companie Gold inexistentă în tenant", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/ai/decisions/${NONEXISTENT_COMPANY_UUID}/explanation`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

/**
 * Notă backlog: handler-ele din `webhooks.ts` nu deduplică evenimente (fără idempotency key);
 * fiecare POST cu semnătură validă adaugă un job BullMQ nou.
 */
describe("Webhooks Etapa 2 — POST /api/v1/webhooks/* (body + semnătură)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /timelinesai — corp JSON invalid → 400 (parser buffer)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/timelinesai",
      headers: { "content-type": "application/json" },
      payload: "{not-valid-json",
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /instantly — corp JSON invalid → 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/instantly",
      headers: { "content-type": "application/json" },
      payload: "{bad",
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /resend — corp JSON invalid → 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/resend",
      headers: { "content-type": "application/json" },
      payload: "null null",
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /timelinesai — JSON valid dar fără semnătură validă → 401 sau 503 (secret lipsă)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/timelinesai",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ event: "ping" }),
    });
    expect([401, 503]).toContain(res.statusCode);
  });
});
