/**
 * Izolare tenant pe GET-uri Gold (E3–E4): același ID creat în tenant A
 * trebuie să dea 404 (sau răspuns fără date) pentru JWT tenant B.
 *
 * Politici verificate în handler-e (tenantId în WHERE): product.ts, order.ts,
 * negotiation.ts, credit.ts (profiles/:clientId).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  tenants,
  users,
  goldCompanies,
  silverCompanies,
  goldProducts,
  goldNegotiations,
  goldOrders,
  goldOrderItems,
  eq,
  sql,
  TEST_PASSWORD_HASH,
  insert_tenant,
  setSessionRequestContext,
} from "@cerniq/db";

function buildTenantSlug(name: string): string {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

describe.sequential("Gold API — izolare GET cross-tenant (A vs B)", () => {
  let app: FastifyInstance;
  let tenantA: string;
  let tenantB: string;
  let userA: string;
  let userB: string;
  let tokenA: string;
  let tokenB: string;

  let leadId: string;
  let silverId: string;
  let productId: string;
  let negotiationId: string;
  let orderId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const ta = await insert_tenant(
      `gold-isol-a-${Date.now()}`,
      buildTenantSlug(`ga-${Date.now()}`),
    );
    tenantA = ta.id;
    const tb = await insert_tenant(
      `gold-isol-b-${Date.now()}`,
      buildTenantSlug(`gb-${Date.now()}`),
    );
    tenantB = tb.id;

    const ts = Date.now();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantA}, true)`);
      const [ua] = await tx
        .insert(users)
        .values({
          tenantId: tenantA,
          email: `ga-${ts}@example.com`,
          passwordHash: TEST_PASSWORD_HASH,
          name: "Gold Isol A",
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
          email: `gb-${ts}@example.com`,
          passwordHash: TEST_PASSWORD_HASH,
          name: "Gold Isol B",
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

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantA}, true)`);
      const [s] = await tx
        .insert(silverCompanies)
        .values({
          tenantId: tenantA,
          denumire: `Isol Silver ${ts}`,
          cui: `9${String(ts).slice(-7)}`,
          promotionStatus: "eligible",
        })
        .returning({ id: silverCompanies.id });
      if (!s) throw new Error("silver insert failed");
      const [g] = await tx
        .insert(goldCompanies)
        .values({
          tenantId: tenantA,
          silverId: s.id,
          bronzeIds: [],
          cui: `8${String(ts).slice(-7)}`,
          denumire: `Isol Gold ${ts}`,
          currentState: "COLD",
        })
        .returning({ id: goldCompanies.id });
      if (!g) throw new Error("gold insert failed");
      leadId = g.id;
      silverId = s.id;
    });

    const p = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { authorization: `Bearer ${tokenA}`, "content-type": "application/json" },
      payload: JSON.stringify({ name: `Iso Prod ${ts}` }),
    });
    expect(p.statusCode).toBe(201);
    productId = (JSON.parse(p.body) as { data: { id: string } }).data.id;

    const n = await app.inject({
      method: "POST",
      url: "/api/v1/negotiations",
      headers: { authorization: `Bearer ${tokenA}`, "content-type": "application/json" },
      payload: JSON.stringify({ leadId }),
    });
    expect(n.statusCode).toBe(201);
    negotiationId = (JSON.parse(n.body) as { data: { id: string } }).data.id;

    const o = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { authorization: `Bearer ${tokenA}`, "content-type": "application/json" },
      payload: JSON.stringify({
        leadId,
        items: [{ productName: "Line item", quantity: 1, unitPrice: 10 }],
      }),
    });
    expect(o.statusCode).toBe(201);
    orderId = (JSON.parse(o.body) as { data: { id: string } }).data.id;
  });

  afterAll(async () => {
    // Tranzacție + set_config local: același connection ca DELETE-urile (evită RLS „0 rows” când
    // alt fișier de test paralel schimbă app.tenant_id pe alt socket din pool).
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantA}, true)`);
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${userA}, true)`);
      await tx.delete(goldOrderItems).where(eq(goldOrderItems.orderId, orderId));
      await tx.delete(goldOrders).where(eq(goldOrders.id, orderId));
      await tx.delete(goldNegotiations).where(eq(goldNegotiations.id, negotiationId));
      await tx.delete(goldProducts).where(eq(goldProducts.id, productId));
      await tx.delete(goldCompanies).where(eq(goldCompanies.id, leadId));
      await tx.delete(silverCompanies).where(eq(silverCompanies.id, silverId));
    });

    await setSessionRequestContext({ tenantId: tenantB, userId: userB });
    await db.delete(users).where(eq(users.id, userB));
    await db.delete(tenants).where(eq(tenants.id, tenantB));

    await setSessionRequestContext({ tenantId: tenantA, userId: userA });
    await db.delete(users).where(eq(users.id, userA));
    await db.delete(tenants).where(eq(tenants.id, tenantA));

    await app.close();
  });

  it("tenant A vede produsul; tenant B GET /products/:id → 404", async () => {
    const ok = await app.inject({
      method: "GET",
      url: `/api/v1/products/${productId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(ok.statusCode).toBe(200);
    const denied = await app.inject({
      method: "GET",
      url: `/api/v1/products/${productId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(denied.statusCode).toBe(404);
    const body = JSON.parse(denied.body) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("tenant A vede comanda; tenant B GET /orders/:id → 404", async () => {
    const ok = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${orderId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(ok.statusCode).toBe(200);
    const denied = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${orderId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(denied.statusCode).toBe(404);
    expect((JSON.parse(denied.body) as { success: boolean }).success).toBe(false);
  });

  it("tenant A vede negocierea; tenant B GET /negotiations/:id → 404", async () => {
    const ok = await app.inject({
      method: "GET",
      url: `/api/v1/negotiations/${negotiationId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(ok.statusCode).toBe(200);
    const denied = await app.inject({
      method: "GET",
      url: `/api/v1/negotiations/${negotiationId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(denied.statusCode).toBe(404);
    expect((JSON.parse(denied.body) as { success: boolean }).success).toBe(false);
  });

  it("tenant B GET /credit/profiles/:clientId (lead gold din A) → 404 Client not found", async () => {
    const denied = await app.inject({
      method: "GET",
      url: `/api/v1/credit/profiles/${leadId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(denied.statusCode).toBe(404);
    const body = JSON.parse(denied.body) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe("Client not found");
  });
});
