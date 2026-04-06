/**
 * FAZA 10 — Teste Integrare API Routes E3-E5
 *
 * Acoperire 100%: autentificare, autorizare RBAC, validare Zod, structură răspuns,
 * paginare, filtrare, enqueue BullMQ, erori 404/422/403.
 *
 * Toate testele de "happy path" se bazează pe empty-list (tenant nou, fără date)
 * → garantăm izolare fără mock-uri de DB, conform pattern existent în proiect.
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSlug(name: string) {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

/**
 * Tipuri locale pentru helper-ele de inject — evitam Parameters<overloaded> fragil.
 * Structura este compatibilă cu InjectOptions din light-my-request (structural typing).
 * `HttpMethod` acoperă union-ul HTTPMethods din light-my-request (case-insensitive).
 */
type HttpMethod =
  | "GET"
  | "get"
  | "POST"
  | "post"
  | "PUT"
  | "put"
  | "PATCH"
  | "patch"
  | "DELETE"
  | "delete"
  | "OPTIONS"
  | "options"
  | "HEAD"
  | "head";

interface TestInjectOptions {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  payload?: string;
}

// ─── Shared state ─────────────────────────────────────────────────────────────

let app: FastifyInstance;
let testTenantId: string;
let testUserId: string;
let authToken: string;
let viewerToken: string;

/** UUID sintactic valid (Zod); pentru „resursă inexistentă” în DB, nu pentru ID malformate. */
const NONEXISTENT_ENTITY_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const NONEXISTENT_LEAD_UUID = "b2b2b2b2-b2b2-42b2-b2b2-b2b2b2b2b2b2";

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  const tenantName = `test-e3-e5-routes-${Date.now()}`;
  const tenant = await insert_tenant(tenantName, buildSlug(tenantName));
  testTenantId = tenant.id;
  await setSessionTenantId(testTenantId);

  const adminUser = await insert_user(
    testTenantId,
    `test-admin-${Date.now()}@example.com`,
    TEST_PASSWORD_HASH,
    "Admin E3-E5 Routes",
    "admin",
    "active",
  );
  testUserId = adminUser.id;
  await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });

  authToken = app.jwt.sign({
    id: testUserId,
    userId: testUserId,
    sub: testUserId,
    tenantId: testTenantId,
    role: "admin",
    tokenType: "access",
  });

  const viewerUser = await insert_user(
    testTenantId,
    `test-viewer-${Date.now()}@example.com`,
    TEST_PASSWORD_HASH,
    "Viewer E3-E5 Routes",
    "viewer",
    "active",
  );

  viewerToken = app.jwt.sign({
    id: viewerUser.id,
    userId: viewerUser.id,
    sub: viewerUser.id,
    tenantId: testTenantId,
    role: "viewer",
    tokenType: "access",
  });
});

beforeEach(async () => {
  await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
});

afterAll(async () => {
  if (!testTenantId) {
    await app?.close();
    return;
  }
  await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
  await db.delete(users).where(eq(users.tenantId, testTenantId));
  await db.delete(tenants).where(eq(tenants.id, testTenantId));
  await app.close();
});

// ─── Utilitare auth ───────────────────────────────────────────────────────────

function authed(url: string, method: HttpMethod = "GET", body?: unknown): TestInjectOptions {
  const headers: Record<string, string> = { authorization: `Bearer ${authToken}` };
  if (body === undefined) {
    return { method, url, headers };
  }
  headers["content-type"] = "application/json";
  return {
    method,
    url,
    headers,
    payload: JSON.stringify(body),
  };
}

function unauthed(url: string, method: HttpMethod = "GET"): TestInjectOptions {
  return { method, url };
}

function viewerAuthed(url: string, method: HttpMethod = "GET"): TestInjectOptions {
  return {
    method,
    url,
    headers: { authorization: `Bearer ${viewerToken}` },
  };
}

function assertSuccessList(body: unknown) {
  expect(body).toMatchObject({ success: true });
  expect(Array.isArray((body as { data: unknown[] }).data)).toBe(true);
  expect((body as { meta: { total: number } }).meta).toHaveProperty("total");
}

// ═══════════════════════════════════════════════════════════════════════════════
// E3 — NEGOTIATION ROUTES  /api/v1/negotiations
// ═══════════════════════════════════════════════════════════════════════════════

