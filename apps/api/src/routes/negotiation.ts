/**
 * Etapa 3 — Negotiation API Routes (E3 AI Sales)
 * FSM: DISCOVERY → PROPOSAL → NEGOTIATION → CLOSING → PROFORMA_SENT → INVOICED → PAID | DEAD
 * Prefix înregistrat: /api/v1/negotiation și alias /api/v1/negotiations
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  asc,
  inArray,
  goldNegotiations,
  negotiationStateHistory,
  negotiationItems,
  aiConversations,
  aiConversationMessages,
  guardrailViolations,
  goldCompanies,
  goldProducts,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireRole } from "../middleware/authz.js";
import { requireTenantId, getActorId } from "./utils.js";
import { buildApiJobPayloadContext } from "../lib/http-job-tracing.js";
import { e3NegotiationsTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const NEGOTIATION_STATES = [
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSING",
  "PROFORMA_SENT",
  "INVOICED",
  "PAID",
  "DEAD",
] as const;

const VALID_NEGOTIATION_TRANSITIONS: Record<string, readonly string[]> = {
  DISCOVERY: ["PROPOSAL", "DEAD"],
  PROPOSAL: ["NEGOTIATION", "CLOSING", "DEAD"],
  NEGOTIATION: ["CLOSING", "PROPOSAL", "DEAD"],
  CLOSING: ["PROFORMA_SENT", "NEGOTIATION", "DEAD"],
  PROFORMA_SENT: ["INVOICED", "CLOSING", "DEAD"],
  INVOICED: ["PAID", "DEAD"],
  PAID: [],
  DEAD: ["DISCOVERY"],
};

const idParamSchema = z.object({ id: z.uuid() });
const leadIdParamSchema = z.object({ leadId: z.uuid() });

const negotiationsQuerySchema = z.object({
  leadId: z.uuid().optional(),
  state: z.enum(NEGOTIATION_STATES).optional(),
  assignedUserId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createNegotiationSchema = z.object({
  leadId: z.uuid(),
  assignedUserId: z.uuid().optional(),
  assignedPhoneId: z.uuid().optional(),
});

const patchNegotiationSchema = z
  .object({
    toState: z.enum(NEGOTIATION_STATES).optional(),
    assignedUserId: z.uuid().nullable().optional(),
    reason: z.string().max(1000).optional(),
  })
  .refine((b) => b.toState !== undefined || b.assignedUserId !== undefined, {
    message: "At least one field required",
  });

const negotiationItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discountPct: z.number().min(0).max(100).default(0),
});

const upsertItemsSchema = z.object({
  items: z.array(negotiationItemSchema).min(1).max(100),
});

const messagesQuerySchema = z.object({
  conversationId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const guardrailsQuerySchema = z.object({
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function negotiationRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  const writeLimiter = app.rateLimit({ max: 30, timeWindow: "1 minute" });

  // ── GET /negotiations ──────────────────────────────────────────────────────

  app.get("/", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = negotiationsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldNegotiations.tenantId, tenantId)];
    if (query.leadId) conditions.push(eq(goldNegotiations.leadId, query.leadId));
    if (query.state) conditions.push(eq(goldNegotiations.currentState, query.state));
    if (query.assignedUserId)
      conditions.push(eq(goldNegotiations.assignedUserId, query.assignedUserId));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          negotiation: goldNegotiations,
          companyName: goldCompanies.denumire,
        })
        .from(goldNegotiations)
        .leftJoin(goldCompanies, eq(goldNegotiations.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldNegotiations.updatedAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldNegotiations)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({ ...r.negotiation, companyName: r.companyName })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  });

  // ── GET /negotiations/stats (dashboard) — înainte de /:id (uuid) ───────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const [byState, avgConfRows, guardrailByType, guardrailTotalRow] = await Promise.all([
      db
        .select({
          state: goldNegotiations.currentState,
          count: sql<number>`count(*)::int`,
          totalValue: sql<string>`coalesce(sum(${goldNegotiations.totalValue}), 0)::text`,
        })
        .from(goldNegotiations)
        .where(eq(goldNegotiations.tenantId, tenantId))
        .groupBy(goldNegotiations.currentState),
      db
        .select({
          avgConfidence: sql<string>`coalesce(avg(${goldNegotiations.aiConfidenceScore}), 0)::text`,
          avgClose: sql<string>`coalesce(avg(${goldNegotiations.closeProbability}), 0)::text`,
        })
        .from(goldNegotiations)
        .where(eq(goldNegotiations.tenantId, tenantId)),
      db
        .select({
          violationType: guardrailViolations.violationType,
          count: sql<number>`count(*)::int`,
        })
        .from(guardrailViolations)
        .where(eq(guardrailViolations.tenantId, tenantId))
        .groupBy(guardrailViolations.violationType),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(guardrailViolations)
        .where(eq(guardrailViolations.tenantId, tenantId)),
    ]);

    const avgConf = avgConfRows[0];
    const guardrailViolationsTotal = guardrailTotalRow[0]?.count ?? 0;

    return reply.send({
      success: true,
      data: {
        byState,
        avgAiConfidence: avgConf?.avgConfidence ?? "0",
        avgCloseProbability: avgConf?.avgClose ?? "0",
        guardrailViolationsTotal,
        guardrailViolationsByType: guardrailByType.map((r) => ({
          violationType: r.violationType,
          count: r.count,
        })),
      },
    });
  });

  // ── GET /negotiations/guardrails (tenant-wide) ─────────────────────────────

  app.get("/guardrails", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = guardrailsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(guardrailViolations.tenantId, tenantId)];
    if (query.severity) conditions.push(eq(guardrailViolations.severity, query.severity));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(guardrailViolations)
        .where(and(...conditions))
        .orderBy(desc(guardrailViolations.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(guardrailViolations)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total },
    });
  });

  // ── GET /negotiations/by-lead/:leadId ─────────────────────────────────────

  app.get("/by-lead/:leadId", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { leadId } = leadIdParamSchema.parse(req.params);

    const rows = await db
      .select()
      .from(goldNegotiations)
      .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.leadId, leadId)))
      .orderBy(desc(goldNegotiations.createdAt));

    return reply.send({ success: true, data: rows });
  });

  // ── GET /negotiations/:id ──────────────────────────────────────────────────

  app.get("/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [row] = await db
      .select()
      .from(goldNegotiations)
      .leftJoin(goldCompanies, eq(goldNegotiations.leadId, goldCompanies.id))
      .where(and(eq(goldNegotiations.id, id), eq(goldNegotiations.tenantId, tenantId)))
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: "Negotiation not found" });

    const [items, history] = await Promise.all([
      db
        .select({
          item: negotiationItems,
          productName: goldProducts.name,
          sku: goldProducts.sku,
        })
        .from(negotiationItems)
        .leftJoin(goldProducts, eq(negotiationItems.productId, goldProducts.id))
        .where(eq(negotiationItems.negotiationId, id))
        .orderBy(asc(negotiationItems.createdAt)),
      db
        .select()
        .from(negotiationStateHistory)
        .where(eq(negotiationStateHistory.negotiationId, id))
        .orderBy(desc(negotiationStateHistory.createdAt))
        .limit(20),
    ]);

    return reply.send({
      success: true,
      data: {
        ...row.gold_negotiations,
        company: row.gold_companies,
        items: items.map((i) => ({
          ...i.item,
          productName: i.productName,
          sku: i.sku,
        })),
        history,
      },
    });
  });

  // ── POST /negotiations ─────────────────────────────────────────────────────

  app.post("/", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createNegotiationSchema.parse(req.body);

    const [company] = await db
      .select({ id: goldCompanies.id })
      .from(goldCompanies)
      .where(and(eq(goldCompanies.id, body.leadId), eq(goldCompanies.tenantId, tenantId)))
      .limit(1);

    if (!company)
      return reply.status(404).send({ success: false, error: "Lead (goldCompany) not found" });

    const [neg] = await db
      .insert(goldNegotiations)
      .values({
        tenantId,
        leadId: body.leadId,
        assignedUserId: body.assignedUserId ?? null,
        assignedPhoneId: body.assignedPhoneId ?? null,
        currentState: "DISCOVERY",
      })
      .returning();

    const queue = createQueue(QUEUES.E3_AI_CONTEXT_BUILD);
    await queue.add("context-build", {
      negotiationId: neg.id,
      tenantId,
      ...buildApiJobPayloadContext(req),
    });

    e3NegotiationsTotal.inc();
    return reply.status(201).send({ success: true, data: neg });
  });

  // ── PATCH /negotiations/:id ──────────────────────────────────────────────── ────────────────────────────────────────────────

  app.patch("/:id", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const actorId = getActorId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = patchNegotiationSchema.parse(req.body);

    const [existing] = await db
      .select({ currentState: goldNegotiations.currentState })
      .from(goldNegotiations)
      .where(and(eq(goldNegotiations.id, id), eq(goldNegotiations.tenantId, tenantId)))
      .limit(1);

    if (!existing)
      return reply.status(404).send({ success: false, error: "Negotiation not found" });

    if (body.toState) {
      const allowed = VALID_NEGOTIATION_TRANSITIONS[existing.currentState] ?? [];
      if (!allowed.includes(body.toState)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid FSM transition: ${existing.currentState} → ${body.toState}`,
        });
      }
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.toState) {
      patch.currentState = body.toState;
    }
    if (body.assignedUserId !== undefined) patch.assignedUserId = body.assignedUserId;

    const [updated] = await db
      .update(goldNegotiations)
      .set(patch as typeof goldNegotiations.$inferInsert)
      .where(and(eq(goldNegotiations.id, id), eq(goldNegotiations.tenantId, tenantId)))
      .returning();

    if (body.toState) {
      await db.insert(negotiationStateHistory).values({
        tenantId,
        negotiationId: id,
        fromState: existing.currentState,
        toState: body.toState,
        changedBy: actorId,
        reason: body.reason ?? null,
      });

      const transitionQueue = createQueue(QUEUES.E3_NEGOTIATION_STATE_TRANSITION);
      await transitionQueue.add("state-transition", {
        negotiationId: id,
        fromState: existing.currentState,
        toState: body.toState,
        tenantId,
        ...buildApiJobPayloadContext(req),
        actorId,
      });
    }

    return reply.send({ success: true, data: updated });
  });

  // ── PUT /negotiations/:id/items ───────────────────────────────────────────

  app.put("/:id/items", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = upsertItemsSchema.parse(req.body);

    const [neg] = await db
      .select({ id: goldNegotiations.id, currentState: goldNegotiations.currentState })
      .from(goldNegotiations)
      .where(and(eq(goldNegotiations.id, id), eq(goldNegotiations.tenantId, tenantId)))
      .limit(1);

    if (!neg) return reply.status(404).send({ success: false, error: "Negotiation not found" });
    if (neg.currentState === "PAID" || neg.currentState === "DEAD") {
      return reply.status(400).send({
        success: false,
        error: `Cannot update items for negotiation in state ${neg.currentState}`,
      });
    }

    await db.transaction(async (tx) => {
      await tx.delete(negotiationItems).where(eq(negotiationItems.negotiationId, id));

      let totalValue = 0;
      for (const item of body.items) {
        const lineTotal = item.unitPrice * item.quantity * (1 - item.discountPct / 100);
        totalValue += lineTotal;
        await tx.insert(negotiationItems).values({
          tenantId,
          negotiationId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          discountPct: String(item.discountPct),
          lineTotal: String(lineTotal),
        });
      }

      await tx
        .update(goldNegotiations)
        .set({ totalValue: String(totalValue), updatedAt: new Date() })
        .where(eq(goldNegotiations.id, id));
    });

    const updateQueue = createQueue(QUEUES.E3_NEGOTIATION_ITEMS_UPDATE);
    await updateQueue.add("items-updated", {
      negotiationId: id,
      tenantId,
      ...buildApiJobPayloadContext(req),
    });

    const items = await db
      .select()
      .from(negotiationItems)
      .where(eq(negotiationItems.negotiationId, id));

    return reply.send({ success: true, data: items });
  });

  // ── GET /negotiations/:id/messages ────────────────────────────────────────

  app.get("/:id/messages", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const query = messagesQuerySchema.parse(req.query);

    const [neg] = await db
      .select({ id: goldNegotiations.id })
      .from(goldNegotiations)
      .where(and(eq(goldNegotiations.id, id), eq(goldNegotiations.tenantId, tenantId)))
      .limit(1);

    if (!neg) return reply.status(404).send({ success: false, error: "Negotiation not found" });

    const conditions = [
      eq(aiConversations.tenantId, tenantId),
      eq(aiConversations.negotiationId, id),
    ];
    if (query.conversationId) conditions.push(eq(aiConversations.id, query.conversationId));

    const conversations = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(and(...conditions))
      .orderBy(desc(aiConversations.startedAt))
      .limit(5);

    if (conversations.length === 0) {
      return reply.send({ success: true, data: [] });
    }

    const convIds = conversations.map((c) => c.id);
    const messages = await db
      .select()
      .from(aiConversationMessages)
      .where(
        and(
          eq(aiConversationMessages.tenantId, tenantId),
          inArray(aiConversationMessages.conversationId, convIds),
        ),
      )
      .orderBy(asc(aiConversationMessages.createdAt))
      .limit(query.limit);

    return reply.send({ success: true, data: messages });
  });

  // ── GET /negotiations/:id/guardrails ─────────────────────────────────────

  app.get("/:id/guardrails", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const query = guardrailsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const [neg] = await db
      .select({ id: goldNegotiations.id })
      .from(goldNegotiations)
      .where(and(eq(goldNegotiations.id, id), eq(goldNegotiations.tenantId, tenantId)))
      .limit(1);

    if (!neg) return reply.status(404).send({ success: false, error: "Negotiation not found" });

    const conditions = [
      eq(guardrailViolations.tenantId, tenantId),
      sql`${guardrailViolations.details}->>'negotiationId' = ${id}`,
    ];
    if (query.severity) conditions.push(eq(guardrailViolations.severity, query.severity));

    const whereClause = and(...conditions);

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(guardrailViolations)
        .where(whereClause)
        .orderBy(desc(guardrailViolations.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(guardrailViolations)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total },
    });
  });

  // ── POST /negotiations/:id/reminder ───────────────────────────────────────

  app.post("/:id/reminder", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [neg] = await db
      .select({ id: goldNegotiations.id })
      .from(goldNegotiations)
      .where(and(eq(goldNegotiations.id, id), eq(goldNegotiations.tenantId, tenantId)))
      .limit(1);

    if (!neg) return reply.status(404).send({ success: false, error: "Negotiation not found" });

    const reminderQueue = createQueue(QUEUES.E3_NEGOTIATION_REMINDER_SEND);
    await reminderQueue.add("reminder", {
      negotiationId: id,
      tenantId,
      ...buildApiJobPayloadContext(req),
    });

    return reply.send({ success: true, data: { queued: true } });
  });

  // ── POST /negotiations/:id/abandon (admin) ────────────────────────────────

  app.post("/:id/abandon", { ...adminAuth, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = z.object({ reason: z.string().min(1).max(1000) }).parse(req.body);

    const [neg] = await db
      .select({ id: goldNegotiations.id, currentState: goldNegotiations.currentState })
      .from(goldNegotiations)
      .where(and(eq(goldNegotiations.id, id), eq(goldNegotiations.tenantId, tenantId)))
      .limit(1);

    if (!neg) return reply.status(404).send({ success: false, error: "Negotiation not found" });
    if (neg.currentState === "PAID")
      return reply.status(400).send({ success: false, error: "Cannot abandon a PAID negotiation" });

    const abandonQueue = createQueue(QUEUES.E3_NEGOTIATION_ABANDON_PROCESS);
    await abandonQueue.add("abandon", {
      negotiationId: id,
      tenantId,
      reason: body.reason,
      ...buildApiJobPayloadContext(req),
    });

    return reply.send({ success: true, data: { queued: true } });
  });
}
