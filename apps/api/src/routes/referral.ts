/**
 * Etapa 5 — Referral API Routes (E5 Referral GDPR + Winback)
 * Prefix registered at: /api/v1/referrals
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { alias, db, sql, eq, and, desc, goldReferrals, goldCompanies } from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e5ReferralsCreatedTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.uuid() });

const REFERRAL_TYPES = ["EXPLICIT", "SOFT_MENTION", "NEIGHBOR_STRATEGY", "GROUP_DEAL"] as const;
const REFERRAL_STATUSES = [
  "PENDING_CONSENT",
  "ACTIVE",
  "CONVERTED",
  "EXPIRED",
  "DECLINED",
] as const;

const referralsQuerySchema = z.object({
  referrerId: z.uuid().optional(),
  referredId: z.uuid().optional(),
  status: z.enum(REFERRAL_STATUSES).optional(),
  referralType: z.enum(REFERRAL_TYPES).optional(),
  consentGiven: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createReferralSchema = z.object({
  referrerId: z.uuid(),
  referredId: z.uuid().optional(),
  referralType: z.enum(REFERRAL_TYPES),
  expiresInDays: z.number().int().min(1).max(365).default(30),
  notes: z.string().max(1000).optional(),
});

const consentSchema = z.object({
  consentGiven: z.boolean(),
  proofMessageId: z.string().max(255).optional(),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function referralRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const writeLimiter = app.rateLimit({ max: 20, timeWindow: "1 minute" });

  // ── GET /referrals ─────────────────────────────────────────────────────────

  app.get("/", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = referralsQuerySchema.parse(req.query);
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
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /referrals/:id ─────────────────────────────────────────────────────

  app.get("/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const referrerGc = alias(goldCompanies, "referrer_gc_detail");
    const referredGc = alias(goldCompanies, "referred_gc_detail");

    const [row] = await db
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
      .where(and(eq(goldReferrals.id, id), eq(goldReferrals.tenantId, tenantId)))
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: "Referral not found" });

    return reply.send({
      success: true,
      data: {
        ...row.referral,
        referrerName: row.referrerName,
        referrerCui: row.referrerCui,
        referredName: row.referredName,
        referredCui: row.referredCui,
      },
    });
  });

  // ── POST /referrals ────────────────────────────────────────────────────────

  app.post("/", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createReferralSchema.parse(req.body);

    const [referrer] = await db
      .select({ id: goldCompanies.id })
      .from(goldCompanies)
      .where(and(eq(goldCompanies.id, body.referrerId), eq(goldCompanies.tenantId, tenantId)))
      .limit(1);

    if (!referrer)
      return reply.status(404).send({ success: false, error: "Referrer (goldCompany) not found" });

    const [referral] = await db
      .insert(goldReferrals)
      .values({
        tenantId,
        referrerId: body.referrerId,
        referredId: body.referredId ?? null,
        referralType: body.referralType,
        status: "PENDING_CONSENT",
        consentGiven: false,
        expiresAt: new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000),
      })
      .returning();

    const consentQueue = createQueue(QUEUES.E5_REFERRAL_CONSENT_REQUEST);
    await consentQueue.add(
      "request-consent",
      {
        referralId: referral.id,
        referrerId: body.referrerId,
        tenantId,
        notes: body.notes ?? null,
        ...buildProvenanceContext(req),
      },
      { delay: 0 },
    );

    e5ReferralsCreatedTotal.inc();
    return reply.status(201).send({ success: true, data: referral });
  });

  // ── PATCH /referrals/:id/consent ──────────────────────────────────────────

  app.patch("/:id/consent", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = consentSchema.parse(req.body);

    const [existing] = await db
      .select({ status: goldReferrals.status })
      .from(goldReferrals)
      .where(and(eq(goldReferrals.id, id), eq(goldReferrals.tenantId, tenantId)))
      .limit(1);

    if (!existing) return reply.status(404).send({ success: false, error: "Referral not found" });
    if (!["PENDING_CONSENT", "ACTIVE"].includes(existing.status)) {
      return reply.status(400).send({
        success: false,
        error: `Cannot update consent for referral in status ${existing.status}`,
      });
    }

    const newStatus = body.consentGiven ? "ACTIVE" : "DECLINED";
    const [updated] = await db
      .update(goldReferrals)
      .set({
        consentGiven: body.consentGiven,
        consentGivenAt: body.consentGiven ? new Date() : null,
        consentProofMessageId: body.proofMessageId ?? null,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(goldReferrals.id, id), eq(goldReferrals.tenantId, tenantId)))
      .returning();

    const confirmQueue = createQueue(QUEUES.E5_REFERRAL_CONSENT_CONFIRM);
    await confirmQueue.add("consent-confirmed", {
      referralId: id,
      consentGiven: body.consentGiven,
      tenantId,
      ...buildProvenanceContext(req),
    });

    return reply.send({ success: true, data: updated });
  });

  // ── POST /referrals/:id/outreach ──────────────────────────────────────────

  app.post("/:id/outreach", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [referral] = await db
      .select({
        id: goldReferrals.id,
        status: goldReferrals.status,
        consentGiven: goldReferrals.consentGiven,
      })
      .from(goldReferrals)
      .where(and(eq(goldReferrals.id, id), eq(goldReferrals.tenantId, tenantId)))
      .limit(1);

    if (!referral) return reply.status(404).send({ success: false, error: "Referral not found" });
    if (!referral.consentGiven) {
      return reply.status(400).send({
        success: false,
        error: "Cannot initiate outreach without GDPR consent (Art.7)",
      });
    }
    if (referral.status !== "ACTIVE") {
      return reply.status(400).send({
        success: false,
        error: `Outreach requires ACTIVE status. Current: ${referral.status}`,
      });
    }

    const outreachQueue = createQueue(QUEUES.E5_REFERRAL_OUTREACH_PROSPECT);
    const job = await outreachQueue.add("outreach", {
      referralId: id,
      tenantId,
      ...buildProvenanceContext(req),
    });

    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  // ── GET /referrals/stats ──────────────────────────────────────────────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byStatus = await db
      .select({
        status: goldReferrals.status,
        count: sql<number>`count(*)::int`,
      })
      .from(goldReferrals)
      .where(eq(goldReferrals.tenantId, tenantId))
      .groupBy(goldReferrals.status);

    const byType = await db
      .select({
        referralType: goldReferrals.referralType,
        count: sql<number>`count(*)::int`,
        converted: sql<number>`count(*) filter (where ${goldReferrals.status} = 'CONVERTED')::int`,
      })
      .from(goldReferrals)
      .where(eq(goldReferrals.tenantId, tenantId))
      .groupBy(goldReferrals.referralType);

    const [consentStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        withConsent: sql<number>`count(*) filter (where ${goldReferrals.consentGiven} = true)::int`,
      })
      .from(goldReferrals)
      .where(eq(goldReferrals.tenantId, tenantId));

    return reply.send({
      success: true,
      data: { byStatus, byType, consent: consentStats },
    });
  });
}
