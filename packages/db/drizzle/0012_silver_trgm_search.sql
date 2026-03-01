CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_denumire_trgm
  ON silver.silver_companies
  USING gin (denumire_normalizata gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_cui_trgm
  ON silver.silver_companies
  USING gin (cui gin_trgm_ops)
  WHERE cui IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_tenant_updated
  ON silver.silver_companies (tenant_id, updated_at DESC);
