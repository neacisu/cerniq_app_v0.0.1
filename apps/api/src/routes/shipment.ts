/**
 * Etapa 4 — Shipment API Routes (E4 Post-Sale: Sameday AWB + Tracking)
 * Prefix registered at: /api/v1/shipments
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  goldShipments,
  goldShipmentTracking,
  goldCodCollections,
  goldAddresses,
  goldOrders,
  goldCompanies,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e4ShipmentsRequestedTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.uuid() });
const orderIdParamSchema = z.object({ orderId: z.uuid() });

const shipmentsQuerySchema = z.object({
  status: z
    .enum([
      "CREATED",
      "PICKED_UP",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "DELIVERY_FAILED",
      "RETURNED",
    ])
    .optional(),
  carrier: z.enum(["SAMEDAY", "FAN_COURIER", "CARGUS", "DPD", "GLS"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createAwbSchema = z.object({
  addressId: z.uuid().optional(),
  deliveryType: z.enum(["STANDARD", "EXPRESS", "LOCKER"]).default("STANDARD"),
  codType: z.enum(["NONE", "CASH", "CARD"]).default("NONE"),
  codAmount: z.number().min(0).default(0),
  weight: z.number().positive().optional(),
});

const createAddressSchema = z.object({
  clientId: z.uuid(),
  street: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  county: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2).default("RO"),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(32).optional(),
  isDefault: z.boolean().default(false),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function shipmentRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const writeLimiter = app.rateLimit({ max: 20, timeWindow: "1 minute" });

  // ── GET /shipments/stats (înainte de /:id) ─────────────────────────────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byStatus = await db
      .select({
        status: goldShipments.status,
        count: sql<number>`count(*)::int`,
      })
      .from(goldShipments)
      .where(eq(goldShipments.tenantId, tenantId))
      .groupBy(goldShipments.status);

    const [codStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        collected: sql<number>`count(*) filter (where ${goldShipments.codCollected} = true)::int`,
        codAmount: sql<string>`coalesce(sum(${goldShipments.codAmount}), 0)::text`,
      })
      .from(goldShipments)
      .where(and(eq(goldShipments.tenantId, tenantId), sql`${goldShipments.codType} != 'NONE'`));

    return reply.send({
      success: true,
      data: { byStatus, cod: codStats },
    });
  });

  app.get("/addresses/:clientId", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { clientId } = z.object({ clientId: z.uuid() }).parse(req.params);

    const addresses = await db
      .select()
      .from(goldAddresses)
      .where(and(eq(goldAddresses.tenantId, tenantId), eq(goldAddresses.clientId, clientId)))
      .orderBy(sql`${goldAddresses.isDefault} DESC`, desc(goldAddresses.createdAt));

    return reply.send({ success: true, data: addresses });
  });

  // ── POST /shipments/addresses ─────────────────────────────────────────────

  app.post("/addresses", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createAddressSchema.parse(req.body);

    const [company] = await db
      .select({ id: goldCompanies.id })
      .from(goldCompanies)
      .where(and(eq(goldCompanies.id, body.clientId), eq(goldCompanies.tenantId, tenantId)))
      .limit(1);

    if (!company) return reply.status(404).send({ success: false, error: "Client not found" });

    if (body.isDefault) {
      await db
        .update(goldAddresses)
        .set({ isDefault: false })
        .where(
          and(eq(goldAddresses.tenantId, tenantId), eq(goldAddresses.clientId, body.clientId)),
        );
    }

    const [address] = await db
      .insert(goldAddresses)
      .values({
        tenantId,
        clientId: body.clientId,
        street: body.street ?? null,
        city: body.city,
        county: body.county ?? null,
        postalCode: body.postalCode ?? null,
        country: body.country,
        contactName: body.contactName ?? null,
        contactPhone: body.contactPhone ?? null,
        isDefault: body.isDefault,
      })
      .returning();

    req.log.info(
      { provenance: buildProvenanceContext(req), addressId: address.id },
      "address:created",
    );
    return reply.status(201).send({ success: true, data: address });
  });

  // ── GET /shipments ─────────────────────────────────────────────────────────

  app.get("/", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = shipmentsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldShipments.tenantId, tenantId)];
    if (query.status) conditions.push(eq(goldShipments.status, query.status));
    if (query.carrier) conditions.push(eq(goldShipments.carrier, query.carrier));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          shipment: goldShipments,
          orderNumber: goldOrders.orderNumber,
          companyName: goldCompanies.denumire,
          currency: goldOrders.currency,
        })
        .from(goldShipments)
        .leftJoin(goldOrders, eq(goldShipments.orderId, goldOrders.id))
        .leftJoin(goldCompanies, eq(goldOrders.leadId, goldCompanies.id))
        .where(and(...conditions))
        .orderBy(desc(goldShipments.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldShipments)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({
        ...r.shipment,
        orderNumber: r.orderNumber,
        companyName: r.companyName,
        currency: r.currency,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  });

  // ── GET /shipments/:id ─────────────────────────────────────────────────────

  app.get("/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [row] = await db
      .select({
        shipment: goldShipments,
        orderNumber: goldOrders.orderNumber,
        companyName: goldCompanies.denumire,
        currency: goldOrders.currency,
      })
      .from(goldShipments)
      .leftJoin(goldOrders, eq(goldShipments.orderId, goldOrders.id))
      .leftJoin(goldCompanies, eq(goldOrders.leadId, goldCompanies.id))
      .where(and(eq(goldShipments.id, id), eq(goldShipments.tenantId, tenantId)))
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: "Shipment not found" });

    const [trackingEvents, codCollections, address] = await Promise.all([
      db
        .select()
        .from(goldShipmentTracking)
        .where(eq(goldShipmentTracking.shipmentId, id))
        .orderBy(desc(goldShipmentTracking.eventTimestamp)),
      db.select().from(goldCodCollections).where(eq(goldCodCollections.shipmentId, id)),
      row.shipment.addressId
        ? db
            .select()
            .from(goldAddresses)
            .where(eq(goldAddresses.id, row.shipment.addressId))
            .limit(1)
        : Promise.resolve([]),
    ]);

    return reply.send({
      success: true,
      data: {
        ...row.shipment,
        orderNumber: row.orderNumber,
        companyName: row.companyName,
        currency: row.currency,
        trackingEvents,
        codCollections,
        deliveryAddress: address[0] ?? null,
      },
    });
  });

  // ── POST /shipments/orders/:orderId/create-awb ─────────────────────────────

  app.post(
    "/orders/:orderId/create-awb",
    { ...authOpts, preHandler: [writeLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { orderId } = orderIdParamSchema.parse(req.params);
      const body = createAwbSchema.parse(req.body);

      const [order] = await db
        .select({ id: goldOrders.id, status: goldOrders.status })
        .from(goldOrders)
        .where(and(eq(goldOrders.id, orderId), eq(goldOrders.tenantId, tenantId)))
        .limit(1);

      if (!order) return reply.status(404).send({ success: false, error: "Order not found" });
      if (!["READY_TO_SHIP", "STOCK_RESERVED"].includes(order.status)) {
        return reply.status(400).send({
          success: false,
          error: `AWB creation requires order status READY_TO_SHIP or STOCK_RESERVED. Current: ${order.status}`,
        });
      }

      const awbQueue = createQueue(QUEUES.E4_SAMEDAY_AWB_CREATE);
      const job = await awbQueue.add("create-awb-manual", {
        orderId,
        tenantId,
        addressId: body.addressId ?? null,
        deliveryType: body.deliveryType,
        codType: body.codType,
        codAmount: body.codAmount,
        weight: body.weight ?? null,
        ...buildProvenanceContext(req),
      });

      e4ShipmentsRequestedTotal.inc();
      return reply.send({
        success: true,
        data: { jobId: job.id ?? "queued", status: "PROCESSING" },
      });
    },
  );
}
