-- Migration 0033: Migrate ai_embedding from vector(1536) to halfvec(3072)
-- pgvector HNSW supports max 2000 dims for vector type but 4000 dims for halfvec.
-- qwen3-embedding-8b supports Matryoshka (MRL) truncation: native 4096 -> 3072 dims.
-- halfvec uses 16-bit floats (2 bytes) vs vector 32-bit (4 bytes) = 50% storage reduction.
-- Each step executes as an individual autocommit query (CREATE INDEX CONCURRENTLY
-- requires autocommit mode and cannot run inside a transaction block).

-- Step 1: Drop existing HNSW index (uses vector_cosine_ops, incompatible with halfvec)
DROP INDEX IF EXISTS gold.idx_gold_companies_embedding;
--> statement-breakpoint

-- Step 2: Nullify existing 1536-dim embeddings (incompatible with new 3072-dim schema)
UPDATE gold.gold_companies SET ai_embedding = NULL WHERE ai_embedding IS NOT NULL;
--> statement-breakpoint

-- Step 3: Alter column type from vector(1536) to halfvec(3072)
ALTER TABLE gold.gold_companies
  ALTER COLUMN ai_embedding TYPE halfvec(3072);
--> statement-breakpoint

-- Step 4: Recreate HNSW index with halfvec operator class (CONCURRENTLY = no table lock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_companies_embedding
  ON gold.gold_companies
  USING hnsw (ai_embedding halfvec_cosine_ops);
