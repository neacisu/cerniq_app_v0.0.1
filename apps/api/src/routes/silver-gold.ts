import type { FastifyInstance, FastifyRequest } from "fastify";
import { Queue } from "bullmq";
import {
  db,
  goldCompanies,
  goldLeadJourney,
  silverCompanies,
  silverDedupCandidates,
  silverEnrichmentLog,
  sql,
  and,
  desc,
  eq,
} from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";
import { z } from "zod";
import { getActorId, parseLimit, parseOffset, requireTenantId } from "./utils.js";
import {
  assignLeadSchema,
  dedupDecisionSchema,
  listGoldCompaniesSchema,
  listSilverCompaniesSchema,
  triggerEnrichmentSchema,
  triggerPromotionSchema,
  updateLeadStateSchema,
} from "../schemas/etapa1.js";

const goldStateSchema = z.enum([
  "COLD",
  "CONTACTED_WA",
  "CONTACTED_EMAIL",
  "CONTACTED_PHONE",
  "WARM_REPLY",
  "ENGAGED",
  "NEGOTIATION",
  "PROPOSAL",
  "CLOSING",
  "CONVERTED",
  "CHURNED",
  "DEAD",
  "DO_NOT_CONTACT",
]);
const idParamsSchema = z.object({ id: z.string().uuid() });
const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});
const successListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.record(z.string(), z.unknown())),
  meta: z
    .object({
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      offset: z.number().int().nonnegative(),
    })
    .optional(),
});
const successObjectResponseSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
});
const queuedResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ id: z.string().uuid(), queued: z.boolean() }),
});

