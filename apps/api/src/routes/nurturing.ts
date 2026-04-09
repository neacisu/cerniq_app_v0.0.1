/**
 * Etapa 5 — Nurturing API Routes (E5 Nurturing Lifecycle FSM)
 * Prefix registered at: /api/v1/nurturing
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  alias,
  db,
  sql,
  eq,
  and,
  desc,
  asc,
  gte,
  goldNurturingState,
  goldNurturingActions,
  goldContentDrips,
  goldNpsSurveys,
  goldCompanies,
  goldReferrals,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e5NpsRequestsTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.uuid() });
const leadIdParamSchema = z.object({ leadId: z.uuid() });

const NURTURING_STATES = [
  "ONBOARDING",
  "NURTURING_ACTIVE",
  "AT_RISK",
  "CHURNED",
  "REACTIVATED",
  "LOYAL_CLIENT",
  "ADVOCATE",
] as const;

const nurturingStatesQuerySchema = z.object({
  currentState: z.enum(NURTURING_STATES).optional(),
  churnRiskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  isAdvocate: z.coerce.boolean().optional(),
  isKol: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const actionsQuerySchema = z.object({
  actionType: z.string().max(100).optional(),
  status: z.enum(["PENDING", "SENT", "DELIVERED", "FAILED", "SKIPPED"]).optional(),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "PHONE", "IN_APP"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createDripSchema = z.object({
  name: z.string().min(1).max(255),
  targetStates: z.array(z.enum(NURTURING_STATES)).min(1),
  daysAfterTrigger: z.number().int().min(0).max(365),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "PHONE", "IN_APP"]),
  templateId: z.string().min(1).max(255),
  isActive: z.boolean().default(true),
});

const sendNpsSchema = z.object({
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS", "IN_APP"]),
  force: z.boolean().default(false),
});

const npsQuerySchema = z.object({
  leadId: z.uuid().optional(),
  responded: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const REFERRAL_TYPES_NS = ["EXPLICIT", "SOFT_MENTION", "NEIGHBOR_STRATEGY", "GROUP_DEAL"] as const;
const REFERRAL_STATUSES_NS = [
  "PENDING_CONSENT",
  "ACTIVE",
  "CONVERTED",
  "EXPIRED",
  "DECLINED",
] as const;

const churnRisksQuerySchema = z.object({
  threshold: z.coerce.number().int().min(0).max(100).default(70),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const nurturingReferralsQuerySchema = z.object({
  referrerId: z.uuid().optional(),
  referredId: z.uuid().optional(),
  status: z.enum(REFERRAL_STATUSES_NS).optional(),
  referralType: z.enum(REFERRAL_TYPES_NS).optional(),
  consentGiven: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function nurturingRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const writeLimiter = app.rateLimit({ max: 30, timeWindow: "1 minute" });

  // ── GET /nurturing/churn-risks (Plan E5 — alias: lead-uri cu scor churn ≥ prag) ─

  app.get("/churn-risks", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = churnRisksQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [
      eq(goldNurturingState.tenantId, tenantId),
      gte(goldNurturingState.churnRiskScore, query.threshold),
    ];

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
        ...r.state,
        companyName: r.companyName,
        cui: r.cui,
        judet: r.judet,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
        threshold: query.threshold,
        aliasOf:
          "GET /api/v1/nurturing/states + filter churnRiskScore (see also /api/v1/churn/factors)",
      },
    });
  });

  // ── GET /nurturing/referrals (Plan E5 — același contract ca /api/v1/referrals) ─

  app.get("/referrals", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = nurturingReferralsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldReferrals.tenantId, tenantId)];
    if (query.referrerId) conditions.push(eq(goldReferrals.referrerId, query.referrerId));
    if (query.referredId) conditions.push(eq(goldReferrals.referredId, query.referredId));
    if (query.status) conditions.push(eq(goldReferrals.status, query.status));
    if (query.referralType) conditions.push(eq(goldReferrals.referralType, query.referralType));
    if (query.consentGiven !== undefined)
      conditions.push(eq(goldReferrals.consentGiven, query.consentGiven));

    const referrerGc = alias(goldCompanies, "referrer_gc");
    const referredGc = alias(goldCompanies, "referred_gc");

    const [rows, countResult] = await Promise.all([
      db
        .select({
          referral: goldReferrals,
          referrerName: referrerGc.denumire,
          referrerCui: referrerGc.cui,
          referredName: referredGc.denumire,
          referredCui: referredGc.cui,
        })
        .from(goldReferrals)
        .leftJoin(referrerGc, eq(goldReferrals.referrerId, referrerGc.id))
        .leftJoin(referredGc, eq(goldReferrals.referredId, referredGc.id))
        .where(and(...conditions))
        .orderBy(desc(goldReferrals.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldReferrals)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({
        ...r.referral,
        referrerName: r.referrerName,
        referrerCui: r.referrerCui,
        referredName: r.referredName,
        referredCui: r.referredCui,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
        aliasOf: "GET /api/v1/referrals",
      },
    });
  });

  // ── GET /nurturing/states ──────────────────────────────────────────────────

  app.get("/states", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = nurturingStatesQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldNurturingState.tenantId, tenantId)];
    if (query.currentState)
      conditions.push(eq(goldNurturingState.currentState, query.currentState));
    if (query.churnRiskLevel)
      conditions.push(eq(goldNurturingState.churnRiskLevel, query.churnRiskLevel));
    if (query.isAdvocate !== undefined)
      conditions.push(eq(goldNurturingState.isAdvocate, query.isAdvocate));
    if (query.isKol !== undefined) conditions.push(eq(goldNurturingState.isKol, query.isKol));

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
        .orderBy(desc(goldNurturingState.updatedAt))
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
        ...r.state,
        companyName: r.companyName,
        cui: r.cui,
        judet: r.judet,
      })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /nurturing/states/:leadId ──────────────────────────────────────────

  app.get("/states/:leadId", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { leadId } = leadIdParamSchema.parse(req.params);

    const [row] = await db
      .select({
        state: goldNurturingState,
        companyName: goldCompanies.denumire,
        cui: goldCompanies.cui,
      })
      .from(goldNurturingState)
      .leftJoin(goldCompanies, eq(goldNurturingState.leadId, goldCompanies.id))
      .where(and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, leadId)))
      .limit(1);

    if (!row)
      return reply
        .status(404)
        .send({ success: false, error: "Nurturing state not found for this lead" });

    const recentActions = await db
      .select()
      .from(goldNurturingActions)
      .where(eq(goldNurturingActions.nurturingStateId, row.state.id))
      .orderBy(desc(goldNurturingActions.createdAt))
      .limit(10);

    return reply.send({
      success: true,
      data: {
        ...row.state,
        companyName: row.companyName,
        cui: row.cui,
        recentActions,
      },
    });
  });

  // ── POST /nurturing/states/:leadId/evaluate ────────────────────────────────

  app.post(
    "/states/:leadId/evaluate",
    { ...authOpts, preHandler: [writeLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { leadId } = leadIdParamSchema.parse(req.params);

      const [company] = await db
        .select({ id: goldCompanies.id })
        .from(goldCompanies)
        .where(and(eq(goldCompanies.id, leadId), eq(goldCompanies.tenantId, tenantId)))
        .limit(1);

      if (!company) return reply.status(404).send({ success: false, error: "Lead not found" });

      const evaluateQueue = createQueue(QUEUES.E5_LIFECYCLE_STATE_EVALUATE);
      const job = await evaluateQueue.add("evaluate-manual", {
        leadId,
        tenantId,
        ...buildProvenanceContext(req),
      });

      return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
    },
  );

  // ── GET /nurturing/actions ────────────────────────────────────────────────

  app.get("/actions", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = actionsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldNurturingActions.tenantId, tenantId)];
    if (query.actionType) conditions.push(eq(goldNurturingActions.actionType, query.actionType));
    if (query.status) conditions.push(eq(goldNurturingActions.status, query.status));
    if (query.channel) conditions.push(eq(goldNurturingActions.channel, query.channel));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(goldNurturingActions)
        .where(and(...conditions))
        .orderBy(desc(goldNurturingActions.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldNurturingActions)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /nurturing/drips ──────────────────────────────────────────────────

  app.get("/drips", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z.object({ isActive: z.coerce.boolean().optional() }).parse(req.query);

    const conditions = [eq(goldContentDrips.tenantId, tenantId)];
    if (query.isActive !== undefined)
      conditions.push(eq(goldContentDrips.isActive, query.isActive));

    const drips = await db
      .select()
      .from(goldContentDrips)
      .where(and(...conditions))
      .orderBy(asc(goldContentDrips.daysAfterTrigger));

    const total = drips.length;
    return reply.send({
      success: true,
      data: drips,
      meta: { page: 1, limit: Math.max(total, 1), total, pages: 1 },
    });
  });

  // ── POST /nurturing/drips ──────────────────────────────────────────────────

  app.post("/drips", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createDripSchema.parse(req.body);
    const provenance = buildProvenanceContext(req);

    const [drip] = await db
      .insert(goldContentDrips)
      .values({
        tenantId,
        name: body.name,
        targetStates: body.targetStates,
        daysAfterTrigger: body.daysAfterTrigger,
        channel: body.channel,
        templateId: body.templateId,
        isActive: body.isActive,
      })
      .returning();

    req.log.info({ provenance, dripId: drip.id }, "nurturing-drip:created");
    return reply.status(201).send({ success: true, data: drip });
  });

  // ── PATCH /nurturing/drips/:id ────────────────────────────────────────────

  app.patch("/drips/:id", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z
      .object({ isActive: z.boolean().optional(), name: z.string().max(255).optional() })
      .parse(req.body);

    const [updated] = await db
      .update(goldContentDrips)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(goldContentDrips.id, id), eq(goldContentDrips.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Drip not found" });
    req.log.info({ provenance: buildProvenanceContext(req), dripId: id }, "nurturing-drip:updated");
    return reply.send({ success: true, data: updated });
  });

  app.get("/nps", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = npsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldNpsSurveys.tenantId, tenantId)];
    if (query.leadId) conditions.push(eq(goldNpsSurveys.leadId, query.leadId));
    if (query.responded === true) conditions.push(sql`${goldNpsSurveys.respondedAt} IS NOT NULL`);
    if (query.responded === false) conditions.push(sql`${goldNpsSurveys.respondedAt} IS NULL`);

    const [rows, countResult] = await Promise.all([
      db
        .select({
          survey: goldNpsSurveys,
          companyName: goldCompanies.denumire,
        })
        .from(goldNpsSurveys)
        .leftJoin(goldCompanies, eq(goldNpsSurveys.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldNpsSurveys.sentAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldNpsSurveys)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({ ...r.survey, companyName: r.companyName })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── POST /nurturing/nps/:leadId/send ──────────────────────────────────────

  app.post("/nps/:leadId/send", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { leadId } = leadIdParamSchema.parse(req.params);
    const body = sendNpsSchema.parse(req.body);

    const [company] = await db
      .select({ id: goldCompanies.id })
      .from(goldCompanies)
      .where(and(eq(goldCompanies.id, leadId), eq(goldCompanies.tenantId, tenantId)))
      .limit(1);

    if (!company) return reply.status(404).send({ success: false, error: "Lead not found" });

    if (!body.force) {
      const [lastSurvey] = await db
        .select({ cooldownUntil: goldNpsSurveys.cooldownUntil })
        .from(goldNpsSurveys)
        .where(and(eq(goldNpsSurveys.tenantId, tenantId), eq(goldNpsSurveys.leadId, leadId)))
        .orderBy(desc(goldNpsSurveys.sentAt))
        .limit(1);

      if (lastSurvey && new Date(lastSurvey.cooldownUntil) > new Date()) {
        return reply.status(400).send({
          success: false,
          error: "NPS cooldown active — use force:true to override",
          meta: { cooldownUntil: lastSurvey.cooldownUntil },
        });
      }
    }

    const npsQueue = createQueue(QUEUES.E5_FEEDBACK_NPS_SEND);
    const job = await npsQueue.add("send-nps", {
      leadId,
      tenantId,
      channel: body.channel,
      ...buildProvenanceContext(req),
    });

    e5NpsRequestsTotal.inc();
    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  // ── GET /nurturing/stats ──────────────────────────────────────────────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byState = await db
      .select({
        currentState: goldNurturingState.currentState,
        count: sql<number>`count(*)::int`,
        avgChurnScore: sql<string>`coalesce(avg(${goldNurturingState.churnRiskScore}), 0)::text`,
        avgRevenue: sql<string>`coalesce(avg(${goldNurturingState.totalRevenue}), 0)::text`,
      })
      .from(goldNurturingState)
      .where(eq(goldNurturingState.tenantId, tenantId))
      .groupBy(goldNurturingState.currentState);

    const [npsStats] = await db
      .select({
        totalSent: sql<number>`count(*)::int`,
        responded: sql<number>`count(*) filter (where ${goldNpsSurveys.respondedAt} is not null)::int`,
        avgScore: sql<string>`coalesce(avg(${goldNpsSurveys.score}) filter (where ${goldNpsSurveys.score} is not null), 0)::text`,
      })
      .from(goldNpsSurveys)
      .where(eq(goldNpsSurveys.tenantId, tenantId));

    return reply.send({
      success: true,
      data: { byState, nps: npsStats },
    });
  });
}
