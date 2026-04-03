CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
-- Tabele silver create înainte de 0009 sau fără coloana generată: IF NOT EXISTS pe CREATE TABLE
-- nu adaugă coloane noi — indexul de mai jos eșua cu 42703. Expresie aliniată la 0009_silver_schema;
-- 0022_etapa1_schema_phase2_alignment o înlocuiește cu REGEXP_REPLACE.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'silver'
      AND table_name = 'silver_companies'
      AND column_name = 'denumire_normalizata'
  ) THEN
    ALTER TABLE silver.silver_companies
      ADD COLUMN denumire_normalizata varchar(255)
      GENERATED ALWAYS AS (UPPER(TRIM(COALESCE(denumire, '')))) STORED;
  END IF;
END $$;
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
