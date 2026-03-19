-- NrRegCom: add canonical column, store raw value in existing column
-- Problem: the normalization pipeline was auto-converting old format (J09/98/2003)
-- to new canonical format (J2003000098095). We don't have authority to do this
-- conversion — it must only come from official sources (ONRC).
-- Fix: nr_reg_com / extracted_nr_reg_com stores the raw value as received.
-- New nr_reg_com_canonical / extracted_nr_reg_com_canonical stores new-format only
-- when an official source (ONRC) explicitly provides it.

-- Step 1: Add canonical columns
ALTER TABLE "bronze"."bronze_contacts" ADD COLUMN IF NOT EXISTS "extracted_nr_reg_com_canonical" varchar(20);
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "nr_reg_com_canonical" varchar(20);
--> statement-breakpoint

-- Step 2: Data migration — restore raw NrRegCom in bronze_contacts.
-- extracted_nr_reg_com_raw holds the original value from source;
-- extracted_nr_reg_com was incorrectly set to the normalized canonical form.
UPDATE "bronze"."bronze_contacts"
SET "extracted_nr_reg_com" = UPPER(TRIM("extracted_nr_reg_com_raw"))
WHERE "extracted_nr_reg_com_raw" IS NOT NULL
  AND TRIM("extracted_nr_reg_com_raw") <> ''
  AND UPPER(TRIM("extracted_nr_reg_com_raw")) IS DISTINCT FROM UPPER(TRIM(COALESCE("extracted_nr_reg_com", '')));
--> statement-breakpoint

-- Step 3: Data migration — restore raw NrRegCom in silver_companies.
-- nr_reg_com_original holds the original raw value;
-- nr_reg_com was incorrectly set to the normalized canonical form.
-- Skip rows where restoring the raw value would create a duplicate (tenant_id, nr_reg_com)
-- pair — those companies already have the correct raw value via another row.
UPDATE "silver"."silver_companies" sc
SET "nr_reg_com" = UPPER(TRIM(sc."nr_reg_com_original"))
WHERE sc."nr_reg_com_original" IS NOT NULL
  AND TRIM(sc."nr_reg_com_original") <> ''
  AND UPPER(TRIM(sc."nr_reg_com_original")) IS DISTINCT FROM UPPER(TRIM(COALESCE(sc."nr_reg_com", '')))
  AND NOT EXISTS (
    SELECT 1 FROM "silver"."silver_companies" other
    WHERE other.tenant_id = sc.tenant_id
      AND other.id <> sc.id
      AND UPPER(TRIM(other.nr_reg_com)) = UPPER(TRIM(sc.nr_reg_com_original))
  );
--> statement-breakpoint

-- Step 4: Revoke all nr_reg_com identity keys so re-promote rebuilds them correctly
-- with the raw values. The keys were created with normalized canonical values which
-- no longer match the raw values now stored in silver_companies.
UPDATE "silver"."company_identity_keys"
SET "revoked_at" = NOW()
WHERE "key_type" = 'nr_reg_com'
  AND "revoked_at" IS NULL;
