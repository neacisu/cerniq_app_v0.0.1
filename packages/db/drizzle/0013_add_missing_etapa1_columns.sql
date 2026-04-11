-- Migration 0013: Add ALL missing columns to silver & gold tables
-- Aligns SQL schema with TypeScript Drizzle definitions
-- All statements are idempotent (ADD COLUMN IF NOT EXISTS)

-- ============================================================
-- SILVER.SILVER_COMPANIES — 45 missing columns
-- ============================================================

-- Identificatori fiscali
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS cui_validated boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS cui_validation_date timestamptz;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS cui_validation_source varchar(50);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS nr_reg_com varchar(20);
--> statement-breakpoint

-- Denumire
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS denumire_comerciala varchar(255);
--> statement-breakpoint

-- Adresă (10 coloane)
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS adresa_normalizata text;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS strada varchar(200);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS numar varchar(20);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS bloc varchar(20);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS scara varchar(10);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS etaj varchar(10);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS apartament varchar(10);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS cod_postal varchar(10);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS comuna varchar(100);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS judet_cod varchar(2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS cod_siruta integer;
--> statement-breakpoint

-- Coordonate
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS geocoding_accuracy varchar(30);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS geocoding_source varchar(30);
--> statement-breakpoint

-- Date fiscale ANAF (11 coloane)
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS data_inregistrare date;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS data_radiere date;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS data_suspendare date;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS platitor_tva boolean;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS data_inceput_tva date;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS data_sfarsit_tva date;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS tva_la_incasare boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS split_tva boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS inregistrat_e_factura boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS data_inregistrare_e_factura date;
--> statement-breakpoint

-- CAEN
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS denumire_caen varchar(255);
--> statement-breakpoint

-- Date financiare (7 coloane)
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS capitaluri_proprii numeric(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS datorii_totale numeric(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS active_totale numeric(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS an_bilant integer;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS scor_risc_termene integer;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS numar_dosare_actuale integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS in_insolventa boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Fix naming: risk_category -> categorie_risc
DO $$
DECLARE
  v_schema text := 'silver';
  v_table  text := 'silver_companies';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema AND table_name = v_table AND column_name = 'risk_category'
  )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = v_schema AND table_name = v_table AND column_name = 'categorie_risc'
    ) THEN
    ALTER TABLE silver.silver_companies RENAME COLUMN risk_category TO categorie_risc;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = v_schema AND table_name = v_table AND column_name = 'categorie_risc'
  ) THEN
    ALTER TABLE silver.silver_companies ADD COLUMN categorie_risc varchar(20);
  END IF;
END $$;
--> statement-breakpoint

-- Enrichment tracking (3 coloane)
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS enrichment_sources_completed jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS enrichment_errors jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS next_enrichment_at timestamptz;
--> statement-breakpoint

-- Quality
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS quality_issues jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- Promotion
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS promotion_blocked_reason text;
--> statement-breakpoint

-- Deduplicare (4 coloane)
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS is_master_record boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS master_record_id uuid;
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS duplicate_confidence numeric(5,4);
--> statement-breakpoint
ALTER TABLE silver.silver_companies ADD COLUMN IF NOT EXISTS merge_history jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- Updated indexes for silver_companies
DROP INDEX IF EXISTS idx_silver_companies_cui_tenant;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_silver_companies_cui_tenant ON silver.silver_companies(tenant_id, cui) WHERE cui IS NOT NULL AND is_master_record = TRUE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_cui ON silver.silver_companies(cui);
--> statement-breakpoint

-- ============================================================
-- SILVER.SILVER_CONTACTS — 21 missing columns
-- ============================================================

-- Email validare (6 coloane)
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS email_validation_date timestamptz;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS email_validation_source varchar(30);
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS email_deliverability varchar(20);
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS email_provider varchar(50);
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS email_catch_all boolean;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS email_role_based boolean;
--> statement-breakpoint

-- Telefon validare (5 coloane)
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS telefon_valid boolean;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS telefon_validation_date timestamptz;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS telefon_carrier varchar(50);
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS telefon_type varchar(20);
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS telefon_secundar varchar(20);
--> statement-breakpoint

-- WhatsApp (2 coloane)
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS whatsapp_available boolean;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz;
--> statement-breakpoint

-- Profesional (3 coloane)
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS functie_normalizata varchar(120);
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS departament varchar(50);
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS linkedin_verified boolean;
--> statement-breakpoint

-- Sursă & GDPR (3 coloane)
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS data_source varchar(50);
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS lia_documented boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS consent_date timestamptz;
--> statement-breakpoint

-- Quality & Enrichment (2 coloane)
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS completeness_score integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE silver.silver_contacts ADD COLUMN IF NOT EXISTS enrichment_sources jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- ============================================================
-- SILVER.SILVER_ENRICHMENT_LOG — 3 missing columns
-- ============================================================
ALTER TABLE silver.silver_enrichment_log ADD COLUMN IF NOT EXISTS status varchar(20);
--> statement-breakpoint
ALTER TABLE silver.silver_enrichment_log ADD COLUMN IF NOT EXISTS error_message text;
--> statement-breakpoint
ALTER TABLE silver.silver_enrichment_log ADD COLUMN IF NOT EXISTS error_code varchar(50);
--> statement-breakpoint

-- ============================================================
-- SILVER.SILVER_DEDUP_CANDIDATES — 5 missing columns
-- ============================================================
ALTER TABLE silver.silver_dedup_candidates ADD COLUMN IF NOT EXISTS matching_fields jsonb;
--> statement-breakpoint
ALTER TABLE silver.silver_dedup_candidates ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE silver.silver_dedup_candidates ADD COLUMN IF NOT EXISTS decision_reason text;
--> statement-breakpoint
ALTER TABLE silver.silver_dedup_candidates ADD COLUMN IF NOT EXISTS decided_at timestamptz;
--> statement-breakpoint
ALTER TABLE silver.silver_dedup_candidates ADD COLUMN IF NOT EXISTS merged_at timestamptz;
--> statement-breakpoint

-- ============================================================
-- GOLD.GOLD_COMPANIES — 114 missing columns
-- ============================================================

-- Dacă catalogul pg_attribute a atins plafonul PostgreSQL (1600 atribute fizice,
-- inclusiv coloane „dropped”), ADD COLUMN eșuează cu 54011. VACUUM FULL nu eliberează
-- aceste sloturi — singura cale sigură este rescrierea tabelului (LIKE … INCLUDING ALL),
-- păstrând doar coloanele „vii”, apoi refacerea FK-urilor, triggerelor, RLS și funcției
-- gold_compute_fit_score (semnătura folosește tipul rând gold.gold_companies).
DO $gold_companies_catalog_rebuild$
DECLARE
  r RECORD;
  attr_count integer;
  ins_cols text;
BEGIN
  SELECT count(*) INTO attr_count
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'gold.gold_companies'::regclass
    AND attnum > 0;

  IF attr_count < 1600 THEN
    RAISE NOTICE 'gold.gold_companies: % pg_attribute slots — skip catalog rebuild (threshold 1600)', attr_count;
    RETURN;
  END IF;

  IF to_regclass('gold.gold_companies__catbloat_0013') IS NOT NULL THEN
    RAISE EXCEPTION 'gold.gold_companies rebuild: orphan table gold.gold_companies__catbloat_0013 exists; resolve manually';
  END IF;

  FOR r IN
    SELECT c.conname, c.conrelid::regclass::text AS tbl
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.confrelid = 'gold.gold_companies'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;

  DROP FUNCTION IF EXISTS gold.gold_compute_fit_score(gold.gold_companies);

  ALTER TABLE gold.gold_companies RENAME TO gold_companies__catbloat_0013;

  CREATE TABLE gold.gold_companies (LIKE gold.gold_companies__catbloat_0013 INCLUDING ALL);

  SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position)
  INTO ins_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'gold'
    AND c.table_name = 'gold_companies__catbloat_0013'
    AND c.is_generated = 'NEVER';

  EXECUTE format(
    'INSERT INTO gold.gold_companies (%s) SELECT %s FROM gold.gold_companies__catbloat_0013',
    ins_cols,
    ins_cols
  );

  ALTER TABLE gold.gold_companies
    ADD CONSTRAINT gold_companies_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE gold.gold_companies
    ADD CONSTRAINT gold_companies_silver_id_fkey FOREIGN KEY (silver_id) REFERENCES silver.silver_companies(id) ON DELETE RESTRICT;
  ALTER TABLE gold.gold_companies
    ADD CONSTRAINT gold_companies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

  DROP TABLE gold.gold_companies__catbloat_0013;

  ALTER TABLE gold.gold_companies RENAME CONSTRAINT gold_companies_pkey1 TO gold_companies_pkey;

  ALTER INDEX gold.gold_companies_ai_embedding_idx RENAME TO idx_gold_companies_embedding;
  ALTER INDEX gold.gold_companies_assigned_to_current_state_idx RENAME TO idx_gold_companies_owner;
  ALTER INDEX gold.gold_companies_assigned_to_idx RENAME TO idx_gold_companies_assigned;
  ALTER INDEX gold.gold_companies_location_geography_idx RENAME TO idx_gold_companies_location_geography;
  ALTER INDEX gold.gold_companies_tenant_id_categorie_risc_scor_risc_intern_idx RENAME TO idx_gold_companies_risk;
  ALTER INDEX gold.gold_companies_tenant_id_cui_idx RENAME TO idx_gold_companies_cui_tenant;
  ALTER INDEX gold.gold_companies_tenant_id_current_state_state_changed_at_idx RENAME TO idx_gold_companies_state;
  ALTER INDEX gold.gold_companies_tenant_id_customer_status_current_state_lead_idx RENAME TO idx_gold_companies_dashboard;
  ALTER INDEX gold.gold_companies_tenant_id_judet_cod_idx RENAME TO idx_gold_companies_judet;
  ALTER INDEX gold.gold_companies_tenant_id_lead_score_current_state_idx RENAME TO idx_gold_companies_lead_score;

  ALTER TABLE gold.ai_conversations    ADD CONSTRAINT ai_conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE SET NULL;
  ALTER TABLE silver.silver_companies
    ADD CONSTRAINT fk_silver_companies_promoted_to_gold FOREIGN KEY (promoted_to_gold_id) REFERENCES gold.gold_companies(id) ON DELETE SET NULL;
  ALTER TABLE gold.gold_addresses
    ADD CONSTRAINT gold_addresses_client_id_fkey FOREIGN KEY (client_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_affiliations
    ADD CONSTRAINT gold_affiliations_client_id_fkey FOREIGN KEY (client_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_churn_factors
    ADD CONSTRAINT gold_churn_factors_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_churn_signals
    ADD CONSTRAINT gold_churn_signals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_cluster_members
    ADD CONSTRAINT gold_cluster_members_client_id_fkey FOREIGN KEY (client_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_clusters
    ADD CONSTRAINT gold_clusters_kol_client_id_fkey FOREIGN KEY (kol_client_id) REFERENCES gold.gold_companies(id) ON DELETE SET NULL;
  ALTER TABLE gold.gold_contacts
    ADD CONSTRAINT gold_contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_contracts
    ADD CONSTRAINT gold_contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES gold.gold_companies(id) ON DELETE RESTRICT;
  ALTER TABLE gold.gold_credit_profiles
    ADD CONSTRAINT gold_credit_profiles_client_id_fkey FOREIGN KEY (client_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_entity_relationships
    ADD CONSTRAINT gold_entity_relationships_entity_a_id_fkey FOREIGN KEY (entity_a_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_entity_relationships
    ADD CONSTRAINT gold_entity_relationships_entity_b_id_fkey FOREIGN KEY (entity_b_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_kol_profiles
    ADD CONSTRAINT gold_kol_profiles_client_id_fkey FOREIGN KEY (client_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_lead_journey
    ADD CONSTRAINT gold_lead_journey_company_id_fkey FOREIGN KEY (company_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_negotiations
    ADD CONSTRAINT gold_negotiations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_nps_surveys
    ADD CONSTRAINT gold_nps_surveys_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_nurturing_state
    ADD CONSTRAINT gold_nurturing_state_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_orders
    ADD CONSTRAINT gold_orders_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE RESTRICT;
  ALTER TABLE gold.gold_proximity_scores
    ADD CONSTRAINT gold_proximity_scores_anchor_id_fkey FOREIGN KEY (anchor_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_proximity_scores
    ADD CONSTRAINT gold_proximity_scores_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_referrals
    ADD CONSTRAINT gold_referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES gold.gold_companies(id) ON DELETE SET NULL;
  ALTER TABLE gold.gold_referrals
    ADD CONSTRAINT gold_referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_sentiment_analysis
    ADD CONSTRAINT gold_sentiment_analysis_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE gold.gold_winback_campaigns
    ADD CONSTRAINT gold_winback_campaigns_client_id_fkey FOREIGN KEY (client_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE outreach.lead_journey
    ADD CONSTRAINT lead_journey_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;
  ALTER TABLE outreach.sms_messages
    ADD CONSTRAINT sms_messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES gold.gold_companies(id) ON DELETE CASCADE;

  CREATE OR REPLACE FUNCTION gold.gold_compute_fit_score(company gold.gold_companies)
 RETURNS integer
  LANGUAGE plpgsql
  IMMUTABLE
 AS $function$
  DECLARE
    score integer := 0;
  BEGIN
    IF company.categoria_dimensiune = 'MARE' THEN score := score + 30;
    ELSIF company.categoria_dimensiune = 'MEDIE' THEN score := score + 25;
    ELSIF company.categoria_dimensiune = 'MICA' THEN score := score + 15;
    ELSE score := score + 5;
    END IF;

    IF COALESCE(company.is_agricultural, FALSE) THEN
      score := score + 25;
    ELSIF company.cod_caen_principal LIKE '46%' THEN
      score := score + 15;
    END IF;

    IF company.categorie_risc = 'LOW' THEN score := score + 25;
    ELSIF company.categorie_risc = 'MEDIUM' THEN score := score + 15;
    ELSE score := score + 5;
    END IF;

    IF company.judet_cod IN ('BV', 'CJ', 'TM', 'B', 'IS', 'CT') THEN
      score := score + 10;
    ELSE
      score := score + 5;
    END IF;

    IF COALESCE(company.inregistrat_e_factura, FALSE) THEN
      score := score + 10;
    END IF;

    RETURN LEAST(100, score);
  END;
  $function$;

  ALTER TABLE gold.gold_companies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE gold.gold_companies FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS tenant_isolation_gold_companies ON gold.gold_companies;
  CREATE POLICY tenant_isolation_gold_companies ON gold.gold_companies AS PERMISSIVE FOR ALL TO public
    USING (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)
    WITH CHECK (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid);

  CREATE TRIGGER trg_gold_companies_state_transition
    BEFORE UPDATE OF current_state ON gold.gold_companies
    FOR EACH ROW EXECUTE FUNCTION gold.gold_log_state_transition();
  CREATE TRIGGER trg_gold_companies_lead_score
    BEFORE INSERT OR UPDATE OF fit_score, engagement_score, intent_score ON gold.gold_companies
    FOR EACH ROW EXECUTE FUNCTION gold.gold_compute_lead_score();
  CREATE TRIGGER trg_gold_companies_geo
    BEFORE INSERT OR UPDATE OF latitude, longitude ON gold.gold_companies
    FOR EACH ROW EXECUTE FUNCTION gold.gold_compute_geography();

  ANALYZE gold.gold_companies;

  RAISE NOTICE 'gold.gold_companies: catalog rebuild complete (slots before: %)', attr_count;
END;
$gold_companies_catalog_rebuild$;
--> statement-breakpoint

-- Identificatori
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS nr_reg_com varchar(20);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS iban_principal varchar(34);
--> statement-breakpoint

-- Denumiri
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS denumire_comerciala varchar(255);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS denumire_normalizata varchar(255);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS forma_juridica varchar(20);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS tip_entitate varchar(30);
--> statement-breakpoint

-- Date juridice și fiscale (14 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_inregistrare date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_radiere date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS platitor_tva boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_inceput_tva date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_sfarsit_tva date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS tva_la_incasare boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS split_tva boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS inregistrat_e_factura boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_inregistrare_e_factura date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS denumire_caen varchar(255);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS coduri_caen_secundare jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
-- cod_caen_principal din 0010; IF NOT EXISTS acoperă drift. is_agricultural aici ca boolean simplu —
-- GENERATED (Drizzle / 0022) cere PG≥12; 0022 face DROP + ADD STORED GENERATED după această etapă.
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS cod_caen_principal varchar(8);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'gold'
      AND c.relname = 'gold_companies'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attname = 'is_agricultural'
  ) THEN
    ALTER TABLE gold.gold_companies ADD COLUMN is_agricultural boolean;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS capital_social numeric(15,2);
--> statement-breakpoint

-- Date agricole (17 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS suprafata_totala_ha numeric(10,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS suprafata_arendata_ha numeric(10,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS suprafata_proprie_ha numeric(10,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS suprafata_irigata_ha numeric(10,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS tip_exploatatie varchar(30);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS culturi_principale jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS efectiv_animale jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS total_lsu numeric(10,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS echipamente_agricole jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS capacitate_stocare_tone numeric(10,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS sistem_irigare varchar(50);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS subventii_apia_ultimul_an numeric(15,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS tip_subventii jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS certificat_eco boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS certificat_globalgap boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS alte_certificari jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- Locație (9 coloane noi)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS strada varchar(200);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS numar varchar(20);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS cod_postal varchar(10);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS localitate varchar(100);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS comuna varchar(100);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS judet varchar(50);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS cod_siruta integer;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS zona_agricola varchar(50);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS bazin_hidrografic varchar(100);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS nearest_depot_km numeric(8,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS nearest_competitor_km numeric(8,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS zona_livrare varchar(50);
--> statement-breakpoint

-- Financiar/Credit (16 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS active_totale numeric(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS datorii_totale numeric(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS capitaluri_proprii numeric(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS an_bilant integer;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS lichiditate_curenta numeric(8,4);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS grad_indatorare numeric(8,4);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS marja_profit numeric(8,4);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS datorii_anaf numeric(15,2) NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_verificare_datorii date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS numar_dosare_actuale integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS in_insolventa boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS scor_risc_intern integer;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS scor_risc_termene integer;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS categorie_risc varchar(20) NOT NULL DEFAULT 'MEDIUM';
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS limita_credit_calculata numeric(15,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS limita_credit_aprobata numeric(15,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS termen_plata_standard integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS conditii_plata varchar(30) NOT NULL DEFAULT 'RAMBURS';
--> statement-breakpoint

-- Lead Scoring (4 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS score_firmografic integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS score_comportamental integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS score_interes integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_calcul_scor timestamptz;
--> statement-breakpoint

-- FSM/Engagement (8 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_prima_contactare timestamptz;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_ultima_interactiune timestamptz;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS numar_interactiuni_totale integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS canal_preferat varchar(20);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS ora_preferata_contact varchar(10);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS zile_preferate_contact jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- Metrici 30 zile (5 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS email_opens_30_zile integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS email_clicks_30_zile integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS wa_messages_sent_30_zile integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS wa_replies_30_zile integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS calls_30_zile integer NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Relații și Asocieri (11 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS actionari jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS administratori jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS membru_ouai boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS ouai_id uuid;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS ouai_nume varchar(200);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS membru_cooperativa boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS cooperativa_id uuid;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS cooperativa_nume varchar(200);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS membru_grup_producatori boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS grup_producatori_id uuid;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS asociatii_profesionale jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- GDPR (10 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS gdpr_legal_basis varchar(30) DEFAULT 'LEGITIMATE_INTEREST';
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS gdpr_lia_documentat boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS gdpr_data_lia date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS consent_email_marketing boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS consent_whatsapp boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS consent_telefon boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS consent_date timestamptz;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS do_not_email boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS do_not_call boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS do_not_whatsapp boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- AI/ML (6 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS segment_ai varchar(50);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS cluster_id integer;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS probabilitate_conversie numeric(5,4);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS probabilitate_churn numeric(5,4);
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS predicted_ltv numeric(15,2);
--> statement-breakpoint

-- Post-vânzare (5 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_prima_comanda date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS data_ultima_comanda date;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS valoare_totala_comenzi numeric(15,2) NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS numar_comenzi integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS average_order_value numeric(15,2);
--> statement-breakpoint

-- Owner/Versioning (2 coloane)
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
--> statement-breakpoint
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
--> statement-breakpoint

-- ============================================================
-- ADDITIONAL INDEXES for gold_companies
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_gold_companies_judet ON gold.gold_companies(tenant_id, judet_cod);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_risk ON gold.gold_companies(tenant_id, categorie_risc, scor_risc_intern);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_agri ON gold.gold_companies(tenant_id, is_agricultural, categorie_dimensiune) WHERE is_agricultural = TRUE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_owner ON gold.gold_companies(assigned_to, current_state) WHERE assigned_to IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_dashboard ON gold.gold_companies(tenant_id, customer_status, current_state, lead_score);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_assigned ON gold.gold_companies(assigned_to);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_contacts_whatsapp ON gold.gold_contacts(whatsapp_number);
