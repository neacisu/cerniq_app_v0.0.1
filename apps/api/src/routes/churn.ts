/**
 * Etapa 5 — Churn API Routes (E5 Churn Detection AI)
 * Prefix registered at: /api/v1/churn
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  goldChurnSignals,
  goldChurnFactors,
  goldSentimentAnalysis,
  goldCompanies,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e5ChurnEvaluationsTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const leadIdParamSchema = z.object({ leadId: z.uuid() });

const CHURN_SIGNAL_TYPES = [
  "COMMUNICATION_FADE",
  "NEGATIVE_SENTIMENT",
  "COMPETITOR_MENTION",
  "SUPPORT_ESCALATION",
  "ORDER_FREQUENCY_DROP",
  "PAYMENT_DELAY",
  "PRICE_COMPLAINT",
  "QUALITY_COMPLAINT",
] as const;

const signalsQuerySchema = z.object({
  leadId: z.uuid().optional(),
  signalType: z.enum(CHURN_SIGNAL_TYPES).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const factorsQuerySchema = z.object({
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const sentimentQuerySchema = z.object({
  leadId: z.uuid().optional(),
  /** "POSITIVE" = score > 0.2, "NEUTRAL" = -0.2..0.2, "NEGATIVE" = score < -0.2 */
  sentimentRange: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const evaluateChurnSchema = z.object({ force: z.boolean().default(false) }).optional();

// ─── Route Registration ───────────────────────────────────────────────────────

