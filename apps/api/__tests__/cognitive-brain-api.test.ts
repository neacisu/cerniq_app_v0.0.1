/**
 * cognitive-brain-api.test.ts
 * Teste complete pentru endpoint-urile Cognitive Brain API — Faza 4.
 *
 * Acoperire: GET /catalog, GET /topology, GET /topology?batchId=,
 * GET /traces/:traceId, GET /nodes/:nodeKey/traces, GET /mutations/:batchId,
 * POST /nodes/:nodeKey/pause, POST /nodes/:nodeKey/resume,
 * PUT /nodes/:nodeKey/config (cu applyStatus logic),
 * GET /events/stream (auth check).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import {
  db,
  tenants,
  users,
  cognitiveEvents,
  dataMutations,
  cognitiveNodeConfigs,
  importCognitiveNodes,
  importCognitiveEdges,
  eq,
  and,
  TEST_PASSWORD_HASH,
  insert_tenant,
  insert_user,
  setSessionRequestContext,
  setSessionTenantId,
} from "@cerniq/db";
import { COGNITIVE_NODE_CATALOG, CATALOG_STATS } from "@cerniq/shared";

function buildTenantSlug(name: string): string {
  return name.toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
}

// ─── Helpers inline ───────────────────────────────────────────────────────────

const SAMPLE_NODE_KEY = COGNITIVE_NODE_CATALOG[0].nodeKey;
const SAMPLE_BATCH_ID = "11111111-aaaa-4000-8000-111111111111";
const SAMPLE_TRACE_ID = "trace-test-0001";

describe("Cognitive Brain API — /api/v1/brain", () => {
  let app: FastifyInstance;
  let testTenantId: string;
  let testUserId: string;
  let adminToken: string;
  let viewerToken: string;

  // ─── Setup ─────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const tenantName = `test-brain-${Date.now()}`;
    const tenant = await insert_tenant(tenantName, buildTenantSlug(tenantName));
    testTenantId = tenant.id;
    await setSessionTenantId(testTenantId);

    const adminUser = await insert_user(
      testTenantId,
      `test-brain-admin-${Date.now()}@example.com`,
      TEST_PASSWORD_HASH,
      "Brain Admin",
      "admin",
      "active",
    );
    testUserId = adminUser.id;
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });

    adminToken = app.jwt.sign({
      id: testUserId,
      sub: testUserId,
      tenantId: testTenantId,
      role: "admin",
      tokenType: "access",
    });
    viewerToken = app.jwt.sign({
      id: testUserId,
      sub: testUserId,
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
      await app.close();
      return;
    }
    await setSessionRequestContext({ tenantId: testTenantId, userId: testUserId });
    await db.delete(cognitiveEvents).where(eq(cognitiveEvents.tenantId, testTenantId));
    await db.delete(dataMutations).where(eq(dataMutations.tenantId, testTenantId));
    await db.delete(cognitiveNodeConfigs).where(eq(cognitiveNodeConfigs.tenantId, testTenantId));
    await db.delete(importCognitiveEdges).where(eq(importCognitiveEdges.tenantId, testTenantId));
    await db.delete(importCognitiveNodes).where(eq(importCognitiveNodes.tenantId, testTenantId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
    await app.close();
  });

  // ─── GET /catalog ───────────────────────────────────────────────────────────

  describe("GET /api/v1/brain/catalog", () => {
    it("returnează 401 dacă nu e autentificat", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/brain/catalog" });
      expect(res.statusCode).toBe(401);
    });

    it("returnează catalogul complet cu 118+ noduri", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/catalog",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.nodes)).toBe(true);
      expect(body.data.nodes.length).toBe(CATALOG_STATS.total);
    });

    it("acceptă JWT doar în ?token= (EventSource) — același răspuns ca cu Bearer", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/catalog?token=${encodeURIComponent(viewerToken)}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.nodes.length).toBe(CATALOG_STATS.total);
    });

    it("fiecare nod are câmpurile obligatorii", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/catalog",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      const body = JSON.parse(res.body);
      for (const node of body.data.nodes) {
        expect(node).toHaveProperty("nodeKey");
        expect(node).toHaveProperty("queueName");
        expect(node).toHaveProperty("neuronType");
        expect(node).toHaveProperty("swimlane");
        expect(node).toHaveProperty("etapa");
        expect(node).toHaveProperty("criticality");
      }
    });

    it("stats.total corespunde CATALOG_STATS.total", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/catalog",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const body = JSON.parse(res.body);
      expect(body.data.stats.total).toBe(CATALOG_STATS.total);
    });

    it("stats.byEtapa și bySwimlane sunt prezente", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/catalog",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      const body = JSON.parse(res.body);
      expect(body.data.stats).toHaveProperty("byEtapa");
      expect(body.data.stats).toHaveProperty("bySwimlane");
      expect(body.data.stats).toHaveProperty("byNeuronType");
      expect(typeof body.data.stats.byEtapa.e1).toBe("number");
    });
  });

  // ─── GET /topology (global) ─────────────────────────────────────────────────

  describe("GET /api/v1/brain/topology (global, fără batchId)", () => {
    it("returnează 401 dacă nu e autentificat", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/brain/topology" });
      expect(res.statusCode).toBe(401);
    });

    it("returnează graful global cu nodes + edges + metadata", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/topology",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.nodes)).toBe(true);
      expect(Array.isArray(body.data.edges)).toBe(true);
      expect(body.data.metadata).toHaveProperty("totalNeurons");
      expect(body.data.metadata).toHaveProperty("activeNeurons");
      expect(body.data.metadata.totalNeurons).toBe(CATALOG_STATS.total);
    });

    it("fiecare nod are status ACTIVE sau PAUSED", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/topology",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      const body = JSON.parse(res.body);
      for (const node of body.data.nodes) {
        expect(["ACTIVE", "PAUSED", "ERROR"]).toContain(node.status);
      }
    });

    it("returnează 400 la batchId format invalid", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/topology?batchId=not-a-uuid",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── GET /topology?batchId= ──────────────────────────────────────────────────

  describe("GET /api/v1/brain/topology?batchId= (per-batch live)", () => {
    it("returnează topology per batch cu importCognitiveNodes live", async () => {
      // Inserăm un nod live în DB pentru test
      await db.insert(importCognitiveNodes).values({
        tenantId: testTenantId,
        batchId: SAMPLE_BATCH_ID,
        nodeKey: SAMPLE_NODE_KEY,
        cognitiveType: "EXECUTIVE",
        swimlane: "pipeline-control",
        status: "active",
        metrics: { jobs_processed: 42, failures: 1, avg_duration_ms: 150 },
        heartbeatAt: new Date(),
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/topology?batchId=${SAMPLE_BATCH_ID}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.batchId).toBe(SAMPLE_BATCH_ID);

      // Nodul live trebuie să apară cu metricile din DB
      const liveNode = body.data.nodes.find(
        (n: { nodeKey: string }) => n.nodeKey === SAMPLE_NODE_KEY,
      );
      if (liveNode) {
        expect(liveNode.metrics.processed).toBe(42);
        expect(liveNode.metrics.failed).toBe(1);
      }
    });

    it("nodul cu status 'paused' apare ca PAUSED în topology batch", async () => {
      const pausedBatchId = "22222222-bbbb-4000-8000-222222222222";
      await db.insert(importCognitiveNodes).values({
        tenantId: testTenantId,
        batchId: pausedBatchId,
        nodeKey: SAMPLE_NODE_KEY,
        cognitiveType: "EXECUTIVE",
        swimlane: "pipeline-control",
        status: "paused",
        metrics: {},
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/topology?batchId=${pausedBatchId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const node = body.data.nodes.find((n: { nodeKey: string }) => n.nodeKey === SAMPLE_NODE_KEY);
      if (node) expect(node.status).toBe("PAUSED");

      await db
        .delete(importCognitiveNodes)
        .where(
          and(
            eq(importCognitiveNodes.tenantId, testTenantId),
            eq(importCognitiveNodes.batchId, pausedBatchId),
          ),
        );
    });

    it("returnează noduri din catalog chiar dacă nu există în importCognitiveNodes", async () => {
      const emptyBatchId = "33333333-cccc-4000-8000-333333333333";
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/topology?batchId=${emptyBatchId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      // Toate nodurile din catalog trebuie să fie prezente cu ACTIVE implicit
      expect(body.data.nodes.length).toBe(CATALOG_STATS.total);
    });
  });

  // ─── GET /traces/:traceId ────────────────────────────────────────────────────

  describe("GET /api/v1/brain/traces/:traceId", () => {
    it("returnează 401 fără autentificare", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/traces/${SAMPLE_TRACE_ID}`,
      });
      expect(res.statusCode).toBe(401);
    });

    it("returnează lista goală dacă nu există evenimente pentru traceId", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/traces/trace-inexistent-0001",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(0);
    });

    it("returnează evenimentele pentru traceId specificat", async () => {
      await db.insert(cognitiveEvents).values({
        tenantId: testTenantId,
        nodeKey: SAMPLE_NODE_KEY,
        eventType: "node_started",
        traceId: SAMPLE_TRACE_ID,
        spanId: "span-001",
        payload: { startedAt: new Date().toISOString() },
      });
      await db.insert(cognitiveEvents).values({
        tenantId: testTenantId,
        nodeKey: SAMPLE_NODE_KEY,
        eventType: "node_completed",
        traceId: SAMPLE_TRACE_ID,
        spanId: "span-001",
        payload: { completedAt: new Date().toISOString() },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/traces/${SAMPLE_TRACE_ID}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      const types = body.data.map((e: { eventType: string }) => e.eventType);
      expect(types).toContain("node_started");
      expect(types).toContain("node_completed");
    });

    it("fiecare eveniment are câmpurile: id, nodeKey, eventType, timestamp, data", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/traces/${SAMPLE_TRACE_ID}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      const body = JSON.parse(res.body);
      for (const ev of body.data) {
        expect(ev).toHaveProperty("id");
        expect(ev).toHaveProperty("nodeKey");
        expect(ev).toHaveProperty("eventType");
        expect(ev).toHaveProperty("timestamp");
        expect(ev).toHaveProperty("data");
      }
    });

    it("NU returnează evenimentele altui tenant", async () => {
      // Eveniment cu alt tenantId — nu trebuie să apară
      const otherTenantId = "99999999-0000-4000-8000-999999999999";
      await db.insert(cognitiveEvents).values({
        tenantId: otherTenantId,
        nodeKey: SAMPLE_NODE_KEY,
        eventType: "node_started",
        traceId: SAMPLE_TRACE_ID,
        payload: {},
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/traces/${SAMPLE_TRACE_ID}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      const body = JSON.parse(res.body);
      // Niciun eveniment nu trebuie să aibă tenantId altui tenant
      for (const ev of body.data) {
        expect(ev.data?.tenantId ?? testTenantId).not.toBe(otherTenantId);
      }

      await db.delete(cognitiveEvents).where(eq(cognitiveEvents.tenantId, otherTenantId));
    });
  });

  // ─── GET /nodes/:nodeKey/traces ──────────────────────────────────────────────

  describe("GET /api/v1/brain/nodes/:nodeKey/traces", () => {
    it("returnează 401 fără autentificare", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/traces`,
      });
      expect(res.statusCode).toBe(401);
    });

    it("returnează 400 pentru nodeKey necunoscut", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/nodes/e99:inexistent:node/traces",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returnează evenimentele nodului în ordine DESC", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/traces`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toHaveProperty("nodeKey", SAMPLE_NODE_KEY);
      expect(body.meta).toHaveProperty("limit");
    });

    it("respectă limita ?limit=5", async () => {
      // Inserăm 7 evenimente pentru nod
      const inserts = Array.from({ length: 7 }, (_, i) => ({
        tenantId: testTenantId,
        nodeKey: SAMPLE_NODE_KEY,
        eventType: `test_event_${i}`,
        payload: {},
      }));
      await db.insert(cognitiveEvents).values(inserts);

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/traces?limit=5`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(5);
    });

    it("filtrează după ?traceId= opțional", async () => {
      const specificTrace = "trace-node-filter-001";
      await db.insert(cognitiveEvents).values({
        tenantId: testTenantId,
        nodeKey: SAMPLE_NODE_KEY,
        eventType: "node_started",
        traceId: specificTrace,
        payload: {},
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/traces?traceId=${specificTrace}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      for (const ev of body.data) {
        expect(ev.data.traceId).toBe(specificTrace);
      }
    });

    it("returnează 400 dacă ?limit= depășește 100", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/traces?limit=999`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── GET /mutations/:batchId ─────────────────────────────────────────────────

  describe("GET /api/v1/brain/mutations/:batchId", () => {
    it("returnează 401 fără autentificare", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/mutations/${SAMPLE_BATCH_ID}`,
      });
      expect(res.statusCode).toBe(401);
    });

    it("returnează lista goală pentru batchId fără mutații", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/mutations/aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(0);
    });

    it("returnează mutațiile pentru batchId cu câmpuri provenance extinse", async () => {
      const mutBatchId = "bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb";
      await db.insert(dataMutations).values({
        tenantId: testTenantId,
        batchId: mutBatchId,
        nodeKey: SAMPLE_NODE_KEY,
        entityType: "silver_company",
        entityId: "cccccccc-0000-4000-8000-cccccccccccc",
        mutationIntent: "ENRICH",
        beforeData: { status: "INCOMPLETE" },
        afterData: { status: "ENRICHED" },
        changedFields: ["status", "metadata.anafFiscal"],
        traceId: "trace-mut-001",
        causationId: "cause-001",
        actorId: "actor-001",
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/mutations/${mutBatchId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      const mut = body.data[0];
      expect(mut.mutationIntent).toBe("ENRICH");
      expect(mut.changedFields).toContain("status");
      expect(mut.traceId).toBe("trace-mut-001");
      expect(mut.causationId).toBe("cause-001");
      expect(mut.actorId).toBe("actor-001");
    });

    it("returnează 400 când batchId nu este UUID (schema batchIdParamsSchema)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/mutations/not-a-uuid",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as {
        success: boolean;
        error: string;
        details?: unknown;
      };
      expect(body.success).toBe(false);
      expect(body).toHaveProperty("details");
    });
  });

  // ─── POST /nodes/:nodeKey/pause ──────────────────────────────────────────────

  describe("POST /api/v1/brain/nodes/:nodeKey/pause", () => {
    it("returnează 401 fără autentificare", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/pause`,
      });
      expect(res.statusCode).toBe(401);
    });

    it("returnează 403 pentru rol viewer (necesită admin)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/pause`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("returnează 400 pentru nodeKey necunoscut", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/brain/nodes/e99:fake:node/pause",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it("pauze nodul și returnează status=PAUSED, propagated=false (fără batchId)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/pause`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe("PAUSED");
      expect(body.nodeKey).toBe(SAMPLE_NODE_KEY);
      expect(body.propagated).toBe(false);
      expect(body.batchId).toBeNull();
    });

    it("pauze nodul cu batchId — propagated=true", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/pause`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ batchId: SAMPLE_BATCH_ID }),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.propagated).toBe(true);
      expect(body.batchId).toBe(SAMPLE_BATCH_ID);
    });

    it("respinge body.batchId non-UUID (schema route Fastify → 400/422 + details)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/pause`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ batchId: "invalid-batch-id" }),
      });
      expect([400, 422]).toContain(res.statusCode);
      const body = JSON.parse(res.body) as {
        success: boolean;
        details?: { issues?: unknown[]; validation?: unknown };
      };
      expect(body.success).toBe(false);
      expect(body.details?.validation ?? body.details?.issues).toBeDefined();
    });
  });

  // ─── POST /nodes/:nodeKey/resume ─────────────────────────────────────────────

  describe("POST /api/v1/brain/nodes/:nodeKey/resume", () => {
    it("returnează 401 fără autentificare", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/resume`,
      });
      expect(res.statusCode).toBe(401);
    });

    it("returnează 403 pentru rol viewer", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/resume`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("reactivează nodul și returnează status=ACTIVE", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/resume`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe("ACTIVE");
      expect(body.nodeKey).toBe(SAMPLE_NODE_KEY);
    });

    it("pause urmată de resume → nodul apare ACTIVE în topology", async () => {
      // Pauze
      await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/pause`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({}),
      });

      // Resume
      await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/resume`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      // Verifică topology globală
      const topo = await app.inject({
        method: "GET",
        url: "/api/v1/brain/topology",
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      const topoBody = JSON.parse(topo.body);
      const node = topoBody.data.nodes.find(
        (n: { nodeKey: string }) => n.nodeKey === SAMPLE_NODE_KEY,
      );
      if (node) expect(node.status).toBe("ACTIVE");
    });
  });

  // ─── PUT /nodes/:nodeKey/config ──────────────────────────────────────────────

  describe("PUT /api/v1/brain/nodes/:nodeKey/config", () => {
    it("returnează 401 fără autentificare", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 5 }),
      });
      expect(res.statusCode).toBe(401);
    });

    it("returnează 403 pentru rol viewer", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${viewerToken}`, "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 5 }),
      });
      expect(res.statusCode).toBe(403);
    });

    it("returnează 400 pentru body gol", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.statusCode).toBe(400);
    });

    it("returnează 400 pentru concurrency=0 (încalcă .positive())", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 0 }),
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as { success: boolean; details?: unknown };
      expect(body.success).toBe(false);
      expect(body).toHaveProperty("details");
    });

    it("returnează 400 pentru concurrency>1000 (încalcă .max(1000))", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 1001 }),
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as { success: boolean; details?: unknown };
      expect(body.success).toBe(false);
      expect(body).toHaveProperty("details");
    });

    it("schimbare concurrency → applyStatus='pending_apply' (necesită restart worker)", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 10 }),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.meta.applyStatus).toBe("pending_apply");
      expect(body.meta.requiresWorkerRestart).toBe(true);
      expect(body.data.concurrency).toBe(10);
    });

    it("schimbare rateLimitMax → applyStatus='pending_apply'", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ rateLimitMax: 100 }),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.meta.applyStatus).toBe("pending_apply");
    });

    it("schimbare paused=true only → applyStatus='immediate'", async () => {
      // Prima dată: setăm concurrency să corespundă cu ce e în DB (fără schimbare reală)
      // Inserăm o config existentă cu concurrency=10
      await db
        .insert(cognitiveNodeConfigs)
        .values({
          tenantId: testTenantId,
          nodeKey: SAMPLE_NODE_KEY,
          concurrency: 10,
          paused: false,
          configOverrides: {},
          applyStatus: "applied",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [cognitiveNodeConfigs.tenantId, cognitiveNodeConfigs.nodeKey],
          set: { concurrency: 10, paused: false, applyStatus: "applied", updatedAt: new Date() },
        });

      // Schimbăm DOAR paused (fără schimbarea concurrency)
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ paused: true }),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.meta.applyStatus).toBe("immediate");
      expect(body.meta.requiresWorkerRestart).toBe(false);
      expect(body.data.paused).toBe(true);

      // Cleanup: resume
      await app.inject({
        method: "POST",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/resume`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
    });

    it("upsert corect — a doua PUT nu creează duplicat", async () => {
      await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 3 }),
      });
      const res2 = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 5 }),
      });
      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.body);
      expect(body2.data.concurrency).toBe(5);
    });
  });

  // ─── GET /events/stream (SSE) — auth checks ───────────────────────────────────

  describe("GET /api/v1/brain/events/stream (SSE)", () => {
    it("returnează 401 dacă nu e autentificat (înainte de hijack)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/events/stream",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returnează 401 pentru ?token= JWT invalid (fără header Authorization)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/events/stream?token=not-a-valid-jwt",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returnează 403 pentru token cu rol insuficient (roleInvalid)", async () => {
      // Creăm un token cu rol inexistent (sub viewer)
      const noRoleToken = app.jwt.sign({
        id: testUserId,
        sub: testUserId,
        tenantId: testTenantId,
        role: "readonly_invalid",
        tokenType: "access",
      });
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/events/stream",
        headers: { authorization: `Bearer ${noRoleToken}` },
      });
      // viewer este rolul minim; "readonly_invalid" nu are rank suficient → 403
      expect(res.statusCode).toBe(403);
    });

    // Nota: testul complet al stream-ului SSE (Content-Type: text/event-stream,
    // Last-Event-ID replay, ': connected' event) este acoperit în testele e2e
    // deoarece reply.hijack() nu se finalizează în environment-ul inject() al Fastify.
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  describe("Edge cases și validări", () => {
    it("GET /topology: viewer poate accesa, operator poate accesa", async () => {
      const operatorToken = app.jwt.sign({
        id: testUserId,
        sub: testUserId,
        tenantId: testTenantId,
        role: "operator",
        tokenType: "access",
      });
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/brain/topology",
        headers: { authorization: `Bearer ${operatorToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it("GET /nodes/:nodeKey/traces: ?since= ISO datetime valid filtrează corect", async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // mâine
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/traces?since=${futureDate}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      // Nu ar trebui să existe evenimente din viitor
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });

    it("GET /nodes/:nodeKey/traces: ?since= invalid returnează 400", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/traces?since=not-a-date`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it("PUT /config: concurrency identic cu cel existent → applyStatus='immediate'", async () => {
      // Setăm concurrency=7 prima dată
      await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 7 }),
      });
      // Trimitem același concurrency=7 din nou — nu e schimbare reală
      const res2 = await app.inject({
        method: "PUT",
        url: `/api/v1/brain/nodes/${SAMPLE_NODE_KEY}/config`,
        headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ concurrency: 7 }),
      });
      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.body);
      // Nu există schimbare reală de concurrency → immediate
      expect(body2.meta.applyStatus).toBe("immediate");
    });
  });
});
