/**
 * Etapa 3 — Product API Routes (E3 AI Sales Product Knowledge + Hybrid Search)
 * Prefix registered at: /api/v1/products
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
  goldProducts,
  goldProductCategories,
  goldProductChunks,
  goldProductEmbeddings,
  stockInventory,
} from "@cerniq/db";
import { createQueue } from "../lib/queue-factory.js";
import { QUEUES } from "@cerniq/worker-shared";
import { requireRole } from "../middleware/authz.js";
import { requireTenantId } from "./utils.js";
import { buildProvenanceContext } from "../lib/provenance.js";
import { e3ProductsCreatedTotal } from "../plugins/metrics.js";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.uuid() });

const productsQuerySchema = z.object({
  categoryId: z.uuid().optional(),
  search: z.string().max(200).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().max(100).optional(),
  description: z.string().max(10000).optional(),
  categoryId: z.uuid().optional(),
  unitPrice: z.number().positive().optional(),
  currency: z.string().length(3).default("RON"),
});

const patchProductSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    sku: z.string().max(100).optional(),
    description: z.string().max(10000).optional(),
    categoryId: z.uuid().nullable().optional(),
    unitPrice: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "At least one field required" });

export const hybridSearchSchema = z
  .object({
    query: z.string().min(1).max(500).optional(),
    q: z.string().min(1).max(500).optional(),
    categoryId: z.uuid().optional(),
    limit: z.number().int().min(1).max(50).default(10),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
  })
  .superRefine((data, ctx) => {
    const text = (data.query ?? data.q ?? "").trim();
    if (text.length === 0) {
      ctx.addIssue({ code: "custom", message: "q or query is required" });
    }
  })
  .transform((data) => ({
    query: (data.query ?? data.q ?? "").trim(),
    categoryId: data.categoryId,
    limit: data.limit,
    minPrice: data.minPrice,
    maxPrice: data.maxPrice,
  }));

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ─── Route Registration ───────────────────────────────────────────────────────

export async function productRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };
  const adminAuth = {
    onRequest: [async (req: FastifyRequest) => req.jwtVerify(), requireRole("admin")],
  };

  const writeLimiter = app.rateLimit({ max: 30, timeWindow: "1 minute" });
  const searchLimiter = app.rateLimit({ max: 60, timeWindow: "1 minute" });

  // ── GET /products ──────────────────────────────────────────────────────────

  app.get("/", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const query = productsQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const conditions = [eq(goldProducts.tenantId, tenantId)];
    if (query.categoryId) conditions.push(eq(goldProducts.categoryId, query.categoryId));
    if (query.isActive !== undefined) conditions.push(eq(goldProducts.isActive, query.isActive));
    if (query.search?.trim()) {
      const pattern = `%${query.search.trim()}%`;
      conditions.push(sql`${goldProducts.name} ILIKE ${pattern}`);
    }

    const [rows, countResult] = await Promise.all([
      db
        .select({
          product: goldProducts,
          categoryName: goldProductCategories.name,
          stockTotal: stockInventory.totalQuantity,
          stockReserved: stockInventory.reservedQuantity,
        })
        .from(goldProducts)
        .leftJoin(goldProductCategories, eq(goldProducts.categoryId, goldProductCategories.id))
        .leftJoin(
          stockInventory,
          and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.productId, goldProducts.id)),
        )
        .where(and(...conditions))
        .orderBy(desc(goldProducts.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(goldProducts)
        .where(and(...conditions)),
    ]);

    const productIds = rows.map((r) => r.product.id);
    const chunkCounts = new Map<string, number>();
    const embeddedIds = new Set<string>();
    if (productIds.length > 0) {
      const [chunkAgg, embRows] = await Promise.all([
        db
          .select({
            productId: goldProductChunks.productId,
            cnt: sql<number>`count(*)::int`.mapWith(Number),
          })
          .from(goldProductChunks)
          .where(
            and(
              eq(goldProductChunks.tenantId, tenantId),
              inArray(goldProductChunks.productId, productIds),
            ),
          )
          .groupBy(goldProductChunks.productId),
        db
          .select({ productId: goldProductEmbeddings.productId })
          .from(goldProductEmbeddings)
          .where(
            and(
              eq(goldProductEmbeddings.tenantId, tenantId),
              inArray(goldProductEmbeddings.productId, productIds),
            ),
          ),
      ]);
      for (const c of chunkAgg) {
        if (c.productId) chunkCounts.set(c.productId, c.cnt);
      }
      for (const e of embRows) {
        if (e.productId) embeddedIds.add(e.productId);
      }
    }

    const total = countResult[0]?.count ?? 0;
    return reply.send({
      success: true,
      data: rows.map((r) => {
        const totalQty = r.stockTotal ?? 0;
        const reserved = r.stockReserved ?? 0;
        const available = Math.max(0, totalQty - reserved);
        const pid = r.product.id;
        return {
          ...r.product,
          categoryName: r.categoryName,
          stockAvailable: available,
          chunkCount: chunkCounts.get(pid) ?? 0,
          hasEmbedding: embeddedIds.has(pid),
        };
      }),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  });

  // ── GET /products/:id ─────────────────────────────────────────────────────

  app.get("/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [row] = await db
      .select({
        product: goldProducts,
        categoryName: goldProductCategories.name,
      })
      .from(goldProducts)
      .leftJoin(goldProductCategories, eq(goldProducts.categoryId, goldProductCategories.id))
      .where(and(eq(goldProducts.id, id), eq(goldProducts.tenantId, tenantId)))
      .limit(1);

    if (!row) return reply.status(404).send({ success: false, error: "Product not found" });

    const [stockRow] = await db
      .select()
      .from(stockInventory)
      .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.productId, id)))
      .limit(1);

    const embeddingsResult = await db.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM gold.gold_product_embeddings WHERE tenant_id = ${tenantId} AND product_id = ${id}`,
    );
    const embeddingsCount = embeddingsResult[0]?.count ?? 0;

    return reply.send({
      success: true,
      data: {
        ...row.product,
        categoryName: row.categoryName,
        stock: stockRow ?? null,
        embeddingsCount: embeddingsCount,
      },
    });
  });

  // ── POST /products ────────────────────────────────────────────────────────

  app.post("/", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createProductSchema.parse(req.body);
    const provenance = buildProvenanceContext(req);

    const [product] = await db
      .insert(goldProducts)
      .values({
        tenantId,
        name: body.name,
        sku: body.sku ?? null,
        description: body.description ?? null,
        categoryId: body.categoryId ?? null,
        unitPrice: body.unitPrice === undefined ? null : String(body.unitPrice),
        currency: body.currency,
        isActive: true,
      })
      .returning();

    req.log.info({ provenance, productId: product.id }, "product:created");
    e3ProductsCreatedTotal.inc();
    return reply.status(201).send({ success: true, data: product });
  });

  // ── PATCH /products/:id ───────────────────────────────────────────────────

  app.patch("/:id", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);
    const body = patchProductSchema.parse(req.body);
    const provenance = buildProvenanceContext(req);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.sku !== undefined) patch.sku = body.sku;
    if (body.description !== undefined) patch.description = body.description;
    if (body.categoryId !== undefined) patch.categoryId = body.categoryId;
    if (body.unitPrice !== undefined) patch.unitPrice = String(body.unitPrice);
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const [updated] = await db
      .update(goldProducts)
      .set(patch as typeof goldProducts.$inferInsert)
      .where(and(eq(goldProducts.id, id), eq(goldProducts.tenantId, tenantId)))
      .returning();

    if (!updated) return reply.status(404).send({ success: false, error: "Product not found" });
    req.log.info({ provenance, productId: id }, "product:updated");
    return reply.send({ success: true, data: updated });
  });

  // ── POST /products/:id/ingest ─────────────────────────────────────────────

  app.post("/:id/ingest", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [product] = await db
      .select({ id: goldProducts.id })
      .from(goldProducts)
      .where(and(eq(goldProducts.id, id), eq(goldProducts.tenantId, tenantId)))
      .limit(1);

    if (!product) return reply.status(404).send({ success: false, error: "Product not found" });

    const ingestQueue = createQueue(QUEUES.E3_PRODUCT_INGEST);
    const job = await ingestQueue.add("ingest", {
      productId: id,
      tenantId,
      ...buildProvenanceContext(req),
    });

    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  // ── POST /products/:id/embed ───────────────────────────────────────────────

  app.post("/:id/embed", { ...authOpts, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [product] = await db
      .select({ id: goldProducts.id })
      .from(goldProducts)
      .where(and(eq(goldProducts.id, id), eq(goldProducts.tenantId, tenantId)))
      .limit(1);

    if (!product) return reply.status(404).send({ success: false, error: "Product not found" });

    const embedQueue = createQueue(QUEUES.E3_PRODUCT_EMBED);
    const job = await embedQueue.add("embed", {
      productId: id,
      tenantId,
      ...buildProvenanceContext(req),
    });

    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });

  // ── POST /products/search (hybrid RRF) ────────────────────────────────────

  app.post("/search", { ...authOpts, preHandler: [searchLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = hybridSearchSchema.parse(req.body);

    const rrfQueue = createQueue(QUEUES.E3_SEARCH_RRF_FUSE);
    const job = await rrfQueue.add("hybrid-search", {
      query: body.query,
      tenantId,
      categoryId: body.categoryId ?? null,
      limit: body.limit,
      minPrice: body.minPrice ?? null,
      maxPrice: body.maxPrice ?? null,
      ...buildProvenanceContext(req),
    });

    return reply.send({
      success: true,
      data: { jobId: job.id ?? "queued", status: "PROCESSING" },
      meta: { query: body.query, limit: body.limit },
    });
  });

  // ── GET /products/categories ───────────────────────────────────────────────

  app.get("/categories", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const categories = await db
      .select()
      .from(goldProductCategories)
      .where(eq(goldProductCategories.tenantId, tenantId))
      .orderBy(asc(goldProductCategories.sortOrder), asc(goldProductCategories.name));

    return reply.send({ success: true, data: categories });
  });

  // ── POST /products/categories ──────────────────────────────────────────────

  app.post("/categories", { ...adminAuth, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const body = createCategorySchema.parse(req.body);

    if (body.parentId) {
      const [parent] = await db
        .select({ id: goldProductCategories.id })
        .from(goldProductCategories)
        .where(
          and(
            eq(goldProductCategories.id, body.parentId),
            eq(goldProductCategories.tenantId, tenantId),
          ),
        )
        .limit(1);
      if (!parent)
        return reply.status(404).send({ success: false, error: "Parent category not found" });
    }

    const [cat] = await db
      .insert(goldProductCategories)
      .values({
        tenantId,
        name: body.name,
        parentId: body.parentId ?? null,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();

    req.log.info(
      { provenance: buildProvenanceContext(req), categoryId: cat.id },
      "product-category:created",
    );
    return reply.status(201).send({ success: true, data: cat });
  });

  // ── GET /products/stats ────────────────────────────────────────────────────

  app.get("/stats", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${goldProducts.isActive} = true)::int`,
        withEmbeddings: sql<number>`count(*) filter (where ${goldProducts.description} is not null)::int`,
      })
      .from(goldProducts)
      .where(eq(goldProducts.tenantId, tenantId));

    const [stockStats] = await db
      .select({
        totalSkus: sql<number>`count(*)::int`,
        totalStock: sql<number>`coalesce(sum(${stockInventory.totalQuantity}), 0)::int`,
        reserved: sql<number>`coalesce(sum(${stockInventory.reservedQuantity}), 0)::int`,
      })
      .from(stockInventory)
      .where(eq(stockInventory.tenantId, tenantId));

    return reply.send({
      success: true,
      data: {
        products: stats,
        inventory: stockStats,
      },
    });
  });

  // ── GET /products/:id/stock ───────────────────────────────────────────────

  app.get("/:id/stock", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [stock] = await db
      .select()
      .from(stockInventory)
      .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.productId, id)))
      .limit(1);

    if (!stock) return reply.status(404).send({ success: false, error: "Stock record not found" });

    const available = stock.totalQuantity - stock.reservedQuantity;
    return reply.send({
      success: true,
      data: { ...stock, availableQuantity: available },
    });
  });

  // ── POST /products/index/rebuild (admin) ─────────────────────────────────

  app.post("/index/rebuild", { ...adminAuth, preHandler: [writeLimiter] }, async (req, reply) => {
    const tenantId = requireTenantId(req);

    const indexQueue = createQueue(QUEUES.E3_PRODUCT_INDEX_REBUILD);
    const job = await indexQueue.add("rebuild", {
      tenantId,
      ...buildProvenanceContext(req),
    });

    return reply.send({ success: true, data: { jobId: job.id ?? "queued" } });
  });
}
