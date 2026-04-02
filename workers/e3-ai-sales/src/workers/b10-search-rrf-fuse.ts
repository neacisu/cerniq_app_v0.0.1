/**
 * B10 — search:rrf:fuse (concurrency:50)
 *
 * Reciprocal Rank Fusion — combină rezultatele vector (60%) și BM25 (40%).
 * Formula exactă: score_rrf += weight * (1.0 / (60 + rank))   (Plan L1742-1743)
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import type { VectorResult } from "./b8-search-vector-execute.js";
import type { Bm25Result } from "./b9-search-bm25-execute.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchRrfFuseJobData {
  tenantId: string;
  sessionId: string;
  vectorResults: VectorResult[];
  bm25Results: Bm25Result[];
  topK?: number;
}

export interface FusedResult {
  productId: string;
  name: string;
  sku: string;
  rrfScore: number;
  fromVector: boolean;
  fromBm25: boolean;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const searchRrfFuseProcessor: Processor<SearchRrfFuseJobData> = async (job) => {
  const { tenantId, sessionId, vectorResults, bm25Results, topK = 10 } = job.data;
  const startedAt = Date.now();

  await setSessionTenantId(tenantId);

  console.info(
    `[b10:rrf:fuse] tenantId=${tenantId} sessionId=${sessionId} vector=${vectorResults.length} bm25=${bm25Results.length}`,
  );

  // Map: productId → fused entry
  const fusedMap = new Map<string, FusedResult & { _rrfScore: number }>();

  // Contribuție vector (weight=0.6): score += 0.6 * (1.0 / (60 + rank))
  for (let rank = 0; rank < vectorResults.length; rank++) {
    const item = vectorResults[rank];
    if (!item) continue;
    const contribution = 0.6 * (1.0 / (60 + rank));
    const existing = fusedMap.get(item.productId);
    if (existing) {
      existing._rrfScore += contribution;
      existing.fromVector = true;
    } else {
      fusedMap.set(item.productId, {
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        rrfScore: 0,
        fromVector: true,
        fromBm25: false,
        _rrfScore: contribution,
      });
    }
  }

  // Contribuție BM25 (weight=0.4): score += 0.4 * (1.0 / (60 + rank))
  for (let rank = 0; rank < bm25Results.length; rank++) {
    const item = bm25Results[rank];
    if (!item) continue;
    const contribution = 0.4 * (1.0 / (60 + rank));
    const existing = fusedMap.get(item.productId);
    if (existing) {
      existing._rrfScore += contribution;
      existing.fromBm25 = true;
    } else {
      fusedMap.set(item.productId, {
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        rrfScore: 0,
        fromVector: false,
        fromBm25: true,
        _rrfScore: contribution,
      });
    }
  }

  // Finalizare: copiază _rrfScore → rrfScore, sortare desc, limitare topK
  const fused: FusedResult[] = Array.from(fusedMap.values())
    .map((entry) => {
      const { _rrfScore, ...rest } = entry;
      return { ...rest, rrfScore: _rrfScore };
    })
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK);

  const durationMs = Date.now() - startedAt;
  console.info(
    `[b10:rrf:fuse] tenantId=${tenantId} sessionId=${sessionId} fused=${fused.length} durationMs=${durationMs}`,
  );

  return {
    ok: true,
    sessionId,
    fused,
    durationMs,
  };
};
