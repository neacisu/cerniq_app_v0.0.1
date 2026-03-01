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
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='silver' AND table_name='silver_companies' AND column_name='risk_category')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='silver' AND table_name='silver_companies' AND column_name='categorie_risc') THEN
    ALTER TABLE silver.silver_companies RENAME COLUMN risk_category TO categorie_risc;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='silver' AND table_name='silver_companies' AND column_name='categorie_risc') THEN
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
ALTER TABLE gold.gold_companies ADD COLUMN IF NOT EXISTS is_agricultural boolean;
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
