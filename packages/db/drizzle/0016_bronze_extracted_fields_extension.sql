-- Migration: Add extracted fields to bronze_contacts for fast indexing
-- These fields are extracted from raw_payload for rapid lookup/filtering
-- raw_payload remains the immutable source of truth (append-only)

ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS extracted_nr_reg_com VARCHAR(20);
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS extracted_judet VARCHAR(100);
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS extracted_localitate VARCHAR(100);
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS extracted_address TEXT;
--> statement-breakpoint
ALTER TABLE bronze.bronze_contacts
  ADD COLUMN IF NOT EXISTS extracted_caen VARCHAR(8);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_nr_reg_com
  ON bronze.bronze_contacts (extracted_nr_reg_com)
  WHERE extracted_nr_reg_com IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_judet
  ON bronze.bronze_contacts (extracted_judet)
  WHERE extracted_judet IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_bronze_contacts_caen
  ON bronze.bronze_contacts (extracted_caen)
  WHERE extracted_caen IS NOT NULL;