export async function churnRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const writeLimiter = app.rateLimit({ max: 20, timeWindow: "1 minute" });

  // ── GET /churn/signals ────────────────────────────────────────────────────

  app.get("/signals", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = signalsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldChurnSignals.tenantId, tenantId)];
    if (query.leadId) conditions.push(eq(goldChurnSignals.leadId, query.leadId));
    if (query.signalType) conditions.push(eq(goldChurnSignals.signalType, query.signalType));
    if (query.isActive !== undefined)
      conditions.push(eq(goldChurnSignals.isActive, query.isActive));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          signal: goldChurnSignals,
          companyName: goldCompanies.denumire,
          cui: goldCompanies.cui,
        })
        .from(goldChurnSignals)
        .leftJoin(goldCompanies, eq(goldChurnSignals.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldChurnSignals.detectedAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldChurnSignals)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({
        ...r.signal,
        companyName: r.companyName,
        cui: r.cui,
      })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /churn/factors ────────────────────────────────────────────────────

  app.get("/factors", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = factorsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldChurnFactors.tenantId, tenantId)];
    if (query.riskLevel) conditions.push(eq(goldChurnFactors.riskLevel, query.riskLevel));
    if (query.minScore !== undefined)
      conditions.push(sql`${goldChurnFactors.overallChurnScore} >= ${query.minScore}`);

    const [rows, countResult] = await Promise.all([
      db
        .select({
          factor: goldChurnFactors,
          companyName: goldCompanies.denumire,
          cui: goldCompanies.cui,
          judet: goldCompanies.judet,
        })
        .from(goldChurnFactors)
        .leftJoin(goldCompanies, eq(goldChurnFactors.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldChurnFactors.overallChurnScore))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldChurnFactors)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({
        ...r.factor,
        companyName: r.companyName,
        cui: r.cui,
        judet: r.judet,
      })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /churn/factors/:leadId ────────────────────────────────────────────

  app.get("/factors/:leadId", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { leadId } = leadIdParamSchema.parse(req.params);

    const [row] = await db
      .select({
        factor: goldChurnFactors,
        companyName: goldCompanies.denumire,
        cui: goldCompanies.cui,
      })
      .from(goldChurnFactors)
      .leftJoin(goldCompanies, eq(goldChurnFactors.leadId, goldCompanies.id))
      .where(and(eq(goldChurnFactors.tenantId, tenantId), eq(goldChurnFactors.leadId, leadId)))
      .limit(1);

    if (!row)
      return reply
        .status(404)
        .send({ success: false, error: "Churn factors not found for this lead" });

    const activeSignals = await db
      .select()
      .from(goldChurnSignals)
      .where(
        and(
          eq(goldChurnSignals.tenantId, tenantId),
          eq(goldChurnSignals.leadId, leadId),
          eq(goldChurnSignals.isActive, true),
        ),
      )
      .orderBy(desc(goldChurnSignals.strength));

    return reply.send({
      success: true,
      data: {
        ...row.factor,
        companyName: row.companyName,
        cui: row.cui,
        activeSignals,
      },
    });
  });

  // ── POST /churn/:leadId/evaluate ──────────────────────────────────────────

  app.post("/:leadId/evaluate", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { leadId } = leadIdParamSchema.parse(req.params);
    const body = evaluateChurnSchema?.parse(req.body) ?? { force: false };

    const [company] = await db
      .select({ id: goldCompanies.id })
      .from(goldCompanies)
      .where(and(eq(goldCompanies.id, leadId), eq(goldCompanies.tenantId, tenantId)))
      .limit(1);

    if (!company) return reply.status(404).send({ success: false, error: "Lead not found" });

    const signalQueue = createQueue(QUEUES.E5_CHURN_SIGNAL_DETECT);
    const job = await signalQueue.add("evaluate-manual", {
      leadId,
      tenantId,
      force: body?.force ?? false,
      ...buildProvenanceContext(req),
    });

    e5ChurnEvaluationsTotal.inc();
    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  app.get("/sentiment", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = sentimentQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldSentimentAnalysis.tenantId, tenantId)];
    if (query.leadId) conditions.push(eq(goldSentimentAnalysis.leadId, query.leadId));
    if (query.sentimentRange) {
      if (query.sentimentRange === "POSITIVE")
        conditions.push(sql`${goldSentimentAnalysis.sentimentScore} > 0.2`);
      else if (query.sentimentRange === "NEGATIVE")
        conditions.push(sql`${goldSentimentAnalysis.sentimentScore} < -0.2`);
      else conditions.push(sql`${goldSentimentAnalysis.sentimentScore} BETWEEN -0.2 AND 0.2`);
    }

    const [rows, countResult] = await Promise.all([
      db
        .select({
          sentiment: goldSentimentAnalysis,
          companyName: goldCompanies.denumire,
        })
        .from(goldSentimentAnalysis)
        .leftJoin(goldCompanies, eq(goldSentimentAnalysis.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldSentimentAnalysis.analyzedAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldSentimentAnalysis)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({ ...r.sentiment, companyName: r.companyName })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /churn/stats ──────────────────────────────────────────────────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byRisk = await db
      .select({
        riskLevel: goldChurnFactors.riskLevel,
        count: sql<number>`count(*)::int`,
        avgScore: sql<string>`coalesce(avg(${goldChurnFactors.overallChurnScore}), 0)::text`,
      })
      .from(goldChurnFactors)
      .where(eq(goldChurnFactors.tenantId, tenantId))
      .groupBy(goldChurnFactors.riskLevel);

    const bySignalType = await db
      .select({
        signalType: goldChurnSignals.signalType,
        count: sql<number>`count(*)::int`,
        avgStrength: sql<string>`coalesce(avg(${goldChurnSignals.strength}), 0)::text`,
      })
      .from(goldChurnSignals)
      .where(and(eq(goldChurnSignals.tenantId, tenantId), eq(goldChurnSignals.isActive, true)))
      .groupBy(goldChurnSignals.signalType);

    const [sentimentOverview] = await db
      .select({
        positive: sql<number>`count(*) filter (where ${goldSentimentAnalysis.sentimentScore} > 0.2)::int`,
        neutral: sql<number>`count(*) filter (where ${goldSentimentAnalysis.sentimentScore} BETWEEN -0.2 AND 0.2)::int`,
        negative: sql<number>`count(*) filter (where ${goldSentimentAnalysis.sentimentScore} < -0.2)::int`,
      })
      .from(goldSentimentAnalysis)
      .where(eq(goldSentimentAnalysis.tenantId, tenantId));

    return reply.send({
      success: true,
      data: { byRisk, bySignalType, sentiment: sentimentOverview },
    });
  });
}
