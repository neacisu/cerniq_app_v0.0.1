/**
 * Etapa 2 — Outreach API Routes
 * Sources: etapa2-api-endpoints.md, etapa2-hitl-system.md
 * Prefix registered at: /api/v1/outreach
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z, iso } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  asc,
  inArray,
  leadJourney,
  communicationLog,
  waPhoneNumbers,
  waQuotaUsage,
  outreachSequences,
  outreachSequenceSteps,
  outreachTemplates,
  humanReviewQueue,
  outreachDailyStats,
  goldCompanies,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { requireTenantId, getActorId } from "./utils.js";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const LEAD_STATES = [
  "COLD",
  "CONTACTED_WA",
  "CONTACTED_EMAIL",
  "WARM_REPLY",
  "NEGOTIATION",
  "CONVERTED",
  "DEAD",
  "PAUSED",
] as const;

const VALID_TRANSITIONS: Record<string, readonly string[]> = {
  COLD: ["CONTACTED_WA", "CONTACTED_EMAIL", "DEAD"],
  CONTACTED_WA: ["WARM_REPLY", "CONTACTED_EMAIL", "DEAD"],
  CONTACTED_EMAIL: ["WARM_REPLY", "CONTACTED_WA", "DEAD"],
  WARM_REPLY: ["NEGOTIATION", "DEAD", "PAUSED"],
  NEGOTIATION: ["CONVERTED", "DEAD", "PAUSED", "WARM_REPLY"],
  CONVERTED: [],
  DEAD: ["COLD"],
  PAUSED: ["COLD", "WARM_REPLY", "NEGOTIATION"],
};

const WARM_STATES = ["WARM_REPLY", "NEGOTIATION"] as const;

/** Evită injectarea de metacaractere în `RegExp` la substituirea variabilelor `{{key}}`. */
function escapeRegExpMeta(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * API-ul public folosește uneori agregatul „EMAIL”; în PG enum-ul canonic este EMAIL_COLD / EMAIL_WARM.
 * Pentru `primary_channel` la secvențe, „EMAIL” înseamnă canal rece (outreach inițial).
 */
function mapApiEmailAggregateToChannel(
  c: "WHATSAPP" | "EMAIL",
): "WHATSAPP" | "EMAIL_COLD" | "EMAIL_WARM" {
  return c === "WHATSAPP" ? "WHATSAPP" : "EMAIL_COLD";
}

/** Mapare filtre UI vechi → valori `template_type_enum` (schema outreach). */
const TEMPLATE_TYPE_QUERY_MAP = {
  INITIAL_CONTACT: "INITIAL" as const,
  FOLLOW_UP: "FOLLOWUP" as const,
  WARM_REPLY: "RESPONSE" as const,
  CLOSING: "CLOSING" as const,
};

type TemplateTypeQuery = keyof typeof TEMPLATE_TYPE_QUERY_MAP;

/** Chei identice cu `TEMPLATE_TYPE_QUERY_MAP` — folosit la `z.enum` pentru narrowing fără `as`. */
const TEMPLATE_TYPE_FILTER_KEYS = [
  "INITIAL_CONTACT",
  "FOLLOW_UP",
  "WARM_REPLY",
  "CLOSING",
] as const satisfies readonly TemplateTypeQuery[];

const templateTypeFilterSchema = z.enum(TEMPLATE_TYPE_FILTER_KEYS);

const idParamSchema = z.object({ id: z.uuid() });

const leadsQuerySchema = z.object({
  state: z.enum(LEAD_STATES).optional(),
  channel: z.enum(["WHATSAPP", "EMAIL_COLD", "EMAIL_WARM", "PHONE", "MANUAL"]).optional(),
  assignedTo: z.uuid().optional(),
  assignedPhone: z.uuid().optional(),
  hasReply: z.coerce.boolean().optional(),
  needsReview: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
  minSentiment: z.coerce.number().min(-100).max(100).optional(),
  maxSentiment: z.coerce.number().min(-100).max(100).optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  sortBy: z
    .enum(["nextActionAt", "lastContactAt", "sentimentScore", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type LeadsSortBy = z.infer<typeof leadsQuerySchema>["sortBy"];

function resolveLeadSortColumn(sortBy: LeadsSortBy) {
  if (sortBy === "sentimentScore") {
    return leadJourney.sentimentScore;
  }
  if (sortBy === "nextActionAt") {
    return leadJourney.nextActionAt;
  }
  if (sortBy === "lastContactAt") {
    return leadJourney.lastContactAt;
  }
  return leadJourney.createdAt;
}

const patchLeadSchema = z.object({
  currentState: z.enum(LEAD_STATES).optional(),
  assignedToUser: z.uuid().nullable().optional(),
  isHumanControlled: z.boolean().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

const sendMessageSchema = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL_WARM"]),
  content: z.string().min(1).max(4000),
  subject: z.string().max(500).optional(),
  templateId: z.uuid().optional(),
  scheduledAt: iso.datetime().optional(),
});

const sequenceStepBodySchema = z.object({
  delayHours: z.number().int().min(0).max(720),
  delayMinutes: z.number().int().min(0).max(59).default(0),
  channel: z.enum(["WHATSAPP", "EMAIL_COLD", "EMAIL_WARM"]),
  templateId: z.uuid().optional(),
});

const createSequenceSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  primaryChannel: z.enum(["WHATSAPP", "EMAIL"]),
  respectBusinessHours: z.boolean().default(true),
  stopOnReply: z.boolean().default(true),
  steps: z.array(sequenceStepBodySchema).min(1).max(10),
});

const patchSequenceSchema = z
  .object({
    name: z.string().min(3).max(200).optional(),
    description: z.string().max(1000).optional(),
    isActive: z.boolean().optional(),
    stopOnReply: z.boolean().optional(),
    respectBusinessHours: z.boolean().optional(),
    steps: z.array(sequenceStepBodySchema).min(1).max(10).optional(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.description !== undefined ||
      b.isActive !== undefined ||
      b.stopOnReply !== undefined ||
      b.respectBusinessHours !== undefined ||
      b.steps !== undefined,
    { message: "At least one field is required" },
  );

const enrollSchema = z.object({
  leadIds: z.array(z.uuid()).min(1).max(500),
  startStep: z.number().int().min(0).optional(),
  scheduledStart: iso.datetime().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  channel: z.enum(["WHATSAPP", "EMAIL"]),
  subject: z.string().max(500).optional(),
  bodyTemplate: z.string().min(10).max(4000),
  templateType: z.enum(["INITIAL", "FOLLOWUP", "RESPONSE", "CLOSING"]),
  variables: z.array(z.string()).default([]),
  hasMedia: z.boolean().default(false),
  mediaType: z.string().max(50).optional(),
  mediaUrl: z.url().optional(),
});

const reviewQuerySchema = z.object({
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  status: z
    .enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "ESCALATED", "EXPIRED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const resolveReviewSchema = z.object({
  action: z.enum(["APPROVED", "EDITED", "REJECTED", "TAKEOVER", "IGNORED"]),
  editedContent: z.string().max(4000).optional(),
  notes: z.string().max(1000).optional(),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function outreachRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  // ─── Leads ────────────────────────────────────────────────────────────────

  app.get("/leads", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = leadsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(leadJourney.tenantId, tenantId)];
    if (query.state) conditions.push(eq(leadJourney.currentState, query.state));
    if (query.assignedPhone) conditions.push(eq(leadJourney.assignedPhoneId, query.assignedPhone));
    if (query.needsReview !== undefined)
      conditions.push(eq(leadJourney.requiresHumanReview, query.needsReview));
    if (query.minSentiment !== undefined)
      conditions.push(sql`${leadJourney.sentimentScore} >= ${query.minSentiment}`);
    if (query.maxSentiment !== undefined)
      conditions.push(sql`${leadJourney.sentimentScore} <= ${query.maxSentiment}`);
    if (query.createdAfter)
      conditions.push(sql`${leadJourney.createdAt} >= ${query.createdAfter}::timestamptz`);
    if (query.createdBefore)
      conditions.push(sql`${leadJourney.createdAt} <= ${query.createdBefore}::timestamptz`);

    const sortCol = resolveLeadSortColumn(query.sortBy);
    const orderFn = query.sortOrder === "asc" ? asc : desc;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(leadJourney)
        .leftJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(orderFn(sortCol))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(leadJourney)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({ ...r.lead_journey, company: r.gold_companies })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
        filters: { state: query.state, channel: query.channel },
      },
    });
  });

  app.get("/leads/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const rows = await db
      .select()
      .from(leadJourney)
      .leftJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }

    const comms = await db
      .select()
      .from(communicationLog)
      .where(and(eq(communicationLog.leadJourneyId, id), eq(communicationLog.tenantId, tenantId)))
      .orderBy(asc(communicationLog.createdAt));

    return reply.send({
      success: true,
      data: {
        ...rows[0].lead_journey,
        company: rows[0].gold_companies,
        communications: comms,
      },
    });
  });

  app.patch("/leads/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = patchLeadSchema.parse(req.body);

    const existing = await db
      .select({ currentState: leadJourney.currentState })
      .from(leadJourney)
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }

    if (body.currentState) {
      const allowed = VALID_TRANSITIONS[existing[0].currentState] ?? [];
      if (!allowed.includes(body.currentState)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid transition: ${existing[0].currentState} -> ${body.currentState}`,
        });
      }
    }

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (body.currentState) {
      updatePayload.currentState = body.currentState;
      updatePayload.previousState = existing[0].currentState;
      updatePayload.stateChangedAt = new Date();
    }
    if (body.assignedToUser !== undefined) updatePayload.assignedToUser = body.assignedToUser;
    if (body.isHumanControlled !== undefined)
      updatePayload.isHumanControlled = body.isHumanControlled;
    if (body.notes !== undefined) updatePayload.notes = body.notes;

    const [updated] = await db
      .update(leadJourney)
      .set(updatePayload)
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .returning();

    if (body.currentState) {
      const stateQueue = createQueue("lead:state:transition");
      await stateQueue.add("state-change", {
        journeyId: id,
        fromState: existing[0].currentState,
        toState: body.currentState,
        tenantId,
      });
    }

    return reply.send({ success: true, data: updated });
  });

  app.post("/leads/:id/send-message", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = sendMessageSchema.parse(req.body);

    if (body.subject && body.channel !== "EMAIL_WARM") {
      return reply.status(400).send({
        success: false,
        error: "subject is only allowed for EMAIL_WARM channel",
      });
    }

    const lead = await db
      .select({
        currentState: leadJourney.currentState,
        assignedPhoneId: leadJourney.assignedPhoneId,
      })
      .from(leadJourney)
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .limit(1);

    if (lead.length === 0) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }

    if (body.channel === "EMAIL_WARM") {
      if (!WARM_STATES.includes(lead[0].currentState as "WARM_REPLY" | "NEGOTIATION")) {
        return reply.status(400).send({
          success: false,
          error: `EMAIL_WARM requires lead state WARM_REPLY or NEGOTIATION (ADR-0059). Current: ${lead[0].currentState}`,
        });
      }
    }

    let queueName = "q:email:warm";
    if (body.channel === "WHATSAPP") {
      const phoneId = lead[0].assignedPhoneId;
      if (!phoneId) {
        return reply.status(400).send({ success: false, error: "Lead has no assigned phone" });
      }
      queueName = `q:wa:phone-01`;
    }

    const queue = createQueue(queueName);
    const job = await queue.add("send-manual-message", {
      journeyId: id,
      tenantId,
      channel: body.channel,
      content: body.content,
      subject: body.subject,
      templateId: body.templateId,
    });

    return reply.send({
      success: true,
      data: {
        messageId: job.id ?? "queued",
        status: "QUEUED",
        scheduledAt: body.scheduledAt,
      },
    });
  });

  app.post("/leads/:id/takeover", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const actorId = getActorId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z.object({ reason: z.string().min(1).max(1000) }).parse(req.body);

    const lead = await db
      .select({ currentState: leadJourney.currentState })
      .from(leadJourney)
      .where(and(eq(leadJourney.id, id), eq(leadJourney.tenantId, tenantId)))
      .limit(1);

    if (lead.length === 0) {
      return reply.status(404).send({ success: false, error: "Lead not found" });
    }

    if (lead[0].currentState === "CONVERTED") {
      return reply.status(400).send({
        success: false,
        error: "Cannot takeover a CONVERTED lead",
      });
    }

    const takeoverQueue = createQueue("human:takeover:initiate");
    await takeoverQueue.add("initiate-takeover", {
      journeyId: id,
      tenantId,
      userId: actorId,
      reason: body.reason,
    });

    return reply.send({ success: true, data: { success: true } });
  });

  // ─── Sequences ────────────────────────────────────────────────────────────

  app.get("/sequences", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({
        isActive: z.coerce.boolean().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(outreachSequences.tenantId, tenantId)];
    if (query.isActive !== undefined)
      conditions.push(eq(outreachSequences.isActive, query.isActive));

    const rows = await db
      .select()
      .from(outreachSequences)
      .where(and(...conditions))
      .orderBy(desc(outreachSequences.createdAt))
      .limit(query.limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(outreachSequences)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total: countResult?.count ?? 0 },
    });
  });

  app.get("/sequences/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [seq] = await db
      .select()
      .from(outreachSequences)
      .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)))
      .limit(1);

    if (!seq) return reply.status(404).send({ success: false, error: "Sequence not found" });

    const steps = await db
      .select()
      .from(outreachSequenceSteps)
      .where(eq(outreachSequenceSteps.sequenceId, id))
      .orderBy(asc(outreachSequenceSteps.stepNumber));

    return reply.send({ success: true, data: { ...seq, steps } });
  });

  app.post("/sequences", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createSequenceSchema.parse(req.body);

    const [seq] = await db
      .insert(outreachSequences)
      .values({
        tenantId,
        name: body.name,
        description: body.description,
        primaryChannel: mapApiEmailAggregateToChannel(body.primaryChannel),
        isActive: false,
        stopOnReply: body.stopOnReply,
        respectBusinessHours: body.respectBusinessHours,
      })
      .returning();

    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i];
      await db.insert(outreachSequenceSteps).values({
        sequenceId: seq.id,
        stepNumber: i + 1,
        channel: step.channel,
        templateId: step.templateId ?? null,
        delayHours: step.delayHours,
        delayMinutes: step.delayMinutes,
      });
    }

    return reply.status(201).send({ success: true, data: seq });
  });

  app.patch("/sequences/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = patchSequenceSchema.parse(req.body);

    const [existing] = await db
      .select({ id: outreachSequences.id })
      .from(outreachSequences)
      .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)))
      .limit(1);

    if (!existing) return reply.status(404).send({ success: false, error: "Sequence not found" });

    const { steps, ...meta } = body;
    const metaPatch = Object.fromEntries(
      Object.entries(meta).filter(([, v]) => v !== undefined),
    ) as Partial<typeof meta>;

    await db.transaction(async (tx) => {
      if (Object.keys(metaPatch).length > 0) {
        await tx
          .update(outreachSequences)
          .set({ ...metaPatch, updatedAt: new Date() })
          .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)));
      }

      if (steps !== undefined) {
        await tx.delete(outreachSequenceSteps).where(eq(outreachSequenceSteps.sequenceId, id));
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await tx.insert(outreachSequenceSteps).values({
            sequenceId: id,
            stepNumber: i + 1,
            channel: step.channel,
            templateId: step.templateId ?? null,
            delayHours: step.delayHours,
            delayMinutes: step.delayMinutes,
          });
        }
        if (Object.keys(metaPatch).length === 0) {
          await tx
            .update(outreachSequences)
            .set({ updatedAt: new Date() })
            .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)));
        }
      }
    });

    const [updated] = await db
      .select()
      .from(outreachSequences)
      .where(and(eq(outreachSequences.id, id), eq(outreachSequences.tenantId, tenantId)))
      .limit(1);

    return reply.send({ success: true, data: updated });
  });

  app.post("/sequences/:id/enroll", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = enrollSchema.parse(req.body);

    const queue = createQueue("sequence:create");
    await queue.add("enroll-leads", {
      sequenceId: id,
      tenantId,
      leadIds: body.leadIds,
      startStep: body.startStep ?? 0,
      scheduledStart: body.scheduledStart,
    });

    return reply.send({
      success: true,
      data: { enrolled: body.leadIds.length, skipped: 0 },
    });
  });

  // ─── Reviews / HITL ───────────────────────────────────────────────────────

  app.get("/reviews", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = reviewQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(humanReviewQueue.tenantId, tenantId)];
    if (query.priority) conditions.push(eq(humanReviewQueue.priority, query.priority));
    if (query.status) conditions.push(eq(humanReviewQueue.status, query.status));

    const rows = await db
      .select()
      .from(humanReviewQueue)
      .where(and(...conditions))
      .orderBy(
        desc(
          sql`case when ${humanReviewQueue.priority} = 'URGENT' then 1 when ${humanReviewQueue.priority} = 'HIGH' then 2 when ${humanReviewQueue.priority} = 'MEDIUM' then 3 else 4 end`,
        ),
        asc(humanReviewQueue.slaDueAt),
      )
      .limit(query.limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(humanReviewQueue)
      .where(and(...conditions));

    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total: countResult?.count ?? 0 },
    });
  });

  app.get("/reviews/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byPriority = await db
      .select({
        priority: humanReviewQueue.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(humanReviewQueue)
      .where(eq(humanReviewQueue.tenantId, tenantId))
      .groupBy(humanReviewQueue.priority);

    const byStatus = await db
      .select({
        status: humanReviewQueue.status,
        count: sql<number>`count(*)::int`,
      })
      .from(humanReviewQueue)
      .where(eq(humanReviewQueue.tenantId, tenantId))
      .groupBy(humanReviewQueue.status);

    return reply.send({
      success: true,
      data: {
        avgResolutionTimeMs: 0,
        slaBreachRate: 0,
        reviewsPerDay: 0,
        byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r.count])),
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
      },
    });
  });

  app.get("/reviews/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [review] = await db
      .select()
      .from(humanReviewQueue)
      .where(and(eq(humanReviewQueue.id, id), eq(humanReviewQueue.tenantId, tenantId)))
      .limit(1);

    if (!review) return reply.status(404).send({ success: false, error: "Review not found" });
    return reply.send({ success: true, data: review });
  });

  app.post("/reviews/:id/assign", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z.object({ userId: z.uuid() }).parse(req.body);

    const [updated] = await db
      .update(humanReviewQueue)
      .set({ assignedTo: body.userId, status: "ASSIGNED", updatedAt: new Date() })
      .where(and(eq(humanReviewQueue.id, id), eq(humanReviewQueue.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Review not found" });
    return reply.send({ success: true, data: updated });
  });

  app.post("/reviews/:id/resolve", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const actorId = getActorId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = resolveReviewSchema.parse(req.body);

    const resolveQueue = createQueue("human:approve:message");
    await resolveQueue.add("resolve-review", {
      reviewId: id,
      tenantId,
      actorId,
      action: body.action,
      editedContent: body.editedContent,
      notes: body.notes,
    });

    const [updated] = await db
      .update(humanReviewQueue)
      .set({
        status: "RESOLVED",
        resolutionAction: body.action,
        resolvedAt: new Date(),
        resolvedBy: actorId,
        resolutionNotes: body.notes ?? null,
        editedContent: body.editedContent ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(humanReviewQueue.id, id), eq(humanReviewQueue.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Review not found" });
    return reply.send({ success: true, data: updated });
  });

  // ─── Templates ────────────────────────────────────────────────────────────

  app.get("/templates", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({
        channel: z.enum(["WHATSAPP", "EMAIL"]).optional(),
        status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
        type: templateTypeFilterSchema.optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(outreachTemplates.tenantId, tenantId)];
    if (query.channel === "WHATSAPP") {
      conditions.push(eq(outreachTemplates.channel, "WHATSAPP"));
    } else if (query.channel === "EMAIL") {
      conditions.push(inArray(outreachTemplates.channel, ["EMAIL_COLD", "EMAIL_WARM"]));
    }
    if (query.status) conditions.push(eq(outreachTemplates.status, query.status));
    if (query.type) {
      const dbType = TEMPLATE_TYPE_QUERY_MAP[query.type];
      conditions.push(eq(outreachTemplates.templateType, dbType));
    }

    const rows = await db
      .select()
      .from(outreachTemplates)
      .where(and(...conditions))
      .orderBy(desc(outreachTemplates.createdAt))
      .limit(query.limit)
      .offset(offset);

    return reply.send({ success: true, data: rows });
  });

  app.get("/templates/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [tmpl] = await db
      .select()
      .from(outreachTemplates)
      .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.tenantId, tenantId)))
      .limit(1);

    if (!tmpl) return reply.status(404).send({ success: false, error: "Template not found" });
    return reply.send({ success: true, data: tmpl });
  });

  app.post("/templates", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createTemplateSchema.parse(req.body);

    const [tmpl] = await db
      .insert(outreachTemplates)
      .values({
        tenantId,
        name: body.name,
        description: body.description ?? null,
        channel: mapApiEmailAggregateToChannel(body.channel),
        subject: body.subject ?? null,
        bodyTemplate: body.bodyTemplate,
        templateType: body.templateType,
        status: "DRAFT" as const,
        variables: body.variables,
        hasMedia: body.hasMedia,
        mediaType: body.mediaType ?? null,
        mediaUrl: body.mediaUrl ?? null,
      })
      .returning();

    return reply.status(201).send({ success: true, data: tmpl });
  });

  app.patch("/templates/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z
      .object({
        name: z.string().min(3).max(200).optional(),
        description: z.string().max(1000).optional(),
        subject: z.string().max(500).nullable().optional(),
        bodyTemplate: z.string().min(10).max(4000).optional(),
        status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
        variables: z.array(z.string()).optional(),
        hasMedia: z.boolean().optional(),
        mediaType: z.string().max(50).nullable().optional(),
        mediaUrl: z.url().nullable().optional(),
      })
      .parse(req.body);

    const [updated] = await db
      .update(outreachTemplates)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Template not found" });
    return reply.send({ success: true, data: updated });
  });

  app.post("/templates/:id/preview", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z
      .object({ variables: z.record(z.string(), z.string()).optional() })
      .parse(req.body);

    const [tmpl] = await db
      .select({ bodyTemplate: outreachTemplates.bodyTemplate })
      .from(outreachTemplates)
      .where(and(eq(outreachTemplates.id, id), eq(outreachTemplates.tenantId, tenantId)))
      .limit(1);

    if (!tmpl) return reply.status(404).send({ success: false, error: "Template not found" });

    let preview = tmpl.bodyTemplate;
    if (body.variables) {
      for (const [k, v] of Object.entries(body.variables)) {
        const varPattern = new RegExp(
          String.raw`\{\{` + escapeRegExpMeta(k) + String.raw`\}\}`,
          "g",
        );
        preview = preview.replaceAll(varPattern, v);
      }
    }
    // Process spintax: {option1|option2} -> random pick
    const spintaxPattern = /\{([^{}]+)\}/g;
    preview = preview.replaceAll(spintaxPattern, (_match: string, group: string) => {
      const opts = group.split("|");
      return opts[Math.floor(Math.random() * opts.length)] ?? opts[0] ?? "";
    });

    return reply.send({ success: true, data: { preview } });
  });

  // ─── Phones ───────────────────────────────────────────────────────────────

  app.get("/phones", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const phones = await db
      .select()
      .from(waPhoneNumbers)
      .where(eq(waPhoneNumbers.tenantId, tenantId))
      .orderBy(asc(waPhoneNumbers.priority));

    const today = new Date().toISOString().slice(0, 10);
    const usageRows = await db
      .select()
      .from(waQuotaUsage)
      .where(
        and(
          inArray(
            waQuotaUsage.phoneId,
            phones.map((p) => p.id),
          ),
          eq(waQuotaUsage.usageDate, today),
        ),
      );

    /** Cotă zilnică „new contact” aliniată la ADR/worker (Redis cost=1), nu raw message count. */
    const newContactsTodayByPhone = Object.fromEntries(
      usageRows.map((u) => [u.phoneId, u.newContacts]),
    );

    return reply.send({
      success: true,
      data: phones.map((p) => {
        const limit = p.dailyNewContactLimit;
        const used = newContactsTodayByPhone[p.id] ?? p.currentNewContactsToday;
        const quotaPercentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        return {
          ...p,
          /** Alias API / UI — limita zilnică de contacte noi (coloana PG `daily_new_contact_limit`). */
          dailyQuotaLimit: limit,
          label: p.displayName ?? p.phoneNumber,
          currentUsage: used,
          quotaPercentage,
        };
      }),
    });
  });

  app.get("/phones/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [phone] = await db
      .select()
      .from(waPhoneNumbers)
      .where(and(eq(waPhoneNumbers.id, id), eq(waPhoneNumbers.tenantId, tenantId)))
      .limit(1);

    if (!phone) return reply.status(404).send({ success: false, error: "Phone not found" });
    return reply.send({ success: true, data: phone });
  });

  app.patch("/phones/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z
      .object({
        label: z.string().max(200).optional(),
        isEnabled: z.boolean().optional(),
        priority: z.number().int().min(1).max(100).optional(),
        status: z.enum(["ACTIVE", "PAUSED"]).optional(),
      })
      .parse(req.body);

    const patch: {
      displayName?: string;
      isEnabled?: boolean;
      priority?: number;
      status?: "ACTIVE" | "PAUSED";
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (body.label !== undefined) patch.displayName = body.label;
    if (body.isEnabled !== undefined) patch.isEnabled = body.isEnabled;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.status !== undefined) patch.status = body.status;

    const [updated] = await db
      .update(waPhoneNumbers)
      .set(patch)
      .where(and(eq(waPhoneNumbers.id, id), eq(waPhoneNumbers.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Phone not found" });
    return reply.send({
      success: true,
      data: {
        ...updated,
        dailyQuotaLimit: updated.dailyNewContactLimit,
        label: updated.displayName ?? updated.phoneNumber,
      },
    });
  });

  app.post("/phones/:id/health-check", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const healthQueue = createQueue("monitor:phone:health");
    await healthQueue.add("manual-health-check", { phoneId: id, tenantId });

    return reply.send({ success: true, data: { queued: true } });
  });

  // ─── Analytics ────────────────────────────────────────────────────────────

  app.get("/analytics/overview", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({ period: z.enum(["7d", "30d", "90d", "custom"]).default("7d") })
      .parse(req.query);

    const ANALYTICS_PERIOD_DAYS: Record<typeof query.period, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      custom: 90,
    };
    const days = ANALYTICS_PERIOD_DAYS[query.period];
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const funnel = await db
      .select({
        state: leadJourney.currentState,
        count: sql<number>`count(*)::int`,
      })
      .from(leadJourney)
      .where(eq(leadJourney.tenantId, tenantId))
      .groupBy(leadJourney.currentState);

    const sentimentStats = await db
      .select({
        negative: sql<number>`count(*) filter (where ${leadJourney.sentimentScore} < 0)::int`,
        neutral: sql<number>`count(*) filter (where ${leadJourney.sentimentScore} >= 0 and ${leadJourney.sentimentScore} < 50)::int`,
        positive: sql<number>`count(*) filter (where ${leadJourney.sentimentScore} >= 50)::int`,
      })
      .from(leadJourney)
      .where(eq(leadJourney.tenantId, tenantId));

    const channelStats = await db
      .select({
        channel: communicationLog.channel,
        direction: communicationLog.direction,
        status: communicationLog.status,
        count: sql<number>`count(*)::int`,
      })
      .from(communicationLog)
      .where(
        and(
          eq(communicationLog.tenantId, tenantId),
          sql`${communicationLog.createdAt} >= ${from}::timestamptz`,
        ),
      )
      .groupBy(communicationLog.channel, communicationLog.direction, communicationLog.status);

    const [pendingReviews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(humanReviewQueue)
      .where(and(eq(humanReviewQueue.tenantId, tenantId), eq(humanReviewQueue.status, "PENDING")));

    const [activeSeqs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(outreachSequences)
      .where(and(eq(outreachSequences.tenantId, tenantId), eq(outreachSequences.isActive, true)));

    const phones = await db
      .select()
      .from(waPhoneNumbers)
      .where(eq(waPhoneNumbers.tenantId, tenantId));

    return reply.send({
      success: true,
      data: {
        kpis: {
          messagesSent: channelStats
            .filter((c) => c.direction === "OUTBOUND")
            .reduce((a, c) => a + c.count, 0),
          replies: channelStats
            .filter((c) => c.direction === "INBOUND")
            .reduce((a, c) => a + c.count, 0),
          conversionRate: 0,
          activeSequences: activeSeqs?.count ?? 0,
          pendingReviews: pendingReviews?.count ?? 0,
        },
        funnel,
        sentiment: sentimentStats[0] ?? { negative: 0, neutral: 0, positive: 0 },
        channelPerformance: [],
        recentActivity: [],
        phones: phones.map((p) => ({
          ...p,
          dailyQuotaLimit: p.dailyNewContactLimit,
          label: p.displayName ?? p.phoneNumber,
          currentUsage: p.currentNewContactsToday,
          quotaPercentage:
            p.dailyNewContactLimit > 0
              ? Math.min(
                  100,
                  Math.round((p.currentNewContactsToday / p.dailyNewContactLimit) * 100),
                )
              : 0,
        })),
      },
    });
  });

  app.get("/analytics/daily", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = z
      .object({ from: z.string().optional(), to: z.string().optional() })
      .parse(req.query);

    const conditions = [eq(outreachDailyStats.tenantId, tenantId)];
    if (query.from) conditions.push(sql`${outreachDailyStats.statDate} >= ${query.from}`);
    if (query.to) conditions.push(sql`${outreachDailyStats.statDate} <= ${query.to}`);

    const rows = await db
      .select()
      .from(outreachDailyStats)
      .where(and(...conditions))
      .orderBy(desc(outreachDailyStats.statDate))
      .limit(90);

    return reply.send({ success: true, data: rows });
  });

  // ─── Campaigns ────────────────────────────────────────────────────────────

  app.get("/campaigns", { ...authOpts }, async (req, reply) => {
    return reply.send({ success: true, data: [] });
  });
}