export async function silverGoldRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  app.get(
    "/silver/companies",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-silver"],
        summary: "List silver companies",
        querystring: listSilverCompaniesSchema,
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = listSilverCompaniesSchema.safeParse(request.query);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: parsed.error.issues });
      const q = parsed.data;

      const conditions = [sql`${silverCompanies.tenantId} = ${tenantId}`];
      if (q.enrichmentStatus)
        conditions.push(sql`${silverCompanies.enrichmentStatus} = ${q.enrichmentStatus}`);
      if (q.promotionStatus)
        conditions.push(sql`${silverCompanies.promotionStatus} = ${q.promotionStatus}`);
      if (q.statusFirma) conditions.push(sql`${silverCompanies.statusFirma} = ${q.statusFirma}`);
      if (q.judet) conditions.push(sql`${silverCompanies.judet} ILIKE ${`%${q.judet}%`}`);
      if (q.search) {
        conditions.push(
          sql`(COALESCE(${silverCompanies.cui},'') ILIKE ${`%${q.search}%`} OR COALESCE(${silverCompanies.denumire},'') ILIKE ${`%${q.search}%`} OR similarity(COALESCE(${silverCompanies.denumire},''), ${q.search}) > 0.25)`,
        );
      }
      if (typeof q.minQuality === "number")
        conditions.push(
          sql`COALESCE(${silverCompanies.totalQualityScore},0)::numeric >= ${q.minQuality}`,
        );
      if (typeof q.maxQuality === "number")
        conditions.push(
          sql`COALESCE(${silverCompanies.totalQualityScore},100)::numeric <= ${q.maxQuality}`,
        );

      const whereSql = sql.join(conditions, sql` AND `);
      const sortColumn =
        q.sortBy === "totalQualityScore"
          ? silverCompanies.totalQualityScore
          : q.sortBy === "createdAt"
            ? silverCompanies.createdAt
            : silverCompanies.updatedAt;
      const sortOrder = q.sortDir === "asc" ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`;
      const searchRankOrder = q.search
        ? sql`GREATEST(
          similarity(COALESCE(${silverCompanies.denumire}, ''), ${q.search}),
          similarity(COALESCE(${silverCompanies.cui}, ''), ${q.search})
        ) DESC`
        : null;
      const limit = parseLimit(q.limit, 25);
      const offset = parseOffset(q.offset, 0);

      const [rows, total] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        const resultRows = await tx.query.silverCompanies.findMany({
          where: whereSql,
          orderBy: () => (searchRankOrder ? [searchRankOrder, sortOrder] : [sortOrder]),
          limit,
          offset,
        });
        const [countRow] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(silverCompanies)
          .where(whereSql);
        return [resultRows, Number(countRow?.total ?? 0)] as const;
      });
      return { success: true, data: rows, meta: { total, limit, offset } };
    },
  );

  app.get(
    "/silver/companies/:id",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-silver"],
        summary: "Get silver company detail",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const [row, enrichmentLogs] = await Promise.all([
        db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
        }),
        db.query.silverEnrichmentLog.findMany({
          where: (t) => sql`${t.tenantId} = ${tenantId} AND ${t.entityId} = ${params.data.id}`,
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 100,
        }),
      ]);
      if (!row) return reply.code(404).send({ success: false, error: "Silver company not found" });
      return { success: true, data: { ...row, enrichmentLogs } };
    },
  );

  app.post(
    "/silver/companies/:id/enrich",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-silver"],
        summary: "Trigger silver enrichment",
        params: idParamsSchema,
        body: triggerEnrichmentSchema,
        response: {
          200: queuedResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      const body = triggerEnrichmentSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ success: false, error: "Request invalid" });
      }

      const company = await db.query.silverCompanies.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
      });
      if (!company)
        return reply.code(404).send({ success: false, error: "Silver company not found" });

      const connection = getRedisConnectionOptions();
      const prefix = getQueuePrefix();
      const queue = new Queue("pipeline:orchestrate", { connection, prefix });
      await queue.add("orchestrate", {
        tenantId,
        companyId: company.id,
        stage: "post_validation",
        force: body.data.force,
        sources: body.data.sources,
        correlationId: `api-enrich-${company.id}`,
      });
      await queue.close();

      await db
        .update(silverCompanies)
        .set({ enrichmentStatus: "in_progress", updatedAt: new Date() })
        .where(sql`${silverCompanies.id} = ${company.id}`);

      return { success: true, data: { id: company.id, queued: true } };
    },
  );

  app.post(
    "/silver/companies/:id/promote",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-silver"],
        summary: "Trigger silver to gold promotion",
        params: idParamsSchema,
        body: triggerPromotionSchema,
        response: {
          200: queuedResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      const body = triggerPromotionSchema.safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        return reply.code(400).send({ success: false, error: "Request invalid" });
      }
      const company = await db.query.silverCompanies.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
      });
      if (!company)
        return reply.code(404).send({ success: false, error: "Silver company not found" });

      const connection = getRedisConnectionOptions();
      const prefix = getQueuePrefix();
      const queue = new Queue("pipeline:promote-to-gold", { connection, prefix });
      await queue.add("promote", {
        tenantId,
        companyId: params.data.id,
        force: body.data.force,
        correlationId: `api-promote-${params.data.id}`,
      });
      await queue.close();
      return { success: true, data: { id: params.data.id, queued: true } };
    },
  );

  app.get(
    "/silver/enrichment-log",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-silver"],
        summary: "List silver enrichment log entries",
        querystring: z.object({
          entityId: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const query = z
        .object({
          entityId: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        })
        .safeParse(request.query);
      if (!query.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: query.error.issues });
      const limit = parseLimit(query.data.limit, 50, 200);
      const offset = parseOffset(query.data.offset, 0);
      const whereSql = query.data.entityId
        ? sql`tenant_id = ${tenantId} AND entity_id = ${query.data.entityId}`
        : sql`tenant_id = ${tenantId}`;
      const rows = await db.query.silverEnrichmentLog.findMany({
        where: (t) =>
          query.data.entityId
            ? sql`${t.tenantId} = ${tenantId} AND ${t.entityId} = ${query.data.entityId}`
            : sql`${t.tenantId} = ${tenantId}`,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit,
        offset,
      });
      const [countRow] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(silverEnrichmentLog)
        .where(whereSql);
      return {
        success: true,
        data: rows,
        meta: { total: Number(countRow?.total ?? 0), limit, offset },
      };
    },
  );

  app.get(
    "/silver/dedup-candidates",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-silver"],
        summary: "List silver dedup candidates",
        querystring: z.object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          limit: z.coerce.number().int().min(1).max(100).default(25),
          offset: z.coerce.number().int().min(0).default(0),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = z
        .object({
          status: z
            .enum(["pending", "rejected", "expired", "auto_merged", "hitl_pending", "merged"])
            .optional(),
          limit: z.coerce.number().int().min(1).max(100).default(25),
          offset: z.coerce.number().int().min(0).default(0),
        })
        .safeParse(request.query);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: parsed.error.issues });
      const { status, limit, offset } = parsed.data;

      const conditions = [eq(silverDedupCandidates.tenantId, tenantId)];
      if (status) conditions.push(eq(silverDedupCandidates.status, status));

      const rows = await db
        .select()
        .from(silverDedupCandidates)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(silverDedupCandidates.createdAt));

      const [countRow] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(silverDedupCandidates)
        .where(and(...conditions));

      return {
        success: true,
        data: rows,
        meta: { total: Number(countRow?.total ?? 0), limit, offset },
      };
    },
  );

  app.post(
    "/silver/dedup-candidates/:id/decide",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-silver"],
        summary: "Decide on a dedup candidate pair",
        params: idParamsSchema,
        body: dedupDecisionSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      const body = dedupDecisionSchema.safeParse(request.body);
      if (!body.success)
        return reply
          .code(400)
          .send({ success: false, error: "Request invalid", details: body.error.issues });

      const candidate = await db.query.silverDedupCandidates.findFirst({
        where: (t, { and: a, eq: e }) => a(e(t.tenantId, tenantId), e(t.id, params.data.id)),
      });

      if (!candidate)
        return reply.code(404).send({ success: false, error: "Dedup candidate not found" });

      await db
        .update(silverDedupCandidates)
        .set({
          status:
            body.data.decision === "merge"
              ? "merged"
              : body.data.decision === "reject"
                ? "rejected"
                : "pending",
          decidedAt: new Date(),
          decidedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(silverDedupCandidates.id, params.data.id));

      return { success: true, data: { id: params.data.id, decision: body.data.decision } };
    },
  );

  app.get(
    "/gold/companies",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-gold"],
        summary: "List gold companies",
        querystring: listGoldCompaniesSchema,
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const query = listGoldCompaniesSchema.safeParse(request.query);
      if (!query.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: query.error.issues });
      const q = query.data;
      const conditions = [sql`${goldCompanies.tenantId} = ${tenantId}`];
      if (q.currentState?.length) {
        const stateConditions = q.currentState.map(
          (state) => sql`${goldCompanies.currentState} = ${state}`,
        );
        conditions.push(sql`(${sql.join(stateConditions, sql` OR `)})`);
      }
      if (q.judetCod) conditions.push(sql`${goldCompanies.judetCod} = ${q.judetCod}`);
      if (q.unassigned) conditions.push(sql`${goldCompanies.assignedTo} IS NULL`);
      else if (q.assignedTo) conditions.push(sql`${goldCompanies.assignedTo} = ${q.assignedTo}`);
      if (typeof q.doNotContact === "boolean")
        conditions.push(sql`${goldCompanies.doNotContact} = ${q.doNotContact}`);
      if (typeof q.minLeadScore === "number")
        conditions.push(sql`COALESCE(${goldCompanies.leadScore},0)::numeric >= ${q.minLeadScore}`);
      if (typeof q.maxLeadScore === "number")
        conditions.push(
          sql`COALESCE(${goldCompanies.leadScore},100)::numeric <= ${q.maxLeadScore}`,
        );
      if (typeof q.isAgricultural === "boolean") {
        if (q.isAgricultural) {
          conditions.push(
            sql`(
            ${goldCompanies.metadata} ? 'agriculturalCrops'
            OR ${goldCompanies.metadata} ? 'agriculturalAnimals'
            OR COALESCE(${goldCompanies.codCaenPrincipal}, '') LIKE '01%'
          )`,
          );
        } else {
          conditions.push(
            sql`NOT (
            ${goldCompanies.metadata} ? 'agriculturalCrops'
            OR ${goldCompanies.metadata} ? 'agriculturalAnimals'
            OR COALESCE(${goldCompanies.codCaenPrincipal}, '') LIKE '01%'
          )`,
          );
        }
      }

      const whereSql = sql.join(conditions, sql` AND `);
      const sortColumn =
        q.sortBy === "leadScore"
          ? goldCompanies.leadScore
          : q.sortBy === "createdAt"
            ? goldCompanies.createdAt
            : goldCompanies.updatedAt;
      const sortOrder = q.sortDir === "asc" ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`;
      const limit = parseLimit(q.limit, 25);
      const offset = parseOffset(q.offset, 0);
      const [rows, total] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        const resultRows = await tx.query.goldCompanies.findMany({
          where: whereSql,
          orderBy: () => [sortOrder],
          limit,
          offset,
        });
        const [countRow] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(goldCompanies)
          .where(whereSql);
        return [resultRows, Number(countRow?.total ?? 0)] as const;
      });
      return { success: true, data: rows, meta: { total, limit, offset } };
    },
  );

  app.get(
    "/gold/companies/:id",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-gold"],
        summary: "Get gold company detail",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      const [row, journey] = await Promise.all([
        db.query.goldCompanies.findFirst({
          where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
        }),
        db.query.goldLeadJourney.findMany({
          where: (t) => sql`${t.tenantId} = ${tenantId} AND ${t.companyId} = ${params.data.id}`,
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 100,
        }),
      ]);
      if (!row) return reply.code(404).send({ success: false, error: "Gold company not found" });
      return { success: true, data: { ...row, journey } };
    },
  );

  app.get(
    "/gold/companies/:id/journey",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-gold"],
        summary: "Get gold company journey/timeline",
        params: idParamsSchema,
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(500).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(500).optional(),
        offset: z.coerce.number().int().min(0).optional(),
      });
      const query = querySchema.safeParse(request.query);
      const limit = parseLimit(query.success ? query.data.limit : undefined, 50, 500);
      const offset = parseOffset(query.success ? query.data.offset : undefined, 0);

      const company = await db.query.goldCompanies.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
      });
      if (!company)
        return reply.code(404).send({ success: false, error: "Gold company not found" });

      const rows = await db.query.goldLeadJourney.findMany({
        where: (t) => sql`${t.tenantId} = ${tenantId} AND ${t.companyId} = ${params.data.id}`,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit,
        offset,
      });

      const [countRow] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(goldLeadJourney)
        .where(
          sql`${goldLeadJourney.tenantId} = ${tenantId} AND ${goldLeadJourney.companyId} = ${params.data.id}`,
        );

      return {
        success: true,
        data: rows,
        meta: { total: Number(countRow?.total ?? 0), limit, offset },
      };
    },
  );

  app.patch(
    "/gold/companies/:id",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-gold"],
        summary: "Patch gold company assignment/state",
        params: idParamsSchema,
        body: assignLeadSchema.merge(updateLeadStateSchema),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      const body = assignLeadSchema.merge(updateLeadStateSchema).safeParse(request.body ?? {});
      if (!params.success || !body.success)
        return reply.code(400).send({ success: false, error: "Request invalid" });

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (body.data.assignedTo !== undefined) patch.assignedTo = body.data.assignedTo;
      if (body.data.doNotContact !== undefined) patch.doNotContact = body.data.doNotContact;
      if (body.data.currentState) patch.currentState = body.data.currentState;
      if (body.data.canalPreferat !== undefined) patch.canalPreferat = body.data.canalPreferat;

      const [updated] = await db
        .update(goldCompanies)
        .set(patch)
        .where(
          sql`${goldCompanies.tenantId} = ${tenantId} AND ${goldCompanies.id} = ${params.data.id}`,
        )
        .returning();
      if (!updated)
        return reply.code(404).send({ success: false, error: "Gold company not found" });
      return { success: true, data: updated };
    },
  );

  app.post(
    "/gold/companies/:id/transition",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-gold"],
        summary: "Apply FSM transition for gold lead",
        params: idParamsSchema,
        body: z.object({ toState: goldStateSchema }),
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const params = idParamsSchema.safeParse(request.params);
      const body = z.object({ toState: goldStateSchema }).safeParse(request.body ?? {});
      if (!params.success || !body.success)
        return reply.code(400).send({ success: false, error: "Request invalid" });

      const existing = await db.query.goldCompanies.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, params.data.id)),
      });
      if (!existing)
        return reply.code(404).send({ success: false, error: "Gold company not found" });
      const allowed: Record<string, string[]> = {
        COLD: ["CONTACTED_WA", "CONTACTED_EMAIL", "CONTACTED_PHONE", "DO_NOT_CONTACT", "DEAD"],
        CONTACTED_WA: ["WARM_REPLY", "ENGAGED", "DEAD"],
        CONTACTED_EMAIL: ["WARM_REPLY", "ENGAGED", "DEAD"],
        CONTACTED_PHONE: ["WARM_REPLY", "ENGAGED", "DEAD"],
        WARM_REPLY: ["ENGAGED", "NEGOTIATION", "DEAD"],
        ENGAGED: ["NEGOTIATION", "PROPOSAL", "DEAD"],
        NEGOTIATION: ["PROPOSAL", "CLOSING", "CHURNED", "DEAD"],
        PROPOSAL: ["CLOSING", "CONVERTED", "CHURNED", "DEAD"],
        CLOSING: ["CONVERTED", "CHURNED", "DEAD"],
        CONVERTED: ["CHURNED"],
        CHURNED: [],
        DEAD: [],
        DO_NOT_CONTACT: [],
      };
      if (!allowed[existing.currentState]?.includes(body.data.toState)) {
        return reply.code(409).send({
          success: false,
          error: `Tranzitie invalida din ${existing.currentState} in ${body.data.toState}`,
        });
      }

      const [updated] = await db
        .update(goldCompanies)
        .set({
          previousState: existing.currentState,
          currentState: body.data.toState,
          stateChangedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(sql`${goldCompanies.id} = ${existing.id}`)
        .returning();

      await db.insert(goldLeadJourney).values({
        tenantId,
        companyId: existing.id,
        eventType: "state_transition",
        fromState: existing.currentState,
        toState: body.data.toState,
        metadata: {},
      });

      return { success: true, data: updated };
    },
  );
}
