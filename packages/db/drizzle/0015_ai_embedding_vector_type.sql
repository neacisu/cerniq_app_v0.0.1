-- Migration 0015: Change ai_embedding from jsonb to vector(1536) for native similarity search
-- This enables: cosine distance (<=>), L2 distance (<->), inner product (<#>)
-- and HNSW indexing for sub-millisecond approximate nearest neighbor queries.

-- Step 1: Drop the old jsonb column (data loss acceptable — embeddings are regenerated from AI)
ALTER TABLE gold.gold_companies DROP COLUMN IF EXISTS ai_embedding;
--> statement-breakpoint

-- Step 2: Add the column with proper vector(1536) type
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS ai_embedding vector(1536);
--> statement-breakpoint

-- Step 3: Create HNSW index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_gold_companies_embedding
  ON gold.gold_companies
  USING hnsw (ai_embedding vector_cosine_ops);
--> statement-breakpoint
