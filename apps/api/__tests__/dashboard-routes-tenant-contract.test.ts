/**
 * Contract: GET /api/v1/dashboard/stats | activity | daily-stats — schemă stabilă + izolare tenant (A nu vede date B).
 * Anti-halucinare: `dashboard.ts` + `requireTenantId` / `loadDashboardStatsPayload`.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  dailyStats,
  eq,
  insert_tenant,
  insert_user,
  pipelineErrors,
  setSessionRequestContext,
  setSessionTenantId,
  sql,
  tenants,
  users,
  TEST_PASSWORD_HASH,
} from "@cerniq/db";
import type { DashboardStatsPayload } from "../src/lib/dashboard-stats-payload.js";

function headersFor(token: string, tenantId: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "x-tenant-id": tenantId,
  };
}

describe("Dashboard routes — schemă + izolare tenant", () => {
  let app: FastifyInstance;
  let tenantA: string;
  let tenantB: string;
  let userAId: string;
  let userBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const ta = await insert_tenant(`dash-a-${Date.now()}`, `da-${Date.now()}`);
    const tb = await insert_tenant(`dash-b-${Date.now()}`, `db-${Date.now()}`);
    tenantA = ta.id;
    tenantB = tb.id;

    await setSessionTenantId(tenantA);
    const ua = await insert_user(
      tenantA,
      `dash-a-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Dash A",
      "admin",
      "active",
    );
    userAId = ua.id;

    await setSessionTenantId(tenantB);
    const ub = await insert_user(
      tenantB,
      `dash-b-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Dash B",
      "admin",
      "active",
    );
    userBId = ub.id;

    tokenA = app.jwt.sign({
      id: ua.id,
      userId: ua.id,
      sub: ua.id,
      tenantId: tenantA,
      role: "admin",
      tokenType: "access",
    });
    tokenB = app.jwt.sign({
      id: ub.id,
      userId: ub.id,
      sub: ub.id,
      tenantId: tenantB,
      role: "admin",
      tokenType: "access",
    });

    await setSessionTenantId(tenantB);
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantB}, true)`);
      await tx.insert(pipelineErrors).values({
        tenantId: tenantB,
        pipelineStage: "E1",
        workerName: "test-worker-b",
        errorType: "validation",
        errorMessage: "CROSS_TEN_B_SECRET_PIPELINE_ERR",
        severity: "error",
      });
      await tx.insert(dailyStats).values({
        tenantId: tenantB,
        statDate: new Date(),
        pipelineStage: "ISOL_B_1",
        bronzeTotal: 99,
        silverTotal: 0,
        goldTotal: 0,
      });
    });
  });

  afterAll(async () => {
    await setSessionRequestContext({ tenantId: tenantB, userId: userBId });
    await db.delete(pipelineErrors).where(eq(pipelineErrors.tenantId, tenantB));
    await db.delete(dailyStats).where(eq(dailyStats.tenantId, tenantB));
    await db.delete(users).where(eq(users.id, userBId));
    await db.delete(tenants).where(eq(tenants.id, tenantB));

    await setSessionRequestContext({ tenantId: tenantA, userId: userAId });
    await db.delete(pipelineErrors).where(eq(pipelineErrors.tenantId, tenantA));
    await db.delete(dailyStats).where(eq(dailyStats.tenantId, tenantA));
    await db.delete(users).where(eq(users.id, userAId));
    await db.delete(tenants).where(eq(tenants.id, tenantA));

    await app.close();
  });

  it("GET /stats — structură stabilă (chei DashboardStatsPayload)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/stats",
      headers: headersFor(tokenA, tenantA),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: DashboardStatsPayload };
    expect(body.success).toBe(true);
    const d = body.data;
    expect(Number.isFinite(Number(d.bronze.total))).toBe(true);
    expect(Number.isFinite(Number(d.bronze.pending))).toBe(true);
    expect(Number.isFinite(Number(d.silver.total))).toBe(true);
    expect(Number.isFinite(Number(d.gold.cold))).toBe(true);
    expect(Number.isFinite(Number(d.approvals.pending))).toBe(true);
    expect(Number.isFinite(Number(d.errors.last24h))).toBe(true);
    expect(Number.isFinite(Number(d.pipeline.queueDepth))).toBe(true);
    expect(Number.isFinite(Number(d.hitl.pending))).toBe(true);
    expect(Number.isFinite(Number(d.quality.avgScore))).toBe(true);
    expect(d).toHaveProperty("bronze");
    expect(d).toHaveProperty("silver");
    expect(d).toHaveProperty("gold");
    expect(d).toHaveProperty("approvals");
    expect(d).toHaveProperty("errors");
    expect(d).toHaveProperty("pipeline");
    expect(d).toHaveProperty("hitl");
    expect(d).toHaveProperty("quality");
  });

  it("GET /activity — tenant A nu vede erori pipeline ale tenant B", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/activity?limit=50",
      headers: headersFor(tokenA, tenantA),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: { message?: string }[];
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const joined = body.data.map((x) => String(x.message ?? "")).join("\n");
    expect(joined).not.toContain("CROSS_TEN_B_SECRET_PIPELINE_ERR");
  });

  it("GET /daily-stats — tenant A nu primește rânduri daily_stats ale tenant B", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/daily-stats?days=1",
      headers: headersFor(tokenA, tenantA),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: { pipelineStage?: string; bronzeTotal?: number }[];
      meta?: { total: number };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const stages = body.data.map((r) => r.pipelineStage);
    expect(stages).not.toContain("ISOL_B_1");
  });

  it("GET /activity — 400 limit invalid (Zod)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/activity?limit=101",
      headers: headersFor(tokenA, tenantA),
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /daily-stats — 400 days invalid (Zod)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/daily-stats?days=400",
      headers: headersFor(tokenA, tenantA),
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /daily-stats — tenant B vede propriul rând ISOL_B_1", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/daily-stats?days=1",
      headers: headersFor(tokenB, tenantB),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { pipelineStage?: string }[] };
    const stages = body.data.map((r) => r.pipelineStage);
    expect(stages).toContain("ISOL_B_1");
  });

  it("GET /kpi-stream — JWT invalid → 401 (fără SSE)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/kpi-stream",
      headers: { authorization: "Bearer not-a-valid-jwt" },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json() as { success?: boolean };
    expect(body.success).toBe(false);
  });
});
