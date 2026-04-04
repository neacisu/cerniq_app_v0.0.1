/**
 * Etapa 4 — Order API Routes (E4 Post-Sale: Comenzi, Plăți, Reconcilieri)
 * Prefix registered at: /api/v1/orders
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z, iso } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  inArray,
  goldOrders,
  goldOrderItems,
  goldPayments,
  goldPaymentReconciliations,
  goldShipments,
  goldCompanies,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireRole } from "../middleware/authz.js";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e4OrdersCreatedTotal, e4OrdersSoftDeletedTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ORDER_STATES = [
  "DRAFT",
  "CONFIRMED",
  "PROFORMA_SENT",
  "PROFORMA_PAID",
  "CREDIT_APPROVED",
  "CREDIT_PENDING",
  "CREDIT_REJECTED",
  "STOCK_RESERVED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNED",
  "RETURN_PROCESSING",
  "INVOICED",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "CANCELLED",
  "COMPLETED",
] as const;

const idParamSchema = z.object({ id: z.uuid() });

const ordersQuerySchema = z.object({
  leadId: z.uuid().optional(),
  status: z.enum(ORDER_STATES).optional(),
  paymentMethod: z.enum(["BANK_TRANSFER", "REVOLUT", "CARD", "COD", "CREDIT"]).optional(),
  createdAfter: iso.datetime().optional(),
  createdBefore: iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const orderItemSchema = z.object({
  productId: z.uuid().optional(),
  productName: z.string().min(1).max(255),
  sku: z.string().max(100).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discountPercent: z.number().min(0).max(100).default(0),
});

const createOrderSchema = z.object({
  leadId: z.uuid(),
  paymentMethod: z.enum(["BANK_TRANSFER", "REVOLUT", "CARD", "COD", "CREDIT"]).optional(),
  currency: z.string().length(3).default("RON"),
  paymentDueAt: iso.datetime().optional(),
  items: z.array(orderItemSchema).min(1).max(200),
});

const patchOrderSchema = z
  .object({
    status: z.enum(ORDER_STATES).optional(),
    paymentMethod: z.enum(["BANK_TRANSFER", "REVOLUT", "CARD", "COD", "CREDIT"]).optional(),
    paymentDueAt: iso.datetime().nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "At least one field required" });

const paymentsQuerySchema = z.object({
  status: z.string().max(50).optional(),
  source: z.enum(["REVOLUT", "BANK_TRANSFER", "CARD", "COD", "MANUAL"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const reconciliationsQuerySchema = z.object({
  status: z
    .enum(["PENDING", "MATCHED_EXACT", "MATCHED_FUZZY", "UNMATCHED", "MANUAL_MATCHED", "DISPUTED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const tenantPaymentsQuerySchema = z.object({
  reconciliationStatus: z
    .enum(["PENDING", "MATCHED_EXACT", "MATCHED_FUZZY", "UNMATCHED", "MANUAL_MATCHED", "DISPUTED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function orderRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  const writeLimiter = app.rateLimit({ max: 30, timeWindow: "1 minute" });

  // ── GET /orders ────────────────────────────────────────────────────────────

  app.get("/", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = ordersQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldOrders.tenantId, tenantId), sql`${goldOrders.deletedAt} IS NULL`];
    if (query.leadId) conditions.push(eq(goldOrders.leadId, query.leadId));
    if (query.status) conditions.push(eq(goldOrders.status, query.status));
    if (query.paymentMethod) conditions.push(eq(goldOrders.paymentMethod, query.paymentMethod));
    if (query.createdAfter)
      conditions.push(sql`${goldOrders.createdAt} >= ${query.createdAfter}::timestamptz`);
    if (query.createdBefore)
      conditions.push(sql`${goldOrders.createdAt} <= ${query.createdBefore}::timestamptz`);

    const [rows, countResult] = await Promise.all([
      db
        .select({
          order: goldOrders,
          companyName: goldCompanies.denumire,
          cui: goldCompanies.cui,
        })
        .from(goldOrders)
        .leftJoin(goldCompanies, eq(goldOrders.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldOrders.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldOrders)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({ ...r.order, companyName: r.companyName, cui: r.cui })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  });

  // ── GET /orders/stats (înainte de /:id — evită match pe id="stats") ─────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byStatus = await db
      .select({
        status: goldOrders.status,
        count: sql<number>`count(*)::int`,
        totalAmount: sql<string>`coalesce(sum(${goldOrders.totalAmount}), 0)::text`,
      })
      .from(goldOrders)
      .where(and(eq(goldOrders.tenantId, tenantId), sql`${goldOrders.deletedAt} IS NULL`))
      .groupBy(goldOrders.status);

    const [overdueStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalDue: sql<string>`coalesce(sum(${goldOrders.amountDue}), 0)::text`,
      })
      .from(goldOrders)
      .where(
        and(
          eq(goldOrders.tenantId, tenantId),
          sql`${goldOrders.deletedAt} IS NULL`,
          inArray(goldOrders.status, ["OVERDUE", "PARTIALLY_PAID"]),
        ),
      );

    return reply.send({
      success: true,
      data: { byStatus, overdue: overdueStats },
    });
  });

  // ── GET /orders/payments/reconciliations (admin) ───────────────────────────

  app.get("/payments/reconciliations", { ...adminAuth }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = reconciliationsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const paymentConditions = [eq(goldPayments.tenantId, tenantId)];
    if (query.status) paymentConditions.push(eq(goldPayments.reconciliationStatus, query.status));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          reconciliation: goldPaymentReconciliations,
          payment: goldPayments,
        })
        .from(goldPaymentReconciliations)
        .innerJoin(goldPayments, eq(goldPaymentReconciliations.paymentId, goldPayments.id))
        .where(and(...paymentConditions))
        .orderBy(desc(goldPaymentReconciliations.matchedAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldPaymentReconciliations)
        .innerJoin(goldPayments, eq(goldPaymentReconciliations.paymentId, goldPayments.id))
        .where(and(...paymentConditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /orders/payments — listă plăți tenant (UI Payments) ─────────────────

  app.get("/payments", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = tenantPaymentsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldPayments.tenantId, tenantId)];
    if (query.reconciliationStatus) {
      conditions.push(eq(goldPayments.reconciliationStatus, query.reconciliationStatus));
    }

    const [rows, countResult] = await Promise.all([
      db
        .select({
          payment: goldPayments,
          orderNumber: goldOrders.orderNumber,
          companyName: goldCompanies.denumire,
          cui: goldCompanies.cui,
        })
        .from(goldPayments)
        .leftJoin(goldOrders, eq(goldPayments.orderId, goldOrders.id))
        .leftJoin(goldCompanies, eq(goldOrders.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldPayments.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldPayments)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({
        ...r.payment,
        orderNumber: r.orderNumber,
        companyName: r.companyName,
        cui: r.cui,
      })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /orders/:id ────────────────────────────────────────────────────────

  app.get("/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [row] = await db
      .select({
        order: goldOrders,
        companyName: goldCompanies.denumire,
        cui: goldCompanies.cui,
      })
      .from(goldOrders)
      .leftJoin(goldCompanies, eq(goldOrders.leadId, goldCompanies.id))
      .where(and(eq(goldOrders.id, id), eq(goldOrders.tenantId, tenantId)))
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: "Order not found" });

    const [items, payments, shipment] = await Promise.all([
      db.select().from(goldOrderItems).where(eq(goldOrderItems.orderId, id)),
      db
        .select()
        .from(goldPayments)
        .where(and(eq(goldPayments.orderId, id), eq(goldPayments.tenantId, tenantId)))
        .orderBy(desc(goldPayments.createdAt)),
      db
        .select()
        .from(goldShipments)
        .where(and(eq(goldShipments.orderId, id), eq(goldShipments.tenantId, tenantId)))
        .limit(1),
    ]);

    return reply.send({
      success: true,
      data: {
        ...row.order,
        companyName: row.companyName,
        cui: row.cui,
        items,
        payments,
        shipment: shipment[0] ?? null,
      },
    });
  });

  // ── POST /orders ───────────────────────────────────────────────────────────

  app.post("/", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createOrderSchema.parse(req.body);

    const [company] = await db
      .select({ id: goldCompanies.id })
      .from(goldCompanies)
      .where(and(eq(goldCompanies.id, body.leadId), eq(goldCompanies.tenantId, tenantId)))
      .limit(1);

    if (!company) return reply.status(404).send({ success: false, error: "Lead not found" });

    const totalAmount = body.items.reduce((acc, item) => {
      return acc + item.unitPrice * item.quantity * (1 - item.discountPercent / 100);
    }, 0);

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const paymentDueAt = body.paymentDueAt
      ? new Date(body.paymentDueAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [order] = await db.transaction(async (tx) => {
      const [o] = await tx
        .insert(goldOrders)
        .values({
          tenantId,
          leadId: body.leadId,
          orderNumber,
          status: "DRAFT",
          paymentMethod: body.paymentMethod ?? null,
          totalAmount: String(totalAmount),
          amountPaid: "0",
          amountDue: String(totalAmount),
          currency: body.currency,
          paymentDueAt,
        })
        .returning();

      for (const item of body.items) {
        const totalPrice = item.unitPrice * item.quantity * (1 - item.discountPercent / 100);
        await tx.insert(goldOrderItems).values({
          orderId: o.id,
          productId: item.productId ?? null,
          productName: item.productName,
          sku: item.sku ?? null,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          totalPrice: String(totalPrice),
          discountPercent: String(item.discountPercent),
        });
      }

      return [o];
    });

    const creditQueue = createQueue(QUEUES.E4_CREDIT_LIMIT_CHECK);
    await creditQueue.add("credit-check", {
      orderId: order.id,
      tenantId,
      amount: totalAmount,
      ...buildProvenanceContext(req),
    });

    e4OrdersCreatedTotal.inc();
    return reply.status(201).send({ success: true, data: order });
  });

  // ── PATCH /orders/:id ─────────────────────────────────────────────────────

  app.patch("/:id", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = patchOrderSchema.parse(req.body);

    const [existing] = await db
      .select({ status: goldOrders.status })
      .from(goldOrders)
      .where(and(eq(goldOrders.id, id), eq(goldOrders.tenantId, tenantId)))
      .limit(1);

    if (!existing) return reply.status(404).send({ success: false, error: "Order not found" });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) patch.status = body.status;
    if (body.paymentMethod !== undefined) patch.paymentMethod = body.paymentMethod;
    if (body.paymentDueAt !== undefined)
      patch.paymentDueAt = body.paymentDueAt ? new Date(body.paymentDueAt) : null;

    const [updated] = await db
      .update(goldOrders)
      .set(patch as typeof goldOrders.$inferInsert)
      .where(and(eq(goldOrders.id, id), eq(goldOrders.tenantId, tenantId)))
      .returning();

    if (body.status === "READY_TO_SHIP" && existing.status !== "READY_TO_SHIP") {
      const awbQueue = createQueue(QUEUES.E4_SAMEDAY_AWB_CREATE);
      await awbQueue.add("create-awb", {
        orderId: id,
        tenantId,
        ...buildProvenanceContext(req),
      });
    }

    return reply.send({ success: true, data: updated });
  });

  // ── DELETE /orders/:id (soft delete — admin) ──────────────────────────────

  app.delete("/:id", { ...adminAuth, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [existing] = await db
      .select({ status: goldOrders.status })
      .from(goldOrders)
      .where(and(eq(goldOrders.id, id), eq(goldOrders.tenantId, tenantId)))
      .limit(1);

    if (!existing) return reply.status(404).send({ success: false, error: "Order not found" });
    if (!["DRAFT", "CANCELLED"].includes(existing.status)) {
      return reply
        .status(400)
        .send({ success: false, error: "Only DRAFT or CANCELLED orders can be deleted" });
    }

    await db
      .update(goldOrders)
      .set({ deletedAt: new Date() })
      .where(and(eq(goldOrders.id, id), eq(goldOrders.tenantId, tenantId)));

    req.log.info({ provenance: buildProvenanceContext(req), orderId: id }, "order:soft-deleted");
    e4OrdersSoftDeletedTotal.inc();
    return reply.send({ success: true, data: { deleted: true } });
  });

  // ── GET /orders/:id/payments ──────────────────────────────────────────────

  app.get("/:id/payments", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const query = paymentsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const [order] = await db
      .select({ id: goldOrders.id })
      .from(goldOrders)
      .where(and(eq(goldOrders.id, id), eq(goldOrders.tenantId, tenantId)))
      .limit(1);

    if (!order) return reply.status(404).send({ success: false, error: "Order not found" });

    const conditions = [eq(goldPayments.tenantId, tenantId), eq(goldPayments.orderId, id)];
    if (query.source) conditions.push(eq(goldPayments.externalSource, query.source));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(goldPayments)
        .where(and(...conditions))
        .orderBy(desc(goldPayments.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldPayments)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total },
    });
  });
}
