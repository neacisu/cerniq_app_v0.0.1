/**
 * A3 — product:chunk (concurrency: 20)
 *
 * Segmentează textul unui produs în chunk-uri (target 600 tokens, overlap 100).
 * DELETE chunks existente → INSERT chunk-uri noi → enqueue product:embed per chunk.
 *
 * NOTĂ: gold_product_chunks NU are coloana chunk_type.
 * Tipul chunk-ului este prefixat în chunkText: "[description] text..."
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldProducts, goldProductChunks, eq } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";
import { randomUUID } from "node:crypto";

const LOG = "[a3-product-chunk]";

export interface ProductChunkJobData {
  tenantId: string;
  productId: string;
}

export interface ProductChunkResult {
  ok: true;
  productId: string;
  chunksCreated: number;
}

interface ChunkEntry {
  type: string;
  text: string;
}

/**
 * Împarte textul în chunk-uri cu overlap.
 * Aproximare tokens = chars / 4.
 */
function chunkText(text: string, targetTokens = 600, overlapTokens = 100): string[] {
  const targetChars = targetTokens * 4;
  const overlapChars = overlapTokens * 4;
  const minChars = 500 * 4;
  const maxChars = 800 * 4;

  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + targetChars;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    // Caută boundary natural (spațiu/newline) în intervalul [min, max]
    const searchFrom = Math.max(start + minChars, end - 50);
    const searchTo = Math.min(start + maxChars, text.length);
    const boundary = text.lastIndexOf(" ", searchTo);
    if (boundary > searchFrom) {
      end = boundary;
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlapChars;
    if (start < 0) start = 0;
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Extrage sursele de text din metadata pentru chunking.
 */
function extractChunkSources(
  name: string,
  description: string | null,
  metadata: Record<string, unknown>,
): ChunkEntry[] {
  const entries: ChunkEntry[] = [];

  if (description) {
    entries.push({ type: "description", text: description });
  }

  if (metadata.specs && typeof metadata.specs === "string") {
    entries.push({ type: "specs", text: metadata.specs });
  } else if (metadata.specs && typeof metadata.specs === "object") {
    entries.push({ type: "specs", text: JSON.stringify(metadata.specs) });
  }

  if (metadata.usage && typeof metadata.usage === "string") {
    entries.push({ type: "usage", text: metadata.usage });
  } else if (metadata.usage && typeof metadata.usage === "object") {
    entries.push({ type: "usage", text: JSON.stringify(metadata.usage) });
  }

  if (metadata.faq && typeof metadata.faq === "string") {
    entries.push({ type: "faq", text: metadata.faq });
  } else if (Array.isArray(metadata.faq)) {
    entries.push({ type: "faq", text: JSON.stringify(metadata.faq) });
  } else if (metadata.faq && typeof metadata.faq === "object") {
    entries.push({ type: "faq", text: JSON.stringify(metadata.faq) });
  }

  // Fallback: dacă nu există nicio sursă, folosim name + description
  if (entries.length === 0) {
    entries.push({ type: "description", text: `${name}\n${description ?? ""}`.trim() });
  }

  return entries;
}

export const productChunkProcessor: Processor<ProductChunkJobData, ProductChunkResult> = async (
  job,
) => {
  const { tenantId, productId } = job.data;
  await setSessionTenantId(tenantId);

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
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;

  // DELETE chunk-uri existente
  await db.delete(goldProductChunks).where(eq(goldProductChunks.productId, productId));

  const sources = extractChunkSources(product.name, product.description, metadata);
  const newChunks: Array<{ id: string; chunkText: string; chunkIndex: number }> = [];

  let globalIndex = 0;
  for (const source of sources) {
    const segments = chunkText(source.text);
    for (const segment of segments) {
      const prefixedText = `[${source.type}] ${segment}`;
      newChunks.push({
        id: randomUUID(),
        chunkText: prefixedText,
        chunkIndex: globalIndex++,
      });
    }
  }

  if (newChunks.length === 0) {
    console.warn(`${LOG} no chunks generated productId=${productId}`);
    return { ok: true, productId, chunksCreated: 0 };
  }

  // INSERT chunk-uri noi
  await db.insert(goldProductChunks).values(
    newChunks.map((c) => ({
      id: c.id,
      tenantId,
      productId,
      chunkText: c.chunkText,
      chunkIndex: c.chunkIndex,
    })),
  );

  // Enqueue product:embed per chunk
  const embedQueue = createQueue("product:embed", { defaultJobOptions: DEFAULT_JOB_OPTIONS });
  for (const chunk of newChunks) {
    await embedQueue.add("product:embed", { tenantId, productId, chunkId: chunk.id });
  }

  console.info(
    `${LOG} chunked productId=${productId} chunks=${newChunks.length} tenant=${tenantId}`,
  );

  return { ok: true, productId, chunksCreated: newChunks.length };
};
