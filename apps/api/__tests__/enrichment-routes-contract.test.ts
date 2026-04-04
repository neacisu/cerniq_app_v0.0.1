import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import { insert_tenant, insert_user, setSessionTenantId, TEST_PASSWORD_HASH } from "@cerniq/db";

describe("Enrichment routes contract", () => {
  let app: FastifyInstance;
  let tenantId: string;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const t = await insert_tenant(`enr-contract-${Date.now()}`, `enr-${Date.now()}`);
    tenantId = t.id;
    await setSessionTenantId(tenantId);

    const admin = await insert_user(
      tenantId,
      `enr-adm-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Enr Admin",
      "admin",
      "active",
    );
    const viewer = await insert_user(
      tenantId,
      `enr-view-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Enr Viewer",
      "viewer",
      "active",
    );

    adminToken = app.jwt.sign({
      id: admin.id,
      userId: admin.id,
      sub: admin.id,
      tenantId,
      role: "admin",
      tokenType: "access",
    });
    viewerToken = app.jwt.sign({
      id: viewer.id,
      userId: viewer.id,
      sub: viewer.id,
      tenantId,
      role: "viewer",
      tokenType: "access",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/enrichment/queues — admin primește listă cu câmpuri BullMQ", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/enrichment/queues",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      const first = body.data[0] as Record<string, unknown>;
      expect(typeof first.name).toBe("string");
      expect(typeof first.waiting).toBe("number");
      expect(typeof first.active).toBe("number");
      expect(typeof first.failed).toBe("number");
      expect(typeof first.completed).toBe("number");
      expect(typeof first.delayed).toBe("number");
      expect(typeof first.paused).toBe("boolean");
    }
  });

  it("GET /api/v1/enrichment/queues — viewer primește 403", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/enrichment/queues",
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("GET /api/v1/enrichment/queues/not-a-real-queue-name-xyz — 400 nume coadă", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/enrichment/queues/not-a-real-queue-name-xyz",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/v1/silver/enrichment-log — 200 cu listă (poate fi goală)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/silver/enrichment-log?limit=5&offset=0",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: unknown[]; meta?: { total: number } };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.meta?.total).toBe("number");
  });
});
