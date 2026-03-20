-- Migration: Extend silver_companies & gold_companies with financial detail columns
-- from Excel audit (Tab 1-10: financials, ANAF debts, BPI, CIP, court cases)
-- Also creates 6 new detail tables in silver schema.

-- ═══════════════════════════════════════════════════════════════════════════
-- SILVER_COMPANIES — New financial columns (Tab 1 "Baza de date")
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS profit_brut NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS venituri_totale NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS cheltuieli_totale NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS capital_social NUMERIC(15,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS active_imobilizate NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS active_circulante NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS creante NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS stocuri NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS cheltuieli_in_avans NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS casa_si_conturi_banci NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS provizioane NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS venituri_in_avans NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS anul_infiintarii INTEGER;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS rating_extern INTEGER;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS limita_credit_eur NUMERIC(15,2);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- SILVER_COMPANIES — ANAF debt summary columns (Tab 2 "Datorii ANAF")
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS datorii_anaf NUMERIC(15,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS datorii_anaf_data DATE;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS obligatii_buget_stat NUMERIC(15,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS obligatii_buget_somaj NUMERIC(15,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS obligatii_buget_asig_sociale NUMERIC(15,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS obligatii_buget_sanatate NUMERIC(15,2);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- SILVER_COMPANIES — BPI summary columns (Tab 3-4)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS bpi_numar_acte INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS bpi_data_ultima_modificare DATE;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS bpi_in_insolventa BOOLEAN NOT NULL DEFAULT FALSE;
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- SILVER_COMPANIES — CIP summary columns (Tab 5-6)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS cip_total_incidente INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS cip_incidente_majore INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS cip_suma_refuzata NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE silver.silver_companies
  ADD COLUMN IF NOT EXISTS cip_data_ultimul_incident DATE;
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- GOLD_COMPANIES — New financial detail columns
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS profit_brut NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS venituri_totale NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS cheltuieli_totale NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS active_imobilizate NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS active_circulante NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS creante NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS stocuri NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS cheltuieli_in_avans NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS casa_si_conturi_banci NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS provizioane NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS venituri_in_avans NUMERIC(18,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS anul_infiintarii INTEGER;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS rating_extern INTEGER;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS limita_credit_eur NUMERIC(15,2);
--> statement-breakpoint

-- GOLD — ANAF debt detail
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS obligatii_buget_stat NUMERIC(15,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS obligatii_buget_somaj NUMERIC(15,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS obligatii_buget_asig_sociale NUMERIC(15,2);
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS obligatii_buget_sanatate NUMERIC(15,2);
--> statement-breakpoint

-- GOLD — BPI
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS bpi_numar_acte INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS bpi_in_insolventa BOOLEAN NOT NULL DEFAULT FALSE;
--> statement-breakpoint

-- GOLD — CIP
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS cip_total_incidente INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS cip_incidente_majore INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
  ADD COLUMN IF NOT EXISTS cip_suma_refuzata NUMERIC(18,2);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- NEW TABLE: silver_datorii_anaf (Tab 2 detail rows)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS silver.silver_datorii_anaf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  tip_buget VARCHAR(100) NOT NULL,
  suma_restanta NUMERIC(15,2),
  data_verificare DATE,
  sursa VARCHAR(50),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_datorii_anaf_company
  ON silver.silver_datorii_anaf(company_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_datorii_anaf_tenant
  ON silver.silver_datorii_anaf(tenant_id);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- NEW TABLE: silver_bpi_acte (Tab 3-4 insolvency acts)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS silver.silver_bpi_acte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  tip_act VARCHAR(100),
  numar_act VARCHAR(50),
  data_act DATE,
  instanta VARCHAR(200),
  numar_dosar VARCHAR(50),
  stare VARCHAR(50),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_bpi_acte_company
  ON silver.silver_bpi_acte(company_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_bpi_acte_tenant
  ON silver.silver_bpi_acte(tenant_id);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- NEW TABLE: silver_cip_incidente (Tab 5-6 payment incidents)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS silver.silver_cip_incidente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  tip_instrument VARCHAR(50),
  serie_numar VARCHAR(50),
  suma_refuzata NUMERIC(18,2),
  data_refuz DATE,
  motiv_refuz VARCHAR(200),
  institutie_financiara VARCHAR(200),
  este_major BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_cip_incidente_company
  ON silver.silver_cip_incidente(company_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_cip_incidente_tenant
  ON silver.silver_cip_incidente(tenant_id);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- NEW TABLE: silver_dosare (Tab 7-8 court cases)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS silver.silver_dosare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES silver.silver_companies(id) ON DELETE CASCADE,
  numar_dosar VARCHAR(50),
  instanta VARCHAR(200),
  categorie_dosar VARCHAR(100),
  obiect_dosar TEXT,
  stadiu VARCHAR(50),
  data_ultima_modificare TIMESTAMPTZ,
  calitate_parte VARCHAR(50),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_dosare_company
  ON silver.silver_dosare(company_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_dosare_tenant
  ON silver.silver_dosare(tenant_id);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- NEW TABLE: silver_parti_dosare (Tab 9 case parties)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS silver.silver_parti_dosare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dosar_id UUID NOT NULL REFERENCES silver.silver_dosare(id) ON DELETE CASCADE,
  nume_parte VARCHAR(255),
  calitate VARCHAR(50),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_parti_dosare_dosar
  ON silver.silver_parti_dosare(dosar_id);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- NEW TABLE: silver_termene_dosare (Tab 10 case terms)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS silver.silver_termene_dosare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dosar_id UUID NOT NULL REFERENCES silver.silver_dosare(id) ON DELETE CASCADE,
  data_termen DATE,
  ora_termen VARCHAR(10),
  solutie TEXT,
  documente_solutie TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_termene_dosare_dosar
  ON silver.silver_termene_dosare(dosar_id);
