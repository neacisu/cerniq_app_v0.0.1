-- Migration 0056: HNSW index parameters (Plan §XIII — m=16, ef_construction=200)
-- pgvector: optional WITH (m = ..., ef_construction = ...) for recall/latency trade-off.
-- CONCURRENTLY: autocommit per statement (drizzle breakpoints).
-- Recomandare operațională: după deploy, rulează backfill re-embedding separat dacă vectorii s-au schimbat (nu e obligatoriu pentru simpla recreare index).

DROP INDEX CONCURRENTLY IF EXISTS gold.idx_gold_companies_embedding;
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_companies_embedding
  ON gold.gold_companies
  USING hnsw (ai_embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 200);
--> statement-breakpoint

DROP INDEX CONCURRENTLY IF EXISTS gold.idx_gold_product_embeddings_embedding;
--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_product_embeddings_embedding
  ON gold.gold_product_embeddings
  USING hnsw (embedding halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 200);
