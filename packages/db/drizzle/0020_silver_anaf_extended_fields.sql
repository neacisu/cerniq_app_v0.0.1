-- Silver companies: extended ANAF v9 fields
-- Adds all remaining fields from ANAF v9 API response

-- Contact ANAF
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "fax" varchar(32);
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "iban" varchar(34);

-- Date fiscale extinse
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "stare_inregistrare" text;
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "data_inactivare" date;
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "data_reactivare" date;
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "act_infiintare" text;
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "organ_fiscal_competent" varchar(255);
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "forma_de_proprietate" varchar(255);
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "forma_organizare" varchar(255);

-- TVA extins
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "perioade_tva" jsonb;
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "data_inceput_tva_incasare" date;
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "data_sfarsit_tva_incasare" date;
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "data_inceput_split_tva" date;
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "data_anulare_split_tva" date;

-- Adresă sediu social: detalii
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "detalii_adresa" text;

-- Adresă domiciliu fiscal (jsonb - structura completă)
--> statement-breakpoint
ALTER TABLE "silver"."silver_companies" ADD COLUMN IF NOT EXISTS "adresa_domiciliu_fiscal" jsonb;
