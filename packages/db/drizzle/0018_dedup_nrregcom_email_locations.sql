-- NrRegCom unique per tenant (second unique identifier)
CREATE UNIQUE INDEX IF NOT EXISTS idx_silver_companies_nrregcom_tenant
  ON silver.silver_companies(tenant_id, nr_reg_com)
  WHERE nr_reg_com IS NOT NULL AND is_master_record = TRUE;

-- Fix contact email uniqueness: same email allowed on different companies
DROP INDEX IF EXISTS silver.idx_silver_contacts_email_tenant;
CREATE UNIQUE INDEX IF NOT EXISTS idx_silver_contacts_email_tenant
  ON silver.silver_contacts(tenant_id, company_id, email_normalized)
  WHERE email_normalized <> '';

-- Secondary CUI on locations
ALTER TABLE silver.silver_company_locations
  ADD COLUMN IF NOT EXISTS cui VARCHAR(32);
CREATE INDEX IF NOT EXISTS idx_silver_locations_cui
  ON silver.silver_company_locations(tenant_id, cui)
  WHERE cui IS NOT NULL;
