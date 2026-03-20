import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  tenants,
  users,
  leadJourney,
  waPhoneNumbers,
  outreachSequences,
  outreachTemplates,
  humanReviewQueue,
  eq,
  TEST_PASSWORD_HASH,
  insert_tenant,
  insert_user,
  setSessionRequestContext,
  setSessionTenantId,
} from "@cerniq/db";

function buildTenantSlug(name: string): string {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

describe("Etapa 2 Outreach API Integration Tests", () => {
  let app: FastifyInstance;
  let testTenantId: string;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const tenantName = `test-outreach-${Date.now()}`;
    const tenant = await insert_tenant(tenantName, buildTenantSlug(tenantName));
    testTenantId = tenant.id;
    await setSessionTenantId(testTenantId);

    const user = await insert_user(
      testTenantId,
      `test-outreach-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Outreach Test User",
      "admin",
      "active",
    );
    testUserId = user.id;
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });

    /** `@fastify/jwt` `sign()` este sincron (returnează `string`); `await` pe non-Promise încalcă S4123. */
    const jwt = app.jwt.sign({
      id: testUserId,
      userId: testUserId,
      sub: testUserId,
      tenantId: testTenantId,
      role: "admin",
      tokenType: "access",
    });
    authToken = jwt;
  });

  beforeEach(async () => {
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
  });

  afterAll(async () => {
    if (!testTenantId || !testUserId) {
      await app.close();
      return;
    }
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
    await db.delete(humanReviewQueue).where(eq(humanReviewQueue.tenantId, testTenantId));
    await db.delete(leadJourney).where(eq(leadJourney.tenantId, testTenantId));
    await db.delete(waPhoneNumbers).where(eq(waPhoneNumbers.tenantId, testTenantId));
    await db.delete(outreachSequences).where(eq(outreachSequences.tenantId, testTenantId));
    await db.delete(outreachTemplates).where(eq(outreachTemplates.tenantId, testTenantId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
    await app.close();
  });

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/dashboard", () => {
    it("returns dashboard overview for authenticated tenant", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/dashboard",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("kpis");
      expect(body.data).toHaveProperty("leadFunnel");
      expect(body.data).toHaveProperty("phones");
    });

    it("rejects unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/dashboard",
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ─── Leads ────────────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/leads", () => {
    it("returns empty list for new tenant", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/leads",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toHaveProperty("total");
    });

    it("filters by state", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/leads?state=COLD",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  // ─── Sequences ────────────────────────────────────────────────────────────────

  describe("POST /api/v1/outreach/sequences", () => {
    it("creates a new sequence with steps", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/outreach/sequences",
        headers: {
          authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        payload: JSON.stringify({
          name: "Test Sequence",
          description: "Integration test sequence",
          primaryChannel: "WHATSAPP",
          stopOnReply: true,
          respectBusinessHours: true,
          steps: [
            { channel: "WHATSAPP", delayHours: 0, delayMinutes: 0 },
            { channel: "EMAIL_COLD", delayHours: 24, delayMinutes: 0 },
          ],
        }),
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.name).toBe("Test Sequence");
    });

    it("rejects invalid channel in step", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/outreach/sequences",
        headers: {
          authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        payload: JSON.stringify({
          name: "Bad Sequence",
          primaryChannel: "WHATSAPP",
          steps: [{ channel: "INVALID_CHANNEL", delayHours: 0, delayMinutes: 0 }],
        }),
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/outreach/sequences", () => {
    it("returns sequences list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/sequences",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ─── Templates ────────────────────────────────────────────────────────────────

  describe("POST /api/v1/outreach/templates", () => {
    it("creates a WhatsApp template", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/outreach/templates",
        headers: {
          authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        payload: JSON.stringify({
          name: "Intro Agro",
          channel: "WHATSAPP",
          templateType: "INITIAL",
          bodyTemplate: "Bună {{contact}}, {oferta|propunerea} noastră...",
          variables: ["contact"],
        }),
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.status).toBe("DRAFT");
    });

    it("creates an EMAIL template with subject", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/outreach/templates",
        headers: {
          authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        payload: JSON.stringify({
          name: "Email Followup",
          channel: "EMAIL",
          templateType: "FOLLOWUP",
          subject: "Revenire ofertă {{company}}",
          bodyTemplate: "Bună {{contact}}, revin cu oferta discutată...",
          variables: ["contact", "company"],
        }),
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.channel).toBe("EMAIL_COLD");
    });
  });

  describe("GET /api/v1/outreach/templates", () => {
    it("returns templates list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/templates",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("filters templates by channel", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/templates?channel=WHATSAPP",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
    });
  });

  // ─── Phones ───────────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/phones", () => {
    it("returns phones list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/phones",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ─── Reviews ──────────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/reviews", () => {
    it("returns review queue", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/reviews",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("filters by priority", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/reviews?priority=URGENT",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/outreach/reviews/stats", () => {
    it("returns review statistics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/reviews/stats",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  // ─── Analytics ────────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/analytics/overview", () => {
    it("returns analytics overview", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/analytics/overview",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  // ─── Campaigns ────────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/campaigns", () => {
    it("returns campaigns list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/campaigns",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });
});
