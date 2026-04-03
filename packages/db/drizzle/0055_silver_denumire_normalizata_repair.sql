-- Reparație idempotentă: coloana generată `denumire_normalizata` lipsește pe unele medii
-- (migrare 0022 neaplicată / DB restaurat parțial). Aliniat la
-- `packages/db/src/schemas/silver.ts` și `0022_etapa1_schema_phase2_alignment.sql`.

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
      GENERATED ALWAYS AS (
        UPPER(TRIM(REGEXP_REPLACE(COALESCE(denumire, ''), '\s+', ' ', 'g')))
      ) STORED;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_denumire_trgm
  ON silver.silver_companies
  USING gin (denumire_normalizata gin_trgm_ops);
