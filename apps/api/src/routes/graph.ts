/**
 * Etapa 5 — Graph API Routes (E5 Community Detection: Clustere Leiden + KOL)
 * Prefix registered at: /api/v1/graph
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  goldClusters,
  goldClusterMembers,
  goldEntityRelationships,
  goldProximityScores,
  goldCompanies,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireRole } from "../middleware/authz.js";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e5GraphDetectionsTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.uuid() });

const clustersQuerySchema = z.object({
  detectionMethod: z.enum(["LEIDEN", "MANUAL"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const kolQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const detectSchema = z
  .object({
    resolution: z.number().min(0.1).max(5).default(1),
    minClusterSize: z.number().int().min(2).default(3),
  })
  .optional();

const relationshipsQuerySchema = z.object({
  entityId: z.uuid().optional(),
  relationType: z
    .enum([
      "NEIGHBOR",
      "SAME_ASSOCIATION",
      "SHARED_SHAREHOLDER",
      "RECOMMENDED_BY",
      "BEHAVIORAL_CLUSTER",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const proximityQuerySchema = z.object({
  clientId: z.uuid().optional(),
  minScore: z.coerce.number().min(0).max(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function graphRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  const detectLimiter = app.rateLimit({ max: 5, timeWindow: "1 minute" });

  // ── GET /graph/clusters ────────────────────────────────────────────────────

  app.get("/clusters", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = clustersQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldClusters.tenantId, tenantId)];
    if (query.detectionMethod)
      conditions.push(eq(goldClusters.detectionMethod, query.detectionMethod));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          cluster: goldClusters,
          kolName: goldCompanies.denumire,
        })
        .from(goldClusters)
        .leftJoin(goldCompanies, eq(goldClusters.kolClientId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldClusters.modularityScore))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldClusters)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({ ...r.cluster, kolName: r.kolName })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /graph/clusters/:id ────────────────────────────────────────────────

  app.get("/clusters/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [row] = await db
      .select({
        cluster: goldClusters,
        kolName: goldCompanies.denumire,
        kolCui: goldCompanies.cui,
      })
      .from(goldClusters)
      .leftJoin(goldCompanies, eq(goldClusters.kolClientId, goldCompanies.id))
      .where(and(eq(goldClusters.id, id), eq(goldClusters.tenantId, tenantId)))
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: "Cluster not found" });

    const members = await db
      .select({
        member: goldClusterMembers,
        companyName: goldCompanies.denumire,
        cui: goldCompanies.cui,
        judet: goldCompanies.judet,
      })
      .from(goldClusterMembers)
      .leftJoin(goldCompanies, eq(goldClusterMembers.clientId, goldCompanies.id))
      .where(eq(goldClusterMembers.clusterId, id))
      .orderBy(desc(goldClusterMembers.centralityScore));

    return reply.send({
      success: true,
      data: {
        ...row.cluster,
        kolName: row.kolName,
        kolCui: row.kolCui,
        members: members.map((m) => ({
          ...m.member,
          companyName: m.companyName,
          cui: m.cui,
          judet: m.judet,
        })),
      },
    });
  });

  // ── GET /graph/kol-profiles ────────────────────────────────────────────────

  app.get("/kol-profiles", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = kolQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const [rows, countResult] = await Promise.all([
      db
        .select({
          clusterId: goldClusters.id,
          clusterName: goldClusters.name,
          modularityScore: goldClusters.modularityScore,
          memberCount: goldClusters.memberCount,
          detectionMethod: goldClusters.detectionMethod,
          kolClientId: goldClusters.kolClientId,
          companyName: goldCompanies.denumire,
          cui: goldCompanies.cui,
          judet: goldCompanies.judet,
          updatedAt: goldClusters.updatedAt,
        })
        .from(goldClusters)
        .innerJoin(goldCompanies, eq(goldClusters.kolClientId, goldCompanies.id))
        .where(
          and(eq(goldClusters.tenantId, tenantId), sql`${goldClusters.kolClientId} IS NOT NULL`),
        )
        .orderBy(desc(goldClusters.memberCount))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldClusters)
        .where(
          and(eq(goldClusters.tenantId, tenantId), sql`${goldClusters.kolClientId} IS NOT NULL`),
        ),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── POST /graph/detect (admin — CPU intensive rate limited) ───────────────

  app.post("/detect", { ...adminAuth, preHandler: [detectLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = detectSchema?.parse(req.body) ?? { resolution: 1, minClusterSize: 3 };

    const buildQueue = createQueue(QUEUES.E5_GRAPH_BUILD_RELATIONSHIPS);
    const job = await buildQueue.add("detect-manual", {
      tenantId,
      resolution: body?.resolution ?? 1,
      minClusterSize: body?.minClusterSize ?? 3,
      ...buildProvenanceContext(req),
    });

    e5GraphDetectionsTotal.inc();
    return reply.send({
      success: true,
      data: {
        jobId: job.id ?? "queued",
        status: "PROCESSING",
        note: "Pipeline: graph:build → community:detect:leiden → centrality:calculate → kol:identify",
      },
    });
  });

  // ── GET /graph/relationships ───────────────────────────────────────────────

  app.get("/relationships", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = relationshipsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldEntityRelationships.tenantId, tenantId)];
    if (query.entityId) {
      conditions.push(
        sql`(${goldEntityRelationships.entityAId} = ${query.entityId} OR ${goldEntityRelationships.entityBId} = ${query.entityId})`,
      );
    }
    if (query.relationType)
      conditions.push(eq(goldEntityRelationships.relationType, query.relationType));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(goldEntityRelationships)
        .where(and(...conditions))
        .orderBy(desc(goldEntityRelationships.confidence))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldEntityRelationships)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /graph/proximity ───────────────────────────────────────────────────

  app.get("/proximity", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = proximityQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldProximityScores.tenantId, tenantId)];
    if (query.clientId) {
      conditions.push(
        sql`(${goldProximityScores.anchorId} = ${query.clientId} OR ${goldProximityScores.prospectId} = ${query.clientId})`,
      );
    }
    if (query.minScore !== undefined)
      conditions.push(sql`${goldProximityScores.proximityScore} >= ${query.minScore}`);

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(goldProximityScores)
        .where(and(...conditions))
        .orderBy(desc(goldProximityScores.proximityScore))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldProximityScores)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /graph/stats ──────────────────────────────────────────────────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const [clusterStats] = await db
      .select({
        totalClusters: sql<number>`count(*)::int`,
        avgMemberCount: sql<string>`coalesce(avg(${goldClusters.memberCount}), 0)::text`,
        avgModularity: sql<string>`coalesce(avg(${goldClusters.modularityScore}), 0)::text`,
        kolCount: sql<number>`count(*) filter (where ${goldClusters.kolClientId} is not null)::int`,
      })
      .from(goldClusters)
      .where(eq(goldClusters.tenantId, tenantId));

    const [relStats] = await db
      .select({
        totalRelationships: sql<number>`count(*)::int`,
      })
      .from(goldEntityRelationships)
      .where(eq(goldEntityRelationships.tenantId, tenantId));

    return reply.send({
      success: true,
      data: { clusters: clusterStats, relationships: relStats },
    });
  });
}
