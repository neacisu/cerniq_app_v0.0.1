/**
 * B8 — search:vector:execute (concurrency:50, target:<100ms)
 *
 * Căutare vectorială pgvector cu halfvec(3072) + operator <=> (halfvec_cosine_ops).
 * Embed query cu qwen3-embedding-8b via embedText() din llm-client.
 */
import type { Processor } from "bullmq";
import { db, sql, setSessionTenantId } from "@cerniq/db";
import { embedText } from "../lib/llm-client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchVectorExecuteJobData {
  tenantId: string;
  query: string;
  sessionId: string;
  limit?: number;
  correlationId?: string;
}

interface VectorSearchRow {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  unit_price: string | null;
  currency: string | null;
  category_id: string | null;
  metadata: Record<string, unknown> | null;
  distance: number;
}

export interface VectorResult {
  productId: string;
  name: string;
  sku: string;
  distance: number;
  score: number;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const searchVectorExecuteProcessor: Processor<SearchVectorExecuteJobData> = async (job) => {
  const { tenantId, query, sessionId, limit = 20 } = job.data;
  const startedAt = Date.now();

  await setSessionTenantId(tenantId);

  console.info(`[b8:vector:execute] tenantId=${tenantId} sessionId=${sessionId} limit=${limit}`);

  // Embed query — halfvec(3072)
  const embedResult = await embedText(query);
  const embeddingVector = `[${embedResult.embedding.join(",")}]`;

  // halfvec literal — safe (numai cifre, paranteze, virgule)
  const halfvecLiteral = sql.raw(`'${embeddingVector}'::halfvec`);

  // SQL raw — halfvec cosine ops cu <=> (NU <->), halfvec_cosine_ops
  const execResult = await db.execute(sql`
    SELECT
      p.id,
      p.name,
      p.sku,
      p.description,
      p.unit_price,
      p.currency,
      p.category_id,
      p.metadata,
      (pe.embedding <=> ${halfvecLiteral}) AS distance
    FROM gold.gold_products p
    JOIN gold.gold_product_embeddings pe ON pe.product_id = p.id
    WHERE p.tenant_id = ${tenantId}::uuid
      AND p.is_active = true
    ORDER BY pe.embedding <=> ${halfvecLiteral}
    LIMIT ${limit}
  `);
  // postgres-js: execResult e array-like; unele env/mock-uri wrapeaza in { rows }
  const rawRows = (
    Array.isArray(execResult)
      ? execResult
      : ((execResult as unknown as { rows: VectorSearchRow[] }).rows ?? [])
  ) as VectorSearchRow[];

  const results: VectorResult[] = rawRows.map((row) => ({
    productId: row.id,
    name: row.name,
    sku: row.sku,
    distance: Number(row.distance),
    score: 1 - Number(row.distance),
  }));

  const durationMs = Date.now() - startedAt;
  console.info(
    `[b8:vector:execute] tenantId=${tenantId} sessionId=${sessionId} results=${results.length} durationMs=${durationMs}`,
  );

  return {
    ok: true,
    sessionId,
    results,
    durationMs,
  };
};
