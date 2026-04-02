/**
 * B9 — search:bm25:execute (concurrency:50, target:<50ms)
 *
 * Căutare full-text BM25 folosind PostgreSQL tsvector cu configurație 'romanian'.
 * Folosește ts_rank_cd (NU ts_rank) și plainto_tsquery cu config 'romanian'.
 */
import type { Processor } from "bullmq";
import { db, sql, setSessionTenantId } from "@cerniq/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchBm25ExecuteJobData {
  tenantId: string;
  query: string;
  sessionId: string;
  limit?: number;
}

interface Bm25SearchRow {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  unit_price: string | null;
  currency: string | null;
  category_id: string | null;
  metadata: Record<string, unknown> | null;
  rank: number;
}

export interface Bm25Result {
  productId: string;
  name: string;
  sku: string;
  rank: number;
  score: number;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const searchBm25ExecuteProcessor: Processor<SearchBm25ExecuteJobData> = async (job) => {
  const { tenantId, query, sessionId, limit = 20 } = job.data;
  const startedAt = Date.now();

  await setSessionTenantId(tenantId);

  console.info(`[b9:bm25:execute] tenantId=${tenantId} sessionId=${sessionId} limit=${limit}`);

  // BM25 cu tsvector 'romanian' — ts_rank_cd, plainto_tsquery
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
      ts_rank_cd(p.search_vector, plainto_tsquery('romanian', ${query})) AS rank
    FROM gold.gold_products p
    WHERE p.tenant_id = ${tenantId}::uuid
      AND p.is_active = true
      AND p.search_vector @@ plainto_tsquery('romanian', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
  const rawRows = (
    Array.isArray(execResult)
      ? execResult
      : ((execResult as unknown as { rows: Bm25SearchRow[] }).rows ?? [])
  ) as Bm25SearchRow[];

  const results: Bm25Result[] = rawRows.map((row) => ({
    productId: row.id,
    name: row.name,
    sku: row.sku,
    rank: Number(row.rank),
    score: Number(row.rank),
  }));

  const durationMs = Date.now() - startedAt;
  console.info(
    `[b9:bm25:execute] tenantId=${tenantId} sessionId=${sessionId} results=${results.length} durationMs=${durationMs}`,
  );

  return {
    ok: true,
    sessionId,
    results,
    durationMs,
  };
};
