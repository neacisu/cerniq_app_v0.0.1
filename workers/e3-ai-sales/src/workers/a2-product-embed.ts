/**
 * A2 — product:embed (concurrency: 10, rateLimit: 60/min)
 *
 * Generează embedding pentru un produs și îl upsertează în gold_product_embeddings.
 * Folosește exclusiv embedText() din llm-client.ts — fallback automat la OpenAI.
 */
import type { Processor } from "bullmq";
import {
  db,
  setSessionTenantId,
  goldProducts,
  goldProductEmbeddings,
  goldProductChunks,
  eq,
} from "@cerniq/db";
import { embedText } from "../lib/llm-client.js";

const LOG = "[a2-product-embed]";

export interface ProductEmbedJobData {
  tenantId: string;
  productId: string;
  /** Opțional: dacă e setat, embed pentru un chunk specific (A3 → A2) */
  chunkId?: string;
}

export interface ProductEmbedResult {
  ok: true;
  productId: string;
  model: string;
  dimensions: number;
  isFallback: boolean;
}

export const productEmbedProcessor: Processor<ProductEmbedJobData, ProductEmbedResult> = async (
  job,
) => {
  const { tenantId, productId, chunkId } = job.data;
  await setSessionTenantId(tenantId);

  // Dacă avem chunkId, embed-ul va fi actualizat direct pe gold_product_chunks
  if (chunkId) {
    const chunkRows = await db
      .select({ id: goldProductChunks.id, chunkText: goldProductChunks.chunkText })
      .from(goldProductChunks)
      .where(eq(goldProductChunks.id, chunkId))
      .limit(1);

    if (chunkRows.length === 0) {
      console.warn(`${LOG} chunk not found chunkId=${chunkId}, skipping`);
      return { ok: true, productId, model: "none", dimensions: 0, isFallback: false };
    }

    const chunkText = chunkRows[0].chunkText ?? "";
    const embedResult = await embedText(chunkText);

    await db
      .update(goldProductChunks)
      .set({ embedding: embedResult.embedding })
      .where(eq(goldProductChunks.id, chunkId));

    console.info(
      `${LOG} chunk embed ok chunkId=${chunkId} model=${embedResult.model} isFallback=${embedResult.isFallback}`,
    );

    return {
      ok: true,
      productId,
      model: embedResult.model,
      dimensions: embedResult.dimensions,
      isFallback: embedResult.isFallback,
    };
  }

  // Embed produs principal
  const products = await db
    .select({
      name: goldProducts.name,
      description: goldProducts.description,
      metadata: goldProducts.metadata,
    })
    .from(goldProducts)
    .where(eq(goldProducts.id, productId))
    .limit(1);

  if (products.length === 0) {
    throw new Error(`${LOG} product not found productId=${productId}`);
  }

  const product = products[0];
  const text = [product.name, product.description ?? "", JSON.stringify(product.metadata ?? {})]
    .join("\n")
    .trim();

  const embedResult = await embedText(text);

  console.info(
    `${LOG} embed ok productId=${productId} model=${embedResult.model} dims=${embedResult.dimensions} isFallback=${embedResult.isFallback}`,
  );

  // UPSERT gold_product_embeddings: nu există UNIQUE constraint pe product_id,
  // deci folosim SELECT + UPDATE sau INSERT.
  const existing = await db
    .select({ id: goldProductEmbeddings.id })
    .from(goldProductEmbeddings)
    .where(eq(goldProductEmbeddings.productId, productId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(goldProductEmbeddings)
      .set({
        embedding: embedResult.embedding,
        model: embedResult.model,
        createdAt: new Date(),
      })
      .where(eq(goldProductEmbeddings.id, existing[0].id));
  } else {
    await db.insert(goldProductEmbeddings).values({
      tenantId,
      productId,
      embedding: embedResult.embedding,
      model: embedResult.model,
    });
  }

  return {
    ok: true,
    productId,
    model: embedResult.model,
    dimensions: embedResult.dimensions,
    isFallback: embedResult.isFallback,
  };
};
