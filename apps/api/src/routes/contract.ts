/**
 * Etapa 4 — Contract API Routes (E4 Post-Sale: Contracte DocuSign)
 * Prefix registered at: /api/v1/contracts
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  sql,
  eq,
  and,
  desc,
  goldContracts,
  goldContractTemplates,
  goldContractClauses,
  goldAuditLogsEtapa4,
  goldCompanies,
  goldOrders,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireRole } from "../middleware/authz.js";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e4ContractsGeneratedTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.uuid() });
const orderIdParamSchema = z.object({ orderId: z.uuid() });

const contractsQuerySchema = z.object({
  clientId: z.uuid().optional(),
  status: z
    .enum(["DRAFT", "PENDING_SIGNATURE", "SENT_DOCUSIGN", "SIGNED", "EXPIRED", "CANCELLED"])
    .optional(),
  riskTier: z.enum(["BLOCKED", "LOW", "MEDIUM", "HIGH", "PREMIUM"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const generateContractSchema = z.object({
  clientId: z.uuid(),
  validForDays: z.number().int().min(1).max(365).default(30),
  customClauses: z.array(z.string()).optional(),
});

const auditQuerySchema = z.object({
  entityType: z.string().max(100).optional(),
  entityId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function contractRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  const writeLimiter = app.rateLimit({ max: 10, timeWindow: "1 minute" });

  // ── GET /contracts ─────────────────────────────────────────────────────────

  app.get("/", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = contractsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldContracts.tenantId, tenantId)];
    if (query.clientId) conditions.push(eq(goldContracts.clientId, query.clientId));
    if (query.status) conditions.push(eq(goldContracts.status, query.status));
    if (query.riskTier) conditions.push(eq(goldContracts.riskTier, query.riskTier));

    const [rows, countResult] = await Promise.all([
      db
        .select({
          contract: goldContracts,
          companyName: goldCompanies.denumire,
          cui: goldCompanies.cui,
          orderNumber: goldOrders.orderNumber,
        })
        .from(goldContracts)
        .leftJoin(goldCompanies, eq(goldContracts.clientId, goldCompanies.id))
        .leftJoin(goldOrders, eq(goldContracts.orderId, goldOrders.id))
        .where(and(...conditions))
        .orderBy(desc(goldContracts.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldContracts)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => ({
        ...r.contract,
        companyName: r.companyName,
        cui: r.cui,
        orderNumber: r.orderNumber,
      })),
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /contracts/:id ─────────────────────────────────────────────────────

  app.get("/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [row] = await db
      .select({
        contract: goldContracts,
        companyName: goldCompanies.denumire,
        cui: goldCompanies.cui,
        orderNumber: goldOrders.orderNumber,
      })
      .from(goldContracts)
      .leftJoin(goldCompanies, eq(goldContracts.clientId, goldCompanies.id))
      .leftJoin(goldOrders, eq(goldContracts.orderId, goldOrders.id))
      .where(and(eq(goldContracts.id, id), eq(goldContracts.tenantId, tenantId)))
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: "Contract not found" });

    return reply.send({
      success: true,
      data: {
        ...row.contract,
        companyName: row.companyName,
        cui: row.cui,
        orderNumber: row.orderNumber,
      },
    });
  });

  // ── POST /contracts/orders/:orderId/generate ──────────────────────────────

  app.post(
    "/orders/:orderId/generate",
    { ...authOpts, preHandler: [writeLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { orderId } = orderIdParamSchema.parse(req.params);
      const body = generateContractSchema.parse(req.body);

      const [order] = await db
        .select({ id: goldOrders.id, status: goldOrders.status })
        .from(goldOrders)
        .where(and(eq(goldOrders.id, orderId), eq(goldOrders.tenantId, tenantId)))
        .limit(1);

      if (!order) return reply.status(404).send({ success: false, error: "Order not found" });
      if (order.status !== "CREDIT_APPROVED") {
        return reply.status(400).send({
          success: false,
          error: `Contract generation requires order status CREDIT_APPROVED. Current: ${order.status}`,
        });
      }

      const [contract] = await db
        .insert(goldContracts)
        .values({
          tenantId,
          clientId: body.clientId,
          orderId,
          status: "DRAFT",
          validForDays: body.validForDays,
          expiresAt: new Date(Date.now() + body.validForDays * 24 * 60 * 60 * 1000),
          clausesUsed: body.customClauses ?? [],
        })
        .returning();

      const generateQueue = createQueue(QUEUES.E4_CONTRACT_GENERATE);
      await generateQueue.add("generate", {
        contractId: contract.id,
        orderId,
        clientId: body.clientId,
        tenantId,
        customClauses: body.customClauses ?? [],
        ...buildProvenanceContext(req),
      });

      e4ContractsGeneratedTotal.inc();
      return reply.status(201).send({ success: true, data: contract });
    },
  );

  // ── POST /contracts/:id/send-docusign ─────────────────────────────────────

  app.post(
    "/:id/send-docusign",
    { ...authOpts, preHandler: [writeLimiter] },
    async (req, reply) => {
      const tenantId = requireTenantId(req);
      const { id } = idParamSchema.parse(req.params);

      const [contract] = await db
        .select({ id: goldContracts.id, status: goldContracts.status })
        .from(goldContracts)
        .where(and(eq(goldContracts.id, id), eq(goldContracts.tenantId, tenantId)))
        .limit(1);

      if (!contract) return reply.status(404).send({ success: false, error: "Contract not found" });
      if (!["DRAFT", "PENDING_SIGNATURE"].includes(contract.status)) {
        return reply.status(400).send({
          success: false,
          error: `DocuSign send requires DRAFT or PENDING_SIGNATURE status. Current: ${contract.status}`,
        });
      }

      const docusignQueue = createQueue(QUEUES.E4_CONTRACT_DOCUSIGN_SEND);
      const job = await docusignQueue.add("send-docusign", {
        contractId: id,
        tenantId,
        ...buildProvenanceContext(req),
      });

      return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
    },
  );

  // ── GET /contracts/templates ───────────────────────────────────────────────

  app.get("/templates", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const templates = await db
      .select()
      .from(goldContractTemplates)
      .where(eq(goldContractTemplates.tenantId, tenantId))
      .orderBy(desc(goldContractTemplates.version));

    return reply.send({ success: true, data: templates });
  });

  // ── GET /contracts/clauses (admin) ────────────────────────────────────────

  app.get("/clauses", { ...adminAuth }, async (req, reply) => {
    requireTenantId(req);
    const query = z
      .object({ riskTier: z.enum(["BLOCKED", "LOW", "MEDIUM", "HIGH", "PREMIUM"]).optional() })
      .parse(req.query);

    const clauses = await db
      .select()
      .from(goldContractClauses)
      .where(
        query.riskTier
          ? sql`${goldContractClauses.applicableRiskTiers} @> ARRAY[${query.riskTier}]::text[]`
          : undefined,
      )
      .orderBy(goldContractClauses.code);

    return reply.send({ success: true, data: clauses });
  });

  // ── GET /contracts/audit ──────────────────────────────────────────────────

  app.get("/audit", { ...adminAuth }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = auditQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldAuditLogsEtapa4.tenantId, tenantId)];
    if (query.entityType) conditions.push(eq(goldAuditLogsEtapa4.entityType, query.entityType));
    if (query.entityId) conditions.push(eq(goldAuditLogsEtapa4.entityId, query.entityId));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(goldAuditLogsEtapa4)
        .where(and(...conditions))
        .orderBy(desc(goldAuditLogsEtapa4.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldAuditLogsEtapa4)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows,
      meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    });
  });

  // ── GET /contracts/stats ───────────────────────────────────────────────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const byStatus = await db
      .select({
        status: goldContracts.status,
        count: sql<number>`count(*)::int`,
      })
      .from(goldContracts)
      .where(eq(goldContracts.tenantId, tenantId))
      .groupBy(goldContracts.status);

    const [expiring] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(goldContracts)
      .where(
        and(
          eq(goldContracts.tenantId, tenantId),
          sql`${goldContracts.expiresAt} <= now() + interval '7 days'`,
          sql`${goldContracts.expiresAt} > now()`,
          sql`${goldContracts.status} not in ('CANCELLED','SIGNED')`,
        ),
      );

    return reply.send({
      success: true,
      data: { byStatus, expiringIn7Days: expiring?.count ?? 0 },
    });
  });
}
