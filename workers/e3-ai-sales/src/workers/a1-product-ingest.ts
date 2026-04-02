/**
 * A1 — product:ingest (concurrency: 5)
 *
 * UPSERT gold_products per tenant. Dacă SKU există → UPDATE, altfel → INSERT.
 * Trigger downstream: product:embed + product:chunk.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldProducts, eq, and } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";
import { randomUUID } from "node:crypto";

const LOG = "[a1-product-ingest]";

export interface ProductIngestJobData {
  tenantId: string;
  productData: {
    name: string;
    sku?: string;
    description?: string;
    categoryId?: string;
    unitPrice?: string;
    currency?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ProductIngestResult {
  ok: true;
  productId: string;
  action: "inserted" | "updated";
}

export const productIngestProcessor: Processor<ProductIngestJobData, ProductIngestResult> = async (
  job,
) => {
  const { tenantId, productData } = job.data;
  await setSessionTenantId(tenantId);

  const { name, sku, description, categoryId, unitPrice, currency, metadata } = productData;

  let productId: string;
  let action: "inserted" | "updated";

  if (sku) {
    // Verifică dacă SKU există deja pentru acest tenant
    const existing = await db
      .select({ id: goldProducts.id })
      .from(goldProducts)
      .where(and(eq(goldProducts.tenantId, tenantId), eq(goldProducts.sku, sku)))
      .limit(1);

    if (existing.length > 0) {
      // UPDATE produs existent
      productId = existing[0].id;
      await db
        .update(goldProducts)
        .set({
          name,
          description: description ?? null,
          unitPrice: unitPrice ?? null,
          categoryId: categoryId ?? null,
          currency: currency ?? "RON",
          metadata: metadata ?? {},
          updatedAt: new Date(),
        })
        .where(eq(goldProducts.id, productId));
      action = "updated";
      console.info(`${LOG} updated product id=${productId} sku=${sku} tenant=${tenantId}`);
    } else {
      // INSERT nou cu SKU dat
      productId = randomUUID();
      await db.insert(goldProducts).values({
        id: productId,
        tenantId,
        name,
        sku,
        description: description ?? null,
        unitPrice: unitPrice ?? null,
        categoryId: categoryId ?? null,
        currency: currency ?? "RON",
        metadata: metadata ?? {},
      });
      action = "inserted";
      console.info(`${LOG} inserted product id=${productId} sku=${sku} tenant=${tenantId}`);
    }
  } else {
    // Fără SKU → INSERT nou cu UUID generat
    productId = randomUUID();
    await db.insert(goldProducts).values({
      id: productId,
      tenantId,
      name,
      sku: null,
      description: description ?? null,
      unitPrice: unitPrice ?? null,
      categoryId: categoryId ?? null,
      currency: currency ?? "RON",
      metadata: metadata ?? {},
    });
    action = "inserted";
    console.info(`${LOG} inserted product id=${productId} (no sku) tenant=${tenantId}`);
  }

  // Trigger downstream: product:embed
  const embedQueue = createQueue("product:embed", { defaultJobOptions: DEFAULT_JOB_OPTIONS });
  await embedQueue.add("product:embed", { tenantId, productId });

  // Trigger downstream: product:chunk
  const chunkQueue = createQueue("product:chunk", { defaultJobOptions: DEFAULT_JOB_OPTIONS });
  await chunkQueue.add("product:chunk", { tenantId, productId });

  return { ok: true, productId, action };
};
