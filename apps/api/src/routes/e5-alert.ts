/**
 * Etapa 5 — Alert API Routes (E5 Weather/APIA Alerts + Compliance GDPR)
 * Prefix registered at: /api/v1/e5/alerts
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { db, sql, eq, and, desc, goldNurturingState, goldCompanies } from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireRole } from "../middleware/authz.js";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e5AlertsTriggeredTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const weatherTriggerSchema = z.object({
  county: z.string().max(100).optional(),
  alertType: z.string().max(100).optional(),
  force: z.boolean().default(false),
});

const apiaSeasonalSchema = z.object({
  season: z.enum(["SPRING", "SUMMER", "AUTUMN", "WINTER"]).optional(),
  county: z.string().max(100).optional(),
});

const campaignTriggerSchema = z.object({
  targetState: z
    .enum([
      "ONBOARDING",
      "NURTURING_ACTIVE",
      "AT_RISK",
      "CHURNED",
      "REACTIVATED",
      "LOYAL_CLIENT",
      "ADVOCATE",
    ])
    .optional(),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "IN_APP"]).optional(),
  templateId: z.string().max(255).optional(),
  leadIds: z.array(z.uuid()).max(500).optional(),
});

const complianceCheckSchema = z.object({
  checkType: z.enum(["GDPR_CONSENT", "COMPETITION_LAW", "DATA_RETENTION"]),
  leadId: z.uuid().optional(),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function e5AlertRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  const writeLimiter = app.rateLimit({ max: 10, timeWindow: "1 minute" });

  // ── GET /e5/alerts (dashboard — clienți la risc cu alertă activă) ─────────

  app.get("/", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({
        riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [
      eq(goldNurturingState.tenantId, tenantId),
      sql`${goldNurturingState.currentState} IN ('AT_RISK', 'CHURNED')`,
    ];
    if (query.riskLevel) conditions.push(eq(goldNurturingState.churnRiskLevel, query.riskLevel));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          state: goldNurturingState,
          companyName: goldCompanies.denumire,
          cui: goldCompanies.cui,
          judet: goldCompanies.judet,
        })
        .from(goldNurturingState)
        .leftJoin(goldCompanies, eq(goldNurturingState.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldNurturingState.churnRiskScore))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldNurturingState)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({
        leadId: r.state.leadId,
        currentState: r.state.currentState,
        churnRiskScore: r.state.churnRiskScore,
        churnRiskLevel: r.state.churnRiskLevel,
        daysSinceLastOrder: r.state.daysSinceLastOrder,
        companyName: r.companyName,
        cui: r.cui,
        judet: r.judet,
      })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── POST /e5/alerts/weather/trigger (admin) ────────────────────────────────

  app.post("/weather/trigger", { ...adminAuth, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = weatherTriggerSchema.parse(req.body);

    const monitorQueue = createQueue(QUEUES.E5_ALERT_WEATHER_MONITOR);
    const job = await monitorQueue.add("monitor-trigger", {
      tenantId,
      county: body.county ?? null,
      alertType: body.alertType ?? null,
      force: body.force,
      ...buildProvenanceContext(req),
    });

    e5AlertsTriggeredTotal.inc({ type: "weather" });
    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  // ── POST /e5/alerts/apia/trigger (admin) ──────────────────────────────────

  app.post("/apia/trigger", { ...adminAuth, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = apiaSeasonalSchema.parse(req.body);

    const apiaQueue = createQueue(QUEUES.E5_ALERT_APIA_SEASONAL);
    const job = await apiaQueue.add("apia-trigger", {
      tenantId,
      season: body.season ?? null,
      county: body.county ?? null,
      ...buildProvenanceContext(req),
    });

    e5AlertsTriggeredTotal.inc({ type: "apia" });
    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  // ── POST /e5/alerts/campaign/trigger ─────────────────────────────────────

  app.post("/campaign/trigger", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = campaignTriggerSchema.parse(req.body);

    const campaignQueue = createQueue(QUEUES.E5_ALERT_CAMPAIGN_TRIGGER);
    const job = await campaignQueue.add("campaign-trigger", {
      tenantId,
      targetState: body.targetState ?? null,
      channel: body.channel ?? null,
      templateId: body.templateId ?? null,
      leadIds: body.leadIds ?? null,
      ...buildProvenanceContext(req),
    });

    e5AlertsTriggeredTotal.inc({ type: "campaign" });
    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  // ── POST /e5/alerts/compliance/check ─────────────────────────────────────

  app.post(
    "/compliance/check",
    { ...adminAuth, preHandler: [writeLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const body = complianceCheckSchema.parse(req.body);

      let queueName: string;
      switch (body.checkType) {
        case "GDPR_CONSENT":
          queueName = QUEUES.E5_COMPLIANCE_GDPR_CHECK;
          break;
        case "COMPETITION_LAW":
          queueName = QUEUES.E5_COMPLIANCE_COMPETITION_LAW;
          break;
        case "DATA_RETENTION":
          queueName = QUEUES.E5_COMPLIANCE_DATA_RETENTION;
          break;
      }

      const complianceQueue = createQueue(queueName);
      const job = await complianceQueue.add("compliance-check", {
        tenantId,
        checkType: body.checkType,
        leadId: body.leadId ?? null,
        ...buildProvenanceContext(req),
      });

      e5AlertsTriggeredTotal.inc({ type: "compliance" });
      return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
    },
  );

  // ── GET /e5/alerts/compliance/stats ───────────────────────────────────────

  app.get("/compliance/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const atRisk = await db
      .select({
        riskLevel: goldNurturingState.churnRiskLevel,
        count: sql<number>`count(*)::int`,
      })
      .from(goldNurturingState)
      .where(eq(goldNurturingState.tenantId, tenantId))
      .groupBy(goldNurturingState.churnRiskLevel);

    const [stateStats] = await db
      .select({
        atRiskCount: sql<number>`count(*) filter (where ${goldNurturingState.currentState} = 'AT_RISK')::int`,
        churnedCount: sql<number>`count(*) filter (where ${goldNurturingState.currentState} = 'CHURNED')::int`,
        criticalCount: sql<number>`count(*) filter (where ${goldNurturingState.churnRiskLevel} = 'CRITICAL')::int`,
      })
      .from(goldNurturingState)
      .where(eq(goldNurturingState.tenantId, tenantId));

    return reply.send({
      success: true,
      data: { byRiskLevel: atRisk, summary: stateStats },
    });
  });

  // ── GET /e5/alerts/weather/status ─────────────────────────────────────────

  app.get("/weather/status", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const atRiskInAgricultural = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(goldNurturingState)
      .leftJoin(goldCompanies, eq(goldNurturingState.leadId, goldCompanies.id))
      .where(
        and(
          eq(goldNurturingState.tenantId, tenantId),
          sql`${goldNurturingState.currentState} IN ('NURTURING_ACTIVE', 'AT_RISK', 'LOYAL_CLIENT')`,
        ),
      );

    return reply.send({
      success: true,
      data: {
        eligibleClientsForWeatherAlerts: atRiskInAgricultural[0]?.count ?? 0,
        note: "Triggers E5_ALERT_WEATHER_MONITOR + E5_ALERT_WEATHER_MATCH pipeline",
      },
    });
  });
}
