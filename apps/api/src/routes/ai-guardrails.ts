/**
 * Rute spec Plan — sub prefix /api/v1/ai (alias E3 + audit + consensus).
 * Complementează `compliance.ts` (explicații decizii).
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { auditLlmCalls, db, eq, and, desc, sql, guardrailViolations, inArray } from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { hybridSearchSchema } from "./product.js";

const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const consensusVotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function aiGuardrailsRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const searchLimiter = app.rateLimit({ max: 60, timeWindow: "1 minute" });

  app.get("/guardrails/status", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byType = await db
      .select({
        violationType: sql<string>`coalesce(${guardrailViolations.violationType}, 'unknown')`,
        count: sql<number>`count(*)::int`,
        lastAt: sql<string>`max(${guardrailViolations.createdAt})::text`,
      })
      .from(guardrailViolations)
      .where(eq(guardrailViolations.tenantId, tenantId))
      .groupBy(guardrailViolations.violationType);

    const bySeverity = await db
      .select({
        severity: guardrailViolations.severity,
        count: sql<number>`count(*)::int`,
      })
      .from(guardrailViolations)
      .where(eq(guardrailViolations.tenantId, tenantId))
      .groupBy(guardrailViolations.severity);

    return reply.send({
      success: true,
      data: {
        by_violation_type: byType,
        by_severity: bySeverity,
        source: "gold.guardrail_violations",
      },
    });
  });

  app.get("/audit-log", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = auditLogQuerySchema.parse(req.query);

    const rows = await db
      .select({
        id: auditLlmCalls.id,
        workerQueue: auditLlmCalls.workerQueue,
        modelUsed: auditLlmCalls.modelUsed,
        provider: auditLlmCalls.provider,
        isSelfhosted: auditLlmCalls.isSelfhosted,
        costUsd: auditLlmCalls.costUsd,
        latencyMs: auditLlmCalls.latencyMs,
        guardrailPassed: auditLlmCalls.guardrailPassed,
        createdAt: auditLlmCalls.createdAt,
        promptHash: auditLlmCalls.promptHash,
      })
      .from(auditLlmCalls)
      .where(eq(auditLlmCalls.tenantId, tenantId))
      .orderBy(desc(auditLlmCalls.createdAt))
      .limit(query.limit);

    return reply.send({ success: true, data: rows });
  });

  app.post("/products/search", { ...authOpts, preHandler: [searchLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = hybridSearchSchema.parse(req.body);

    const rrfQueue = createQueue(QUEUES.E3_SEARCH_RRF_FUSE);
    const job = await rrfQueue.add("hybrid-search", {
      query: body.query,
      tenantId,
      categoryId: body.categoryId ?? null,
      limit: body.limit,
      minPrice: body.minPrice ?? null,
      maxPrice: body.maxPrice ?? null,
      ...buildProvenanceContext(req),
    });

    return reply.send({
      success: true,
      data: { jobId: job.id ?? "queued", status: "PROCESSING" },
      meta: { query: body.query, limit: body.limit, aliasOf: "POST /api/v1/products/search" },
    });
  });

  app.get("/consensus/votes", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = consensusVotesQuerySchema.parse(req.query);

    const rows = await db
      .select({
        id: auditLlmCalls.id,
        workerQueue: auditLlmCalls.workerQueue,
        modelUsed: auditLlmCalls.modelUsed,
        provider: auditLlmCalls.provider,
        fallbackReason: auditLlmCalls.fallbackReason,
        guardrailPassed: auditLlmCalls.guardrailPassed,
        allResponses: auditLlmCalls.allResponses,
        createdAt: auditLlmCalls.createdAt,
        promptHash: auditLlmCalls.promptHash,
      })
      .from(auditLlmCalls)
      .where(
        and(
          eq(auditLlmCalls.tenantId, tenantId),
          inArray(auditLlmCalls.workerQueue, [
            QUEUES.CONSENSUS_VOTE_REQUEST,
            QUEUES.CONSENSUS_VOTE_COLLECT,
            QUEUES.CONSENSUS_VOTE_DECIDE,
          ]),
        ),
      )
      .orderBy(desc(auditLlmCalls.createdAt))
      .limit(query.limit);

    return reply.send({ success: true, data: rows });
  });
}
