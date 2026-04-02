/**
 * A6 — product:variant:process (concurrency: 10)
 *
 * Procesează variantele unui produs. Variantele sunt stocate în gold_products.metadata JSONB
 * sub cheia "variants" — nu există tabelă separată.
 *
 * Dacă o variantă are variantAsSeparateProduct=true în metadata,
 * enqueue product:ingest pentru acel SKU de variantă.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldProducts, eq, and, sql } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";

const LOG = "[a6-product-variant-process]";

export interface ProductVariant {
  sku: string;
  name: string;
  attributes: Record<string, unknown>;
  unitPrice?: string;
  variantAsSeparateProduct?: boolean;
}

export interface ProductVariantProcessJobData {
  tenantId: string;
  productId: string;
  variants: ProductVariant[];
}

export interface ProductVariantProcessResult {
  ok: true;
  productId: string;
  variantsProcessed: number;
}

export const productVariantProcessProcessor: Processor<
  ProductVariantProcessJobData,
  ProductVariantProcessResult
> = async (job) => {
  const { tenantId, productId, variants } = job.data;
  await setSessionTenantId(tenantId);

  if (!variants || variants.length === 0) {
    console.info(`${LOG} no variants provided productId=${productId}`);
    return { ok: true, productId, variantsProcessed: 0 };
  }

  // Verifică că produsul există
  const existing = await db
    .select({ id: goldProducts.id, metadata: goldProducts.metadata })
    .from(goldProducts)
    .where(and(eq(goldProducts.id, productId), eq(goldProducts.tenantId, tenantId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`${LOG} product not found productId=${productId} tenant=${tenantId}`);
  }

  // UPDATE metadata JSONB: setează cheia "variants"
  await db
    .update(goldProducts)
    .set({
      metadata: sql`jsonb_set(COALESCE(${goldProducts.metadata}, '{}'), '{variants}', ${JSON.stringify(variants)}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(and(eq(goldProducts.id, productId), eq(goldProducts.tenantId, tenantId)));

  console.info(
    `${LOG} updated variants productId=${productId} count=${variants.length} tenant=${tenantId}`,
  );

  // Dacă vreo variantă are variantAsSeparateProduct=true → enqueue product:ingest
  const separateVariants = variants.filter((v) => v.variantAsSeparateProduct === true);
  if (separateVariants.length > 0) {
    const ingestQueue = createQueue("product:ingest", { defaultJobOptions: DEFAULT_JOB_OPTIONS });
    for (const variant of separateVariants) {
      await ingestQueue.add("product:ingest", {
        tenantId,
        productData: {
          name: variant.name,
          sku: variant.sku,
          unitPrice: variant.unitPrice,
          metadata: {
            ...variant.attributes,
            parentProductId: productId,
            isVariant: true,
          },
        },
      });
      console.info(`${LOG} enqueued ingest for variant sku=${variant.sku} productId=${productId}`);
    }
  }

  return { ok: true, productId, variantsProcessed: variants.length };
};