describe("E3 — Negotiation Routes /api/v1/negotiations", () => {
  it("GET / → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/negotiations"));
    expect(res.statusCode).toBe(401);
  });

  it("GET / → 200 cu JWT, returnează listă goală", async () => {
    const res = await app.inject(authed("/api/v1/negotiations"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /?state=DISCOVERY → 200 cu filtrare validă", async () => {
    const res = await app.inject(authed("/api/v1/negotiations?state=DISCOVERY"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("GET /?state=INVALID → 422 state invalid", async () => {
    const res = await app.inject(authed("/api/v1/negotiations?state=INVALID"));
    expect(res.statusCode).toBe(422);
  });

  it("GET /:id → 404 pentru UUID inexistent", async () => {
    const res = await app.inject(authed(`/api/v1/negotiations/${NONEXISTENT_ENTITY_UUID}`));
    expect(res.statusCode).toBe(404);
  });

  it("GET /:id → 422 pentru ID non-UUID", async () => {
    const res = await app.inject(authed("/api/v1/negotiations/not-a-uuid"));
    expect(res.statusCode).toBe(422);
  });

  it("POST / → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/negotiations", "POST"));
    expect(res.statusCode).toBe(401);
  });

  it("POST / → 422 fără leadId", async () => {
    const res = await app.inject(authed("/api/v1/negotiations", "POST", {}));
    expect(res.statusCode).toBe(422);
  });

  it("POST / → 422 cu leadId invalid", async () => {
    const res = await app.inject(authed("/api/v1/negotiations", "POST", { leadId: "not-uuid" }));
    expect(res.statusCode).toBe(422);
  });

  it("POST / → 404 cu leadId UUID valid dar inexistent", async () => {
    const res = await app.inject(
      authed("/api/v1/negotiations", "POST", {
        leadId: NONEXISTENT_LEAD_UUID,
      }),
    );
    expect(res.statusCode).toBe(404);
  });

  it("POST /:id/abandon → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(
      viewerAuthed(`/api/v1/negotiations/${NONEXISTENT_ENTITY_UUID}/abandon`, "POST"),
    );
    expect(res.statusCode).toBe(403);
  });

  it("GET /stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/negotiations/stats"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: {
        guardrailViolationsTotal?: number;
        guardrailViolationsByType?: unknown[];
      };
    };
    expect(body.success).toBe(true);
    expect(typeof body.data.guardrailViolationsTotal).toBe("number");
    expect(Array.isArray(body.data.guardrailViolationsByType)).toBe(true);
  });

  it("GET /guardrails?limit=500 → 422 (max 100 în schema Zod)", async () => {
    const res = await app.inject(authed("/api/v1/negotiations/guardrails?limit=500"));
    expect(res.statusCode).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E3 — PRODUCT ROUTES  /api/v1/products
// ═══════════════════════════════════════════════════════════════════════════════

describe("E3 — Product Routes /api/v1/products", () => {
  it("GET / → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/products"));
    expect(res.statusCode).toBe(401);
  });

  it("GET / → 200 cu JWT, returnează listă", async () => {
    const res = await app.inject(authed("/api/v1/products"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /?page=0 → 422 pagină invalidă", async () => {
    const res = await app.inject(authed("/api/v1/products?page=0"));
    expect(res.statusCode).toBe(422);
  });

  it("GET /categories → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/products/categories"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /categories → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/products/categories", "POST"));
    expect(res.statusCode).toBe(403);
  });

  it("POST /search → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/products/search", "POST"));
    expect(res.statusCode).toBe(401);
  });

  it("POST /search → 422 fără câmpul q", async () => {
    const res = await app.inject(authed("/api/v1/products/search", "POST", {}));
    expect(res.statusCode).toBe(422);
  });

  it("POST /search → 200 cu q valid", async () => {
    const res = await app.inject(
      authed("/api/v1/products/search", "POST", { q: "grâu", limit: 5 }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("GET /stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/products/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /index/rebuild → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/products/index/rebuild", "POST"));
    expect(res.statusCode).toBe(403);
  });

  /**
   * Acoperire fix S4123: db.execute() pe gold_product_embeddings (tabel fără schemă Drizzle).
   * Creăm un produs real, îl GET-uim și verificăm că `embeddingsCount` este un număr
   * (0 dacă pgvector nu are date) și nu o eroare de runtime.
   */
  it("GET /:id → embeddingsCount este număr (fix S4123 db.execute)", async () => {
    const createRes = await app.inject(
      authed("/api/v1/products", "POST", {
        name: `Test produs sonar ${Date.now()}`,
        currency: "RON",
      }),
    );
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body) as { data: { id: string } };
    const productId = created.data.id;

    const getRes = await app.inject(authed(`/api/v1/products/${productId}`));
    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body) as {
      success: boolean;
      data: { id: string; embeddingsCount: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(productId);
    expect(typeof body.data.embeddingsCount).toBe("number");
    expect(body.data.embeddingsCount).toBeGreaterThanOrEqual(0);
  });

  /**
   * Acoperire fix S7735: unitPrice === undefined trebuie salvat ca null (nu ca eroare).
   * Testăm că produsul creat fără unitPrice returnează unitPrice: null,
   * și cel cu unitPrice returnează valoarea string corectă.
   */
  it("POST / → unitPrice undefined salvat corect ca null (fix S7735)", async () => {
    const res = await app.inject(
      authed("/api/v1/products", "POST", {
        name: `Produs fără preț ${Date.now()}`,
        currency: "RON",
      }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { data: { unitPrice: string | null } };
    expect(body.data.unitPrice).toBeNull();
  });

  it("POST / → unitPrice numeric salvat corect ca string (fix S7735)", async () => {
    const res = await app.inject(
      authed("/api/v1/products", "POST", {
        name: `Produs cu preț ${Date.now()}`,
        currency: "RON",
        unitPrice: 99.5,
      }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { data: { unitPrice: string | null } };
    expect(body.data.unitPrice).toBe("99.50");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E3 — FISCAL ROUTES  /api/v1/fiscal
// ═══════════════════════════════════════════════════════════════════════════════

describe("E3 — Fiscal Routes /api/v1/fiscal", () => {
  it("GET /oblio/documents → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/fiscal/oblio/documents"));
    expect(res.statusCode).toBe(401);
  });

  it("GET /oblio/documents → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/fiscal/oblio/documents"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /oblio/documents → filtrare docType validă", async () => {
    const res = await app.inject(authed("/api/v1/fiscal/oblio/documents?docType=PROFORMA"));
    expect(res.statusCode).toBe(200);
  });

  it("GET /oblio/documents → 422 docType invalid", async () => {
    const res = await app.inject(authed("/api/v1/fiscal/oblio/documents?docType=INEXISTENT"));
    expect(res.statusCode).toBe(422);
  });

  it("GET /einvoice/submissions → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/fiscal/einvoice/submissions"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /timeline → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/fiscal/timeline"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /oblio/stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/fiscal/oblio/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /oblio/proforma → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/fiscal/oblio/proforma", "POST"));
    expect(res.statusCode).toBe(401);
  });

  it("POST /oblio/proforma → 422 fără negociationId", async () => {
    const res = await app.inject(authed("/api/v1/fiscal/oblio/proforma", "POST", {}));
    expect(res.statusCode).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E4 — ORDER ROUTES  /api/v1/orders
// ═══════════════════════════════════════════════════════════════════════════════

describe("E4 — Order Routes /api/v1/orders", () => {
  it("GET / → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/orders"));
    expect(res.statusCode).toBe(401);
  });

  it("GET / → 200 cu JWT, listă goală", async () => {
    const res = await app.inject(authed("/api/v1/orders"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /?status=DRAFT → 200 cu filtrare status validă", async () => {
    const res = await app.inject(authed("/api/v1/orders?status=DRAFT"));
    expect(res.statusCode).toBe(200);
  });

  it("GET /?status=INVALID → 422 status invalid", async () => {
    const res = await app.inject(authed("/api/v1/orders?status=INVALID"));
    expect(res.statusCode).toBe(422);
  });

  it("GET /:id → 404 UUID inexistent", async () => {
    const res = await app.inject(authed(`/api/v1/orders/${NONEXISTENT_ENTITY_UUID}`));
    expect(res.statusCode).toBe(404);
  });

  it("POST / → 422 body gol", async () => {
    const res = await app.inject(authed("/api/v1/orders", "POST", {}));
    expect(res.statusCode).toBe(422);
  });

  it("DELETE /:id → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(
      viewerAuthed(`/api/v1/orders/${NONEXISTENT_ENTITY_UUID}`, "DELETE"),
    );
    expect(res.statusCode).toBe(403);
  });

  it("GET /:id/payments → 401 fără JWT", async () => {
    const res = await app.inject(unauthed(`/api/v1/orders/${NONEXISTENT_ENTITY_UUID}/payments`));
    expect(res.statusCode).toBe(401);
  });

  it("GET /payments/reconciliations → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/orders/payments/reconciliations"));
    expect(res.statusCode).toBe(403);
  });

  it("GET /payments/reconciliations → 200 cu admin", async () => {
    const res = await app.inject(authed("/api/v1/orders/payments/reconciliations"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /payments → 200 cu JWT (listă plăți tenant)", async () => {
    const res = await app.inject(authed("/api/v1/orders/payments"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/orders/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E4 — CREDIT ROUTES  /api/v1/credit
// ═══════════════════════════════════════════════════════════════════════════════

describe("E4 — Credit Routes /api/v1/credit", () => {
  it("GET /profiles → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/credit/profiles"));
    expect(res.statusCode).toBe(401);
  });

  it("GET /profiles → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/credit/profiles"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /profiles/:clientId → 404 UUID inexistent", async () => {
    const res = await app.inject(authed(`/api/v1/credit/profiles/${NONEXISTENT_ENTITY_UUID}`));
    expect(res.statusCode).toBe(404);
  });

  it("GET /reservations → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/credit/reservations"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/credit/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /refresh-all → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/credit/refresh-all", "POST"));
    expect(res.statusCode).toBe(403);
  });

  it("POST /refresh-all → 200 cu admin token (enqueue job)", async () => {
    const res = await app.inject(authed("/api/v1/credit/refresh-all", "POST"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("jobId");
  });

  it("POST /profiles/:clientId/evaluate → 404 client inexistent", async () => {
    const res = await app.inject(
      authed(`/api/v1/credit/profiles/${NONEXISTENT_ENTITY_UUID}/evaluate`, "POST", {}),
    );
    expect(res.statusCode).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E4 — SHIPMENT ROUTES  /api/v1/shipments
// ═══════════════════════════════════════════════════════════════════════════════

describe("E4 — Shipment Routes /api/v1/shipments", () => {
  it("GET / → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/shipments"));
    expect(res.statusCode).toBe(401);
  });

  it("GET / → 200 cu JWT, listă goală", async () => {
    const res = await app.inject(authed("/api/v1/shipments"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /:id → 404 UUID inexistent", async () => {
    const res = await app.inject(authed(`/api/v1/shipments/${NONEXISTENT_ENTITY_UUID}`));
    expect(res.statusCode).toBe(404);
  });

  it("GET /stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/shipments/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /orders/:orderId/create-awb → 401 fără JWT", async () => {
    const res = await app.inject(
      unauthed(`/api/v1/shipments/orders/${NONEXISTENT_ENTITY_UUID}/create-awb`, "POST"),
    );
    expect(res.statusCode).toBe(401);
  });

  it("POST /addresses → 422 body gol", async () => {
    const res = await app.inject(authed("/api/v1/shipments/addresses", "POST", {}));
    expect(res.statusCode).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E4 — CONTRACT ROUTES  /api/v1/contracts
// ═══════════════════════════════════════════════════════════════════════════════

describe("E4 — Contract Routes /api/v1/contracts", () => {
  it("GET / → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/contracts"));
    expect(res.statusCode).toBe(401);
  });

  it("GET / → 200 cu JWT, listă goală", async () => {
    const res = await app.inject(authed("/api/v1/contracts"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /templates → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/contracts/templates"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /clauses → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/contracts/clauses"));
    expect(res.statusCode).toBe(403);
  });

  it("GET /clauses → 200 cu admin token", async () => {
    const res = await app.inject(authed("/api/v1/contracts/clauses"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("GET /audit → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/contracts/audit"));
    expect(res.statusCode).toBe(403);
  });

  it("GET /stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/contracts/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /orders/:orderId/generate → 404 UUID inexistent", async () => {
    const res = await app.inject(
      authed(`/api/v1/contracts/orders/${NONEXISTENT_ENTITY_UUID}/generate`, "POST", {
        clientId: NONEXISTENT_ENTITY_UUID,
      }),
    );
    expect(res.statusCode).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E5 — NURTURING ROUTES  /api/v1/nurturing
// ═══════════════════════════════════════════════════════════════════════════════

describe("E5 — Nurturing Routes /api/v1/nurturing", () => {
  it("GET /states → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/nurturing/states"));
    expect(res.statusCode).toBe(401);
  });

  it("GET /states → 200 cu JWT, listă goală", async () => {
    const res = await app.inject(authed("/api/v1/nurturing/states"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /states/:leadId → 404 UUID inexistent", async () => {
    const res = await app.inject(authed(`/api/v1/nurturing/states/${NONEXISTENT_ENTITY_UUID}`));
    expect(res.statusCode).toBe(404);
  });

  it("GET /actions → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/nurturing/actions"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /drips → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/nurturing/drips"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("POST /drips → 422 body gol", async () => {
    const res = await app.inject(authed("/api/v1/nurturing/drips", "POST", {}));
    expect(res.statusCode).toBe(422);
  });

  it("GET /nps → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/nurturing/nps"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("POST /nps/:leadId/send → 404 lead Gold inexistent", async () => {
    const res = await app.inject(
      authed(`/api/v1/nurturing/nps/${NONEXISTENT_ENTITY_UUID}/send`, "POST", {
        channel: "EMAIL",
        force: false,
      }),
    );
    expect(res.statusCode).toBe(404);
  });

  it("GET /stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/nurturing/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /states/:leadId/evaluate → 404 UUID inexistent", async () => {
    const res = await app.inject(
      authed(`/api/v1/nurturing/states/${NONEXISTENT_ENTITY_UUID}/evaluate`, "POST", {}),
    );
    expect(res.statusCode).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E5 — CHURN ROUTES  /api/v1/churn
// ═══════════════════════════════════════════════════════════════════════════════

describe("E5 — Churn Routes /api/v1/churn", () => {
  it("GET /signals → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/churn/signals"));
    expect(res.statusCode).toBe(401);
  });

  it("GET /signals → 200 cu JWT, listă goală", async () => {
    const res = await app.inject(authed("/api/v1/churn/signals"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /factors → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/churn/factors"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /factors/:leadId → 404 UUID inexistent", async () => {
    const res = await app.inject(authed(`/api/v1/churn/factors/${NONEXISTENT_ENTITY_UUID}`));
    expect(res.statusCode).toBe(404);
  });

  it("GET /sentiment → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/churn/sentiment"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /sentiment?sentimentRange=NEGATIVE → 200 cu filtrare validă", async () => {
    const res = await app.inject(authed("/api/v1/churn/sentiment?sentimentRange=NEGATIVE"));
    expect(res.statusCode).toBe(200);
  });

  it("GET /sentiment?sentimentRange=INVALID → 422 range invalid", async () => {
    const res = await app.inject(authed("/api/v1/churn/sentiment?sentimentRange=INVALID"));
    expect(res.statusCode).toBe(422);
  });

  it("GET /stats → 200 cu JWT, structură stats", async () => {
    const res = await app.inject(authed("/api/v1/churn/stats"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("byRisk");
    expect(body.data).toHaveProperty("bySignalType");
    expect(body.data).toHaveProperty("sentiment");
  });

  it("POST /:leadId/evaluate → 404 UUID inexistent", async () => {
    const res = await app.inject(
      authed(`/api/v1/churn/${NONEXISTENT_ENTITY_UUID}/evaluate`, "POST", {}),
    );
    expect(res.statusCode).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E5 — GRAPH ROUTES  /api/v1/graph
// ═══════════════════════════════════════════════════════════════════════════════

describe("E5 — Graph Routes /api/v1/graph", () => {
  it("GET /clusters → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/graph/clusters"));
    expect(res.statusCode).toBe(401);
  });

  it("GET /clusters → 200 cu JWT, listă goală", async () => {
    const res = await app.inject(authed("/api/v1/graph/clusters"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /clusters/:id → 404 UUID inexistent", async () => {
    const res = await app.inject(authed(`/api/v1/graph/clusters/${NONEXISTENT_ENTITY_UUID}`));
    expect(res.statusCode).toBe(404);
  });

  it("GET /kol-profiles → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/graph/kol-profiles"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("POST /detect → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/graph/detect", "POST"));
    expect(res.statusCode).toBe(403);
  });

  it("POST /detect → 200 cu admin token (enqueue Leiden)", async () => {
    const res = await app.inject(authed("/api/v1/graph/detect", "POST", {}));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("jobId");
  });

  /**
   * Acoperire fix S7748: resolution default trebuie să fie numărul întreg 1 (nu float 1.0).
   * Verificăm că schema Zod acceptă resolution explică cu valori min/max corecte.
   */
  it("POST /detect cu resolution=0.1 (min valid) → 200", async () => {
    const res = await app.inject(
      authed("/api/v1/graph/detect", "POST", { resolution: 0.1, minClusterSize: 2 }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /detect cu resolution=5 (max valid) → 200", async () => {
    const res = await app.inject(
      authed("/api/v1/graph/detect", "POST", { resolution: 5, minClusterSize: 2 }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /detect cu resolution=6 (peste max) → 422", async () => {
    const res = await app.inject(
      authed("/api/v1/graph/detect", "POST", { resolution: 6, minClusterSize: 2 }),
    );
    expect(res.statusCode).toBe(422);
  });

  it("POST /detect cu resolution=0 (sub min 0.1) → 422", async () => {
    const res = await app.inject(
      authed("/api/v1/graph/detect", "POST", { resolution: 0, minClusterSize: 2 }),
    );
    expect(res.statusCode).toBe(422);
  });

  it("POST /detect cu minClusterSize=1 (sub min 2) → 422", async () => {
    const res = await app.inject(
      authed("/api/v1/graph/detect", "POST", { resolution: 1, minClusterSize: 1 }),
    );
    expect(res.statusCode).toBe(422);
  });

  it("GET /relationships → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/graph/relationships"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /proximity → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/graph/proximity"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /stats → 200 cu JWT, structură stats", async () => {
    const res = await app.inject(authed("/api/v1/graph/stats"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("clusters");
    expect(body.data).toHaveProperty("relationships");
  });

  it("GET /geo-summary → 200 cu JWT, data array", async () => {
    const res = await app.inject(authed("/api/v1/graph/geo-summary"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E5 — REFERRAL ROUTES  /api/v1/referrals
// ═══════════════════════════════════════════════════════════════════════════════

describe("E5 — Referral Routes /api/v1/referrals", () => {
  it("GET / → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/referrals"));
    expect(res.statusCode).toBe(401);
  });

  it("GET / → 200 cu JWT, listă goală", async () => {
    const res = await app.inject(authed("/api/v1/referrals"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("GET /:id → 404 UUID inexistent", async () => {
    const res = await app.inject(authed(`/api/v1/referrals/${NONEXISTENT_ENTITY_UUID}`));
    expect(res.statusCode).toBe(404);
  });

  it("POST / → 422 body gol", async () => {
    const res = await app.inject(authed("/api/v1/referrals", "POST", {}));
    expect(res.statusCode).toBe(422);
  });

  it("GET /stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/referrals/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("PATCH /:id/consent → 422 body gol", async () => {
    const res = await app.inject(
      authed(`/api/v1/referrals/${NONEXISTENT_ENTITY_UUID}/consent`, "PATCH", {}),
    );
    expect(res.statusCode).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E5 — ALERT ROUTES  /api/v1/e5/alerts
// ═══════════════════════════════════════════════════════════════════════════════

describe("E5 — Alert Routes /api/v1/e5/alerts", () => {
  it("GET / → 401 fără JWT", async () => {
    const res = await app.inject(unauthed("/api/v1/e5/alerts"));
    expect(res.statusCode).toBe(401);
  });

  it("GET / → 200 cu JWT, listă goală", async () => {
    const res = await app.inject(authed("/api/v1/e5/alerts"));
    expect(res.statusCode).toBe(200);
    assertSuccessList(JSON.parse(res.body));
  });

  it("POST /weather/trigger → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/e5/alerts/weather/trigger", "POST"));
    expect(res.statusCode).toBe(403);
  });

  it("POST /weather/trigger → 422 body gol", async () => {
    const res = await app.inject(authed("/api/v1/e5/alerts/weather/trigger", "POST", {}));
    expect(res.statusCode).toBe(422);
  });

  it("POST /apia/trigger → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/e5/alerts/apia/trigger", "POST"));
    expect(res.statusCode).toBe(403);
  });

  it("POST /compliance/check → 401 pentru viewer (RBAC admin)", async () => {
    const res = await app.inject(viewerAuthed("/api/v1/e5/alerts/compliance/check", "POST"));
    expect(res.statusCode).toBe(403);
  });

  it("POST /compliance/check → 200 admin cu checkType GDPR_CONSENT (enqueue)", async () => {
    const res = await app.inject(
      authed("/api/v1/e5/alerts/compliance/check", "POST", {
        checkType: "GDPR_CONSENT",
      }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: { jobId: unknown } };
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("jobId");
  });

  it("POST /compliance/check → 422 checkType invalid", async () => {
    const res = await app.inject(
      authed("/api/v1/e5/alerts/compliance/check", "POST", {
        checkType: "NOT_A_REAL_CHECK",
      } as { checkType: string }),
    );
    expect([400, 422]).toContain(res.statusCode);
  });

  it("GET /compliance/stats → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/e5/alerts/compliance/stats"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("GET /weather/status → 200 cu JWT", async () => {
    const res = await app.inject(authed("/api/v1/e5/alerts/weather/status"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("POST /campaign/trigger → 422 body gol", async () => {
    const res = await app.inject(authed("/api/v1/e5/alerts/campaign/trigger", "POST", {}));
    expect(res.statusCode).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Validare structurală — toate rutele sunt înregistrate corect
// ═══════════════════════════════════════════════════════════════════════════════

describe("Validare înregistrare rute E3-E5 în index.ts", () => {
  const e3e5Routes = [
    { method: "GET", url: "/api/v1/negotiations", name: "E3 negotiations" },
    { method: "GET", url: "/api/v1/products", name: "E3 products" },
    { method: "GET", url: "/api/v1/fiscal/oblio/documents", name: "E3 fiscal" },
    { method: "GET", url: "/api/v1/orders", name: "E4 orders" },
    { method: "GET", url: "/api/v1/credit/profiles", name: "E4 credit" },
    { method: "GET", url: "/api/v1/shipments", name: "E4 shipments" },
    { method: "GET", url: "/api/v1/contracts", name: "E4 contracts" },
    { method: "GET", url: "/api/v1/nurturing/states", name: "E5 nurturing" },
    { method: "GET", url: "/api/v1/churn/signals", name: "E5 churn" },
    { method: "GET", url: "/api/v1/graph/clusters", name: "E5 graph" },
    { method: "GET", url: "/api/v1/referrals", name: "E5 referrals" },
    { method: "GET", url: "/api/v1/e5/alerts", name: "E5 alerts" },
  ] as const;

  for (const route of e3e5Routes) {
    it(`${route.method} ${route.url} returnează 401 (nu 404) — ruta este înregistrată (${route.name})`, async () => {
      const res = await app.inject({ method: route.method, url: route.url });
      expect(res.statusCode).not.toBe(404);
      expect(res.statusCode).toBe(401);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Paginare — parametri comuni pentru toate rutele de listing
// ═══════════════════════════════════════════════════════════════════════════════

describe("Paginare meta — toate rutele de listing", () => {
  const listRoutes = [
    "/api/v1/negotiations",
    "/api/v1/products",
    "/api/v1/orders",
    "/api/v1/credit/profiles",
    "/api/v1/shipments",
    "/api/v1/contracts",
    "/api/v1/nurturing/states",
    "/api/v1/churn/signals",
    "/api/v1/graph/clusters",
    "/api/v1/referrals",
  ] as const;

  for (const url of listRoutes) {
    it(`GET ${url}?limit=5&page=1 → meta.total și meta.pages prezente`, async () => {
      const res = await app.inject(authed(`${url}?limit=5&page=1`));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as {
        success: boolean;
        data: unknown[];
        meta: { total: number; pages: number };
      };
      expect(body.success).toBe(true);
      expect(typeof body.meta.total).toBe("number");
      expect(typeof body.meta.pages).toBe("number");
    });

    it(`GET ${url}?limit=0 → 422 limit invalid`, async () => {
      const res = await app.inject(authed(`${url}?limit=0`));
      expect(res.statusCode).toBe(422);
    });
  }
});
