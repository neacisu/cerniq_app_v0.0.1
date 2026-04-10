/**
 * Rute spec Plan — sub prefix /api/v1/ai (alias E3 + audit + consensus).
 * Complementează `compliance.ts` (explicații decizii).
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  auditLlmCalls,
  db,
  eq,
  and,
  or,
  desc,
  sql,
  guardrailViolations,
  inArray,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { hybridSearchSchema } from "./product.js";

const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** Doar apeluri LLM relevante pentru monitorizare guardrail (evaluări / regenerări / violări JSON). */
  type: z.enum(["guardrail"]).optional(),
});

const guardrailsMetricsQuerySchema = z.object({
  latencyDays: z.coerce.number().int().min(1).max(90).default(30),
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

    const guardrailScope = or(
      eq(auditLlmCalls.guardrailPassed, false),
      sql`jsonb_array_length(coalesce(${auditLlmCalls.guardrailViolations}, '[]'::jsonb)) > 0`,
      sql`${auditLlmCalls.regenerationAttempt} > 0`,
    );

    const scopeWhere =
      query.type === "guardrail"
        ? and(eq(auditLlmCalls.tenantId, tenantId), guardrailScope)
        : eq(auditLlmCalls.tenantId, tenantId);

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
        guardrailViolations: auditLlmCalls.guardrailViolations,
        regenerationAttempt: auditLlmCalls.regenerationAttempt,
        llmguardScores: auditLlmCalls.llmguardScores,
        allResponses: auditLlmCalls.allResponses,
        createdAt: auditLlmCalls.createdAt,
        promptHash: auditLlmCalls.promptHash,
      })
      .from(auditLlmCalls)
      .where(scopeWhere)
      .orderBy(desc(auditLlmCalls.createdAt))
      .limit(query.limit);

    return reply.send({ success: true, data: rows });
  });

  app.get("/guardrails/metrics", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { latencyDays } = guardrailsMetricsQuerySchema.parse(req.query);

    const violationsDaily = await db.execute<{ day: string; count: number }>(sql`
      SELECT
        to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS count
      FROM gold.guardrail_violations
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= now() - interval '7 days'
      GROUP BY 1
      ORDER BY 1
    `);

    const [audit7d] = await db
      .select({
        total: sql<number>`count(*)::int`,
        passed: sql<number>`count(*) filter (where ${auditLlmCalls.guardrailPassed} = true)::int`,
        failed: sql<number>`count(*) filter (where ${auditLlmCalls.guardrailPassed} = false)::int`,
      })
      .from(auditLlmCalls)
      .where(
        and(
          eq(auditLlmCalls.tenantId, tenantId),
          sql`${auditLlmCalls.createdAt} >= now() - interval '7 days'`,
        ),
      );

    const [regenRow] = await db
      .select({
        totalRegenerationAttempts: sql<string>`coalesce(sum(${auditLlmCalls.regenerationAttempt}), 0)::text`,
        callsWithRegeneration: sql<number>`count(*) filter (where ${auditLlmCalls.regenerationAttempt} > 0)::int`,
      })
      .from(auditLlmCalls)
      .where(
        and(
          eq(auditLlmCalls.tenantId, tenantId),
          sql`${auditLlmCalls.createdAt} >= now() - ${latencyDays} * interval '1 day'`,
        ),
      );

    const latencyRows = await db.execute<{
      workerQueue: string;
      p50: number;
      p95: number;
      p99: number;
      samples: number;
    }>(sql`
      SELECT
        worker_queue AS "workerQueue",
        COALESCE(percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms), 0)::int AS p50,
        COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::int AS p95,
        COALESCE(percentile_disc(0.99) WITHIN GROUP (ORDER BY latency_ms), 0)::int AS p99,
        COUNT(*)::int AS samples
      FROM audit.audit_llm_calls
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= now() - ${latencyDays} * interval '1 day'
      GROUP BY worker_queue
      ORDER BY worker_queue
    `);

    const modelRows = await db.execute<{
      workerQueue: string;
      modelUsed: string;
      count: number;
    }>(sql`
      SELECT
        worker_queue AS "workerQueue",
        model_used AS "modelUsed",
        COUNT(*)::int AS count
      FROM audit.audit_llm_calls
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= now() - ${latencyDays} * interval '1 day'
      GROUP BY worker_queue, model_used
      ORDER BY worker_queue, count DESC
    `);

    return reply.send({
      success: true,
      data: {
        violations_daily_last_7_days: Array.isArray(violationsDaily) ? violationsDaily : [],
        llm_audit_7d: audit7d ?? { total: 0, passed: 0, failed: 0 },
        regeneration: {
          totalAttempts: regenRow?.totalRegenerationAttempts ?? "0",
          callsWithRegeneration: regenRow?.callsWithRegeneration ?? 0,
          windowDays: latencyDays,
        },
        latency_ms_by_queue: latencyRows,
        model_routing: modelRows,
        source: {
          violations: "gold.guardrail_violations",
          audit: "audit.audit_llm_calls",
        },
      },
    });
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
