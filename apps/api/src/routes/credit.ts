/**
 * Etapa 4 — Credit API Routes (E4 Post-Sale: Credit Scoring 100p)
 * Prefix registered at: /api/v1/credit
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  goldCreditProfiles,
  goldCreditScores,
  goldCreditReservations,
  goldCompanies,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireRole } from "../middleware/authz.js";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e4CreditEvaluationsTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const clientIdParamSchema = z.object({ clientId: z.uuid() });
const idParamSchema = z.object({ id: z.uuid() });

const creditProfilesQuerySchema = z.object({
  riskTier: z.enum(["BLOCKED", "LOW", "MEDIUM", "HIGH", "PREMIUM"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const evaluateCreditSchema = z
  .object({
    force: z.boolean().default(false),
  })
  .optional();

const reservationsQuerySchema = z.object({
  status: z.enum(["ACTIVE", "USED", "RELEASED", "EXPIRED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function creditRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  const writeLimiter = app.rateLimit({ max: 10, timeWindow: "1 minute" });

  // ── GET /credit/profiles ────────────────────────────────────────────────────

  app.get("/profiles", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = creditProfilesQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldCreditProfiles.tenantId, tenantId)];
    if (query.riskTier) conditions.push(eq(goldCreditProfiles.riskTier, query.riskTier));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          profile: goldCreditProfiles,
          companyName: goldCompanies.denumire,
          cui: goldCompanies.cui,
        })
        .from(goldCreditProfiles)
        .leftJoin(goldCompanies, eq(goldCreditProfiles.clientId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldCreditProfiles.updatedAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldCreditProfiles)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({ ...r.profile, companyName: r.companyName, cui: r.cui })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  });

  // ── GET /credit/profiles/:clientId ─────────────────────────────────────────

  app.get("/profiles/:clientId", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { clientId } = clientIdParamSchema.parse(req.params);

    const [row] = await db
      .select({
        profile: goldCreditProfiles,
        companyName: goldCompanies.denumire,
        cui: goldCompanies.cui,
        judet: goldCompanies.judet,
      })
      .from(goldCreditProfiles)
      .leftJoin(goldCompanies, eq(goldCreditProfiles.clientId, goldCompanies.id))
      .where(
        and(eq(goldCreditProfiles.tenantId, tenantId), eq(goldCreditProfiles.clientId, clientId)),
      )
      .limit(1);

    if (!row) {
      const [company] = await db
        .select({ id: goldCompanies.id })
        .from(goldCompanies)
        .where(and(eq(goldCompanies.id, clientId), eq(goldCompanies.tenantId, tenantId)))
        .limit(1);

      if (!company) return reply.status(404).send({ success: false, error: "Client not found" });

      return reply.status(404).send({
        success: false,
        error: "Credit profile not yet created for this client",
        meta: { clientId },
      });
    }

    const activeReservations = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${goldCreditReservations.amount}), 0)::text`,
      })
      .from(goldCreditReservations)
      .where(
        and(
          eq(goldCreditReservations.profileId, row.profile.id),
          eq(goldCreditReservations.status, "ACTIVE"),
        ),
      );

    return reply.send({
      success: true,
      data: {
        ...row.profile,
        companyName: row.companyName,
        cui: row.cui,
        judet: row.judet,
        activeReservations: activeReservations[0] ?? { count: 0, total: "0" },
        availableCredit: String(Number(row.profile.creditLimit) - Number(row.profile.creditUsed)),
      },
    });
  });

  // ── POST /credit/profiles/:clientId/evaluate ─────────────────────────────

  app.post(
    "/profiles/:clientId/evaluate",
    { ...authOpts, preHandler: [writeLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { clientId } = clientIdParamSchema.parse(req.params);
      const body = evaluateCreditSchema?.parse(req.body) ?? { force: false };

      const [company] = await db
        .select({ id: goldCompanies.id })
        .from(goldCompanies)
        .where(and(eq(goldCompanies.id, clientId), eq(goldCompanies.tenantId, tenantId)))
        .limit(1);

      if (!company) return reply.status(404).send({ success: false, error: "Client not found" });

      const profileQueue = createQueue(QUEUES.E4_CREDIT_PROFILE_CREATE);
      const job = await profileQueue.add("evaluate", {
        clientId,
        tenantId,
        force: body?.force ?? false,
        ...buildProvenanceContext(req),
      });

      e4CreditEvaluationsTotal.inc();
      return reply.send({
        success: true,
        data: { jobId: job.id ?? "queued", status: "PROCESSING" },
      });
    },
  );

  // ── GET /credit/profiles/:clientId/history ────────────────────────────────

  app.get("/profiles/:clientId/history", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { clientId } = clientIdParamSchema.parse(req.params);
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);

    const [profile] = await db
      .select({ id: goldCreditProfiles.id })
      .from(goldCreditProfiles)
      .where(
        and(eq(goldCreditProfiles.tenantId, tenantId), eq(goldCreditProfiles.clientId, clientId)),
      )
      .limit(1);

    if (!profile)
      return reply.status(404).send({ success: false, error: "Credit profile not found" });

    const history = await db
      .select()
      .from(goldCreditScores)
      .where(eq(goldCreditScores.profileId, profile.id))
      .orderBy(desc(goldCreditScores.calculatedAt))
      .limit(query.limit);

    return reply.send({ success: true, data: history });
  });

  // ── GET /credit/reservations ───────────────────────────────────────────────

  app.get("/reservations", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = reservationsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldCreditProfiles.tenantId, tenantId)];
    if (query.status) conditions.push(eq(goldCreditReservations.status, query.status));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          reservation: goldCreditReservations,
          clientId: goldCreditProfiles.clientId,
          creditScore: goldCreditProfiles.creditScore,
          riskTier: goldCreditProfiles.riskTier,
        })
        .from(goldCreditReservations)
        .innerJoin(goldCreditProfiles, eq(goldCreditReservations.profileId, goldCreditProfiles.id))
        .where(and(...conditions))
        .orderBy(desc(goldCreditReservations.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldCreditReservations)
        .innerJoin(goldCreditProfiles, eq(goldCreditReservations.profileId, goldCreditProfiles.id))
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({
        ...r.reservation,
        clientId: r.clientId,
        creditScore: r.creditScore,
        riskTier: r.riskTier,
      })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /credit/stats ──────────────────────────────────────────────────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byRisk = await db
      .select({
        riskTier: goldCreditProfiles.riskTier,
        count: sql<number>`count(*)::int`,
        totalLimit: sql<string>`coalesce(sum(${goldCreditProfiles.creditLimit}), 0)::text`,
        totalUsed: sql<string>`coalesce(sum(${goldCreditProfiles.creditUsed}), 0)::text`,
      })
      .from(goldCreditProfiles)
      .where(eq(goldCreditProfiles.tenantId, tenantId))
      .groupBy(goldCreditProfiles.riskTier);

    const [avgScore] = await db
      .select({
        avg: sql<string>`coalesce(avg(${goldCreditProfiles.creditScore}), 0)::text`,
        min: sql<number>`coalesce(min(${goldCreditProfiles.creditScore}), 0)::int`,
        max: sql<number>`coalesce(max(${goldCreditProfiles.creditScore}), 0)::int`,
      })
      .from(goldCreditProfiles)
      .where(eq(goldCreditProfiles.tenantId, tenantId));

    return reply.send({
      success: true,
      data: { byRisk, scoreStats: avgScore },
    });
  });

  // ── POST /credit/refresh-all (admin CRON trigger) ─────────────────────────

  app.post("/refresh-all", { ...adminAuth, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const refreshQueue = createQueue(QUEUES.E4_CREDIT_REFRESH_ALL);
    const job = await refreshQueue.add("refresh-all-manual", {
      tenantId,
      ...buildProvenanceContext(req),
    });

    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  // ── GET /credit/reservations/:id/release (admin) ─────────────────────────

  app.post(
    "/reservations/:id/release",
    { ...adminAuth, preHandler: [writeLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);

      const [reservation] = await db
        .select({
          id: goldCreditReservations.id,
          status: goldCreditReservations.status,
        })
        .from(goldCreditReservations)
        .innerJoin(goldCreditProfiles, eq(goldCreditReservations.profileId, goldCreditProfiles.id))
        .where(and(eq(goldCreditReservations.id, id), eq(goldCreditProfiles.tenantId, tenantId)))
        .limit(1);

      if (!reservation)
        return reply.status(404).send({ success: false, error: "Reservation not found" });
      if (reservation.status !== "ACTIVE")
        return reply
          .status(400)
          .send({ success: false, error: "Only ACTIVE reservations can be released" });

      const releaseQueue = createQueue(QUEUES.E4_CREDIT_LIMIT_RELEASE);
      await releaseQueue.add("manual-release", {
        reservationId: id,
        tenantId,
        ...buildProvenanceContext(req),
      });

      return reply.send({ success: true, data: { queued: true } });
    },
  );
}
