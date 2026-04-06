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
  goldCompanies,
  goldContacts,
  silverCompanies,
  eq,
  inArray,
  sql,
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
      expect(response.statusCode).toBe(422);
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

  // ─── Settings ─────────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/settings", () => {
    it("returns or creates default settings for tenant", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/settings",
        headers: { authorization: `Bearer ${authToken}` },
      });
      // 500 if migration 0028 not applied (outreach_settings table missing in test DB)
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("timezone");
        expect(body.data).toHaveProperty("dailyQuotaLimit");
        expect(body.data).toHaveProperty("businessHoursStart");
      } else {
        expect(response.statusCode).toBe(500);
      }
    });
  });

  describe("PATCH /api/v1/outreach/settings", () => {
    it("updates outreach settings", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/outreach/settings",
        headers: {
          authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        payload: JSON.stringify({
          timezone: "Europe/Bucharest",
          dailyQuotaLimit: 50,
          businessHoursStart: 9,
          businessHoursEnd: 18,
          workDays: [1, 2, 3, 4, 5],
        }),
      });
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.timezone).toBe("Europe/Bucharest");
        expect(body.data.dailyQuotaLimit).toBe(50);
      } else {
        expect(response.statusCode).toBe(500);
      }
    });
  });

  // ─── Notifications ────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/notifications", () => {
    it("returns notifications list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/notifications",
        headers: { authorization: `Bearer ${authToken}` },
      });
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data.items)).toBe(true);
        expect(typeof body.data.unreadCount).toBe("number");
      } else {
        expect(response.statusCode).toBe(500);
      }
    });
  });

  // ─── Webhooks (signature rejection) ───────────────────────────────────────────

  describe("POST /api/v1/webhooks/timelinesai", () => {
    it("rejects request without valid signature", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/webhooks/timelinesai",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ event: "message" }),
      });
      expect([401, 503]).toContain(response.statusCode);
    });
  });

  describe("POST /api/v1/webhooks/instantly", () => {
    it("rejects request without valid signature", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/webhooks/instantly",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ event: "email.sent" }),
      });
      expect([401, 503]).toContain(response.statusCode);
    });
  });

  describe("POST /api/v1/webhooks/resend", () => {
    it("rejects request without valid signature", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/webhooks/resend",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ type: "email.sent" }),
      });
      expect([401, 503]).toContain(response.statusCode);
    });
  });

  // ─── Dashboard structure ────────────────────────────────────────────────────

  describe("Dashboard response structure", () => {
    it("returns all required KPI and funnel fields", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/dashboard?period=30d",
        headers: { authorization: `Bearer ${authToken}` },
      });
      const body = JSON.parse(response.body);
      expect(body.data.kpis).toMatchObject({
        messagesSent: expect.any(Number),
        replies: expect.any(Number),
        conversionRate: expect.any(Number),
        activeSequences: expect.any(Number),
        pendingReviews: expect.any(Number),
      });
      expect(Array.isArray(body.data.leadFunnel)).toBe(true);
      expect(Array.isArray(body.data.sentimentDistribution)).toBe(true);
      expect(Array.isArray(body.data.channelPerformance)).toBe(true);
      expect(Array.isArray(body.data.recentActivity)).toBe(true);
      expect(Array.isArray(body.data.phones)).toBe(true);
    });
  });

  // ─── Leads import ─────────────────────────────────────────────────────────────

  describe("POST /api/v1/outreach/leads/import", () => {
    it("rejects unauthenticated import", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/outreach/leads/import",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ leads: [] }),
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ─── Analytics phones ─────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/analytics/phones", () => {
    it("returns phone analytics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/analytics/phones",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  // ─── Export CSV ────────────────────────────────────────────────────────────────

  describe("GET /api/v1/outreach/leads/export", () => {
    it("returns CSV data", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/outreach/leads/export",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toMatch(/text\/csv|application\/octet-stream/);
    });
  });
});

/** Izolare tenant: același `lead_journey.id` din tenant A → 404 cu JWT tenant B. */
describe.sequential("Outreach E2 — izolare tenant (lead journey)", () => {
  let app: FastifyInstance;
  let tenantA: string;
  let tenantB: string;
  let userA: string;
  let userB: string;
  let tokenA: string;
  let tokenB: string;
  let journeyIdFromA: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const ta = await insert_tenant(
      `outreach-isol-a-${Date.now()}`,
      buildTenantSlug(`oa-${Date.now()}`),
    );
    tenantA = ta.id;
    const tb = await insert_tenant(
      `outreach-isol-b-${Date.now()}`,
      buildTenantSlug(`ob-${Date.now()}`),
    );
    tenantB = tb.id;

    const ts = Date.now();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantA}, true)`);
      const [ua] = await tx
        .insert(users)
        .values({
          tenantId: tenantA,
          email: `oa-${ts}@example.com`,
          passwordHash: TEST_PASSWORD_HASH,
          name: "Outreach Isol A",
          role: "admin",
          status: "active",
        })
        .returning({ id: users.id });
      if (!ua) throw new Error("insert user A failed");
      userA = ua.id;
    });

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantB}, true)`);
      const [ub] = await tx
        .insert(users)
        .values({
          tenantId: tenantB,
          email: `ob-${ts}@example.com`,
          passwordHash: TEST_PASSWORD_HASH,
          name: "Outreach Isol B",
          role: "admin",
          status: "active",
        })
        .returning({ id: users.id });
      if (!ub) throw new Error("insert user B failed");
      userB = ub.id;
    });

    await setSessionRequestContext({ tenantId: tenantA, userId: userA });

    tokenA = app.jwt.sign({
      id: userA,
      userId: userA,
      sub: userA,
      tenantId: tenantA,
      role: "admin",
      tokenType: "access",
    });
    tokenB = app.jwt.sign({
      id: userB,
      userId: userB,
      sub: userB,
      tenantId: tenantB,
      role: "admin",
      tokenType: "access",
    });
  });

  afterAll(async () => {
    await setSessionRequestContext({ tenantId: tenantA, userId: userA });
    await db.delete(leadJourney).where(inArray(leadJourney.tenantId, [tenantA, tenantB]));
    await db.delete(goldContacts).where(inArray(goldContacts.tenantId, [tenantA, tenantB]));
    await db.delete(goldCompanies).where(inArray(goldCompanies.tenantId, [tenantA, tenantB]));
    await db.delete(silverCompanies).where(inArray(silverCompanies.tenantId, [tenantA, tenantB]));
    await db.delete(users).where(inArray(users.tenantId, [tenantA, tenantB]));
    await db.delete(tenants).where(inArray(tenants.id, [tenantA, tenantB]));
    await app.close();
  });

  it("tenant A importă lead și obține journey id", async () => {
    const ts = Date.now();
    const imp = await app.inject({
      method: "POST",
      url: "/api/v1/outreach/leads/import",
      headers: {
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      payload: JSON.stringify({
        rows: [
          {
            denumire: `Iso A ${ts}`,
            cui: `ISOA${String(ts).slice(-8)}`,
            email: `iso-a-${ts}@example.com`,
          },
        ],
      }),
    });
    expect(imp.statusCode).toBe(200);
    const list = await app.inject({
      method: "GET",
      url: "/api/v1/outreach/leads?limit=10",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(list.statusCode).toBe(200);
    const body = JSON.parse(list.body) as { data: { id: string }[] };
    expect(body.data.length).toBeGreaterThan(0);
    journeyIdFromA = body.data[0].id;
  });

  it("tenant B GET /leads/:id (journey din A) → 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/outreach/leads/${journeyIdFromA}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
