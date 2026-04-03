/**
 * Etapa 3 — Fiscal API Routes (E3 Oblio Invoicing + eFactura SPV)
 * Prefix registered at: /api/v1/fiscal
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  oblioDocuments,
  einvoiceSubmissions,
  fiscalAuditTrail,
  goldCompanies,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e3FiscalDocumentsTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.uuid() });

const oblioDocumentsQuerySchema = z.object({
  documentType: z.enum(["PROFORMA", "INVOICE", "CREDIT_NOTE"]).optional(),
  status: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createProformaSchema = z.object({
  leadId: z.uuid(),
  negotiationId: z.uuid().optional(),
  series: z.string().max(50).optional(),
  subtotal: z.number().positive(),
  vat: z.number().min(0),
  notes: z.string().max(2000).optional(),
});

const createInvoiceSchema = z.object({
  proformaId: z.uuid(),
  negotiationId: z.uuid().optional(),
});

const einvoiceQuerySchema = z.object({
  status: z
    .enum(["PENDING", "SENDING", "SENT", "PROCESSING", "VALIDATED", "REJECTED", "ERROR"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const fiscalTimelineQuerySchema = z.object({
  leadId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function fiscalRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const writeLimiter = app.rateLimit({ max: 20, timeWindow: "1 minute" });

  // ── GET /fiscal/oblio/documents ──────────────────────────────────────────

  app.get("/oblio/documents", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = oblioDocumentsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(oblioDocuments.tenantId, tenantId)];
    if (query.documentType) conditions.push(eq(oblioDocuments.documentType, query.documentType));
    if (query.status) conditions.push(eq(oblioDocuments.status, query.status));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(oblioDocuments)
        .where(and(...conditions))
        .orderBy(desc(oblioDocuments.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(oblioDocuments)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /fiscal/oblio/documents/:id ─────────────────────────────────────

  app.get("/oblio/documents/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [doc] = await db
      .select()
      .from(oblioDocuments)
      .where(and(eq(oblioDocuments.id, id), eq(oblioDocuments.tenantId, tenantId)))
      .limit(1);

    if (!doc) return reply.status(404).send({ success: false, error: "Document not found" });

    const einvoice = await db
      .select()
      .from(einvoiceSubmissions)
      .where(eq(einvoiceSubmissions.oblioDocumentId, id))
      .limit(1);

    return reply.send({
      success: true,
      data: { ...doc, einvoiceSubmission: einvoice[0] ?? null },
    });
  });

  // ── POST /fiscal/oblio/proforma ──────────────────────────────────────────

  app.post("/oblio/proforma", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createProformaSchema.parse(req.body);

    const [company] = await db
      .select({ id: goldCompanies.id, cui: goldCompanies.cui })
      .from(goldCompanies)
      .where(and(eq(goldCompanies.id, body.leadId), eq(goldCompanies.tenantId, tenantId)))
      .limit(1);

    if (!company) return reply.status(404).send({ success: false, error: "Lead not found" });

    const total = body.subtotal + body.vat;
    const [doc] = await db
      .insert(oblioDocuments)
      .values({
        tenantId,
        documentType: "PROFORMA",
        series: body.series ?? null,
        status: "PENDING",
        subtotal: String(body.subtotal),
        vat: String(body.vat),
        total: String(total),
      })
      .returning();

    const proformaQueue = createQueue(QUEUES.E3_OBLIO_PROFORMA_CREATE);
    await proformaQueue.add("create-proforma", {
      documentId: doc.id,
      leadId: body.leadId,
      negotiationId: body.negotiationId ?? null,
      tenantId,
      notes: body.notes ?? null,
      ...buildProvenanceContext(req),
    });

    e3FiscalDocumentsTotal.inc({ type: "proforma" });
    return reply.status(201).send({ success: true, data: doc });
  });

  // ── POST /fiscal/oblio/invoice ─────────────────────────────────────────── ───────────────────────────────────────────

  app.post("/oblio/invoice", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createInvoiceSchema.parse(req.body);

    const [proforma] = await db
      .select()
      .from(oblioDocuments)
      .where(
        and(
          eq(oblioDocuments.id, body.proformaId),
          eq(oblioDocuments.tenantId, tenantId),
          eq(oblioDocuments.documentType, "PROFORMA"),
        ),
      )
      .limit(1);

    if (!proforma) return reply.status(404).send({ success: false, error: "Proforma not found" });
    if (proforma.status === "CANCELLED")
      return reply
        .status(400)
        .send({ success: false, error: "Cannot invoice a cancelled proforma" });

    const [invoice] = await db
      .insert(oblioDocuments)
      .values({
        tenantId,
        documentType: "INVOICE",
        status: "PENDING",
        subtotal: proforma.subtotal,
        vat: proforma.vat,
        total: proforma.total,
      })
      .returning();

    const invoiceQueue = createQueue(QUEUES.E3_OBLIO_INVOICE_CREATE);
    await invoiceQueue.add("create-invoice", {
      invoiceDocumentId: invoice.id,
      proformaDocumentId: body.proformaId,
      negotiationId: body.negotiationId ?? null,
      tenantId,
      ...buildProvenanceContext(req),
    });

    e3FiscalDocumentsTotal.inc({ type: "invoice" });
    return reply.status(201).send({ success: true, data: invoice });
  });

  // ── POST /fiscal/oblio/einvoice/:id ─────────────────────────────────────

  app.post(
    "/oblio/einvoice/:id",
    { ...authOpts, preHandler: [writeLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);

      const [invoice] = await db
        .select()
        .from(oblioDocuments)
        .where(
          and(
            eq(oblioDocuments.id, id),
            eq(oblioDocuments.tenantId, tenantId),
            eq(oblioDocuments.documentType, "INVOICE"),
          ),
        )
        .limit(1);

      if (!invoice) return reply.status(404).send({ success: false, error: "Invoice not found" });

      const existing = await db
        .select({ id: einvoiceSubmissions.id, status: einvoiceSubmissions.status })
        .from(einvoiceSubmissions)
        .where(eq(einvoiceSubmissions.oblioDocumentId, id))
        .limit(1);

      if (existing[0]?.status === "VALIDATED")
        return reply.status(400).send({
          success: false,
          error: "eFactura already validated for this invoice",
        });

      const [submission] = await db
        .insert(einvoiceSubmissions)
        .values({
          oblioDocumentId: id,
          tenantId,
          status: "PENDING",
        })
        .returning();

      const einvoiceQueue = createQueue(QUEUES.E3_EINVOICE_SEND);
      await einvoiceQueue.add("send-einvoice", {
        submissionId: submission.id,
        documentId: id,
        tenantId,
        ...buildProvenanceContext(req),
      });

      e3FiscalDocumentsTotal.inc({ type: "einvoice" });
      return reply.status(201).send({ success: true, data: submission });
    },
  );

  // ── GET /fiscal/einvoice/submissions ────────────────────────────────────

  app.get("/einvoice/submissions", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = einvoiceQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(einvoiceSubmissions.tenantId, tenantId)];
    if (query.status) conditions.push(eq(einvoiceSubmissions.status, query.status));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(einvoiceSubmissions)
        .where(and(...conditions))
        .orderBy(desc(einvoiceSubmissions.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(einvoiceSubmissions)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /fiscal/einvoice/submissions/:id ────────────────────────────────

  app.get("/einvoice/submissions/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [sub] = await db
      .select()
      .from(einvoiceSubmissions)
      .where(and(eq(einvoiceSubmissions.id, id), eq(einvoiceSubmissions.tenantId, tenantId)))
      .limit(1);

    if (!sub) return reply.status(404).send({ success: false, error: "Submission not found" });
    return reply.send({ success: true, data: sub });
  });

  // ── GET /fiscal/timeline ─────────────────────────────────────────────────

  app.get("/timeline", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = fiscalTimelineQuerySchema.parse(req.query);

    const trail = await db
      .select()
      .from(fiscalAuditTrail)
      .where(
        and(eq(fiscalAuditTrail.tenantId, tenantId), eq(fiscalAuditTrail.entityId, query.leadId)),
      )
      .orderBy(desc(fiscalAuditTrail.createdAt))
      .limit(query.limit);

    return reply.send({ success: true, data: trail });
  });

  // ── GET /fiscal/oblio/stats ───────────────────────────────────────────────

  app.get("/oblio/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byType = await db
      .select({
        documentType: oblioDocuments.documentType,
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${oblioDocuments.total}), 0)::text`,
      })
      .from(oblioDocuments)
      .where(eq(oblioDocuments.tenantId, tenantId))
      .groupBy(oblioDocuments.documentType);

    const [einvoiceStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        validated: sql<number>`count(*) filter (where ${einvoiceSubmissions.status} = 'VALIDATED')::int`,
        pending: sql<number>`count(*) filter (where ${einvoiceSubmissions.status} in ('PENDING', 'SENDING', 'SENT'))::int`,
        rejected: sql<number>`count(*) filter (where ${einvoiceSubmissions.status} = 'REJECTED')::int`,
      })
      .from(einvoiceSubmissions)
      .where(eq(einvoiceSubmissions.tenantId, tenantId));

    return reply.send({
      success: true,
      data: { oblioByType: byType, einvoice: einvoiceStats },
    });
  });
}
