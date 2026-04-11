-- 0070: Rebuild silver.silver_companies când metadata pg_attribute e umplută de coloane
-- „dropped” (VACUUM FULL nu eliberează sloturi). Apoi asert global pe schemele aplicației.
--
-- Rulare: același flux ca restul drizzle/*.sql (SET ROLE c3rn1q în migrate — BYPASSRLS).

DO $silver_companies_catalog_rebuild$
DECLARE
  r RECORD;
  live_c      integer;
  drop_c      integer;
  tot_c       integer;
  ins_cols    text;
BEGIN
  SELECT count(*) FILTER (WHERE NOT a.attisdropped),
         count(*) FILTER (WHERE a.attisdropped),
         count(*)
  INTO live_c, drop_c, tot_c
  FROM pg_catalog.pg_attribute a
  WHERE a.attrelid = 'silver.silver_companies'::regclass
    AND a.attnum > 0;

  IF drop_c < 200 AND tot_c < 550 THEN
    RAISE NOTICE 'silver.silver_companies: skip catalog rebuild (live=%, dropped=%, total=%)', live_c, drop_c, tot_c;
    RETURN;
  END IF;

  IF to_regclass('silver.silver_companies__catbloat_0070') IS NOT NULL THEN
    RAISE EXCEPTION 'silver.silver_companies rebuild: orphan table silver.silver_companies__catbloat_0070 exists; resolve manually';
  END IF;

  FOR r IN
    SELECT c.conname, c.conrelid::regclass::text AS tbl
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.confrelid = 'silver.silver_companies'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;

  DROP FUNCTION IF EXISTS silver.silver_compute_completeness(silver.silver_companies);

  ALTER TABLE silver.silver_companies RENAME TO silver_companies__catbloat_0070;

  CREATE TABLE silver.silver_companies (LIKE silver.silver_companies__catbloat_0070 INCLUDING ALL);

  SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position)
  INTO ins_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'silver'
    AND c.table_name = 'silver_companies__catbloat_0070'
    AND c.is_generated = 'NEVER';

  EXECUTE format(
    'INSERT INTO silver.silver_companies (%s) SELECT %s FROM silver.silver_companies__catbloat_0070',
    ins_cols,
    ins_cols
  );

  ALTER TABLE silver.silver_companies
    ADD CONSTRAINT fk_silver_companies_master_record FOREIGN KEY (master_record_id) REFERENCES silver.silver_companies(id) ON DELETE SET NULL;
  ALTER TABLE silver.silver_companies
    ADD CONSTRAINT fk_silver_companies_promoted_to_gold FOREIGN KEY (promoted_to_gold_id) REFERENCES gold.gold_companies(id) ON DELETE SET NULL;
  ALTER TABLE silver.silver_companies
    ADD CONSTRAINT silver_companies_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE silver.silver_companies
    ADD CONSTRAINT silver_companies_source_bronze_id_fkey FOREIGN KEY (source_bronze_id) REFERENCES bronze.bronze_contacts(id) ON DELETE SET NULL;
  ALTER TABLE silver.silver_companies
    ADD CONSTRAINT silver_companies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

  DROP TABLE silver.silver_companies__catbloat_0070;

  ALTER TABLE silver.silver_companies RENAME CONSTRAINT silver_companies_pkey1 TO silver_companies_pkey;

  ALTER INDEX silver.silver_companies_cod_caen_principal_idx RENAME TO idx_silver_companies_caen;
  ALTER INDEX silver.silver_companies_cui_idx RENAME TO idx_silver_companies_cui_trgm;
  ALTER INDEX silver.silver_companies_cui_idx1 RENAME TO idx_silver_companies_cui;
  ALTER INDEX silver.silver_companies_denumire_normalizata_idx RENAME TO idx_silver_companies_denumire_trgm;
  ALTER INDEX silver.silver_companies_location_geography_idx RENAME TO idx_silver_companies_location_geography;
  ALTER INDEX silver.silver_companies_tenant_id_cui_idx1 RENAME TO idx_silver_companies_tenant_cui_lookup;
  ALTER INDEX silver.silver_companies_tenant_id_enrichment_status_last_enriched__idx RENAME TO idx_silver_companies_enrichment;
  ALTER INDEX silver.silver_companies_tenant_id_identity_status_idx RENAME TO idx_silver_companies_identity_status;
  ALTER INDEX silver.silver_companies_tenant_id_nr_reg_com_idx1 RENAME TO idx_silver_companies_tenant_nrregcom_lookup;
  ALTER INDEX silver.silver_companies_tenant_id_promotion_status_total_quality_s_idx RENAME TO idx_silver_companies_promotion;
  ALTER INDEX silver.silver_companies_tenant_id_status_firma_idx RENAME TO idx_silver_companies_status;
  ALTER INDEX silver.silver_companies_tenant_id_total_quality_score_idx RENAME TO idx_silver_companies_quality;
  ALTER INDEX silver.silver_companies_tenant_id_updated_at_idx RENAME TO idx_silver_companies_tenant_updated;
  ALTER INDEX silver.silver_companies_tenant_id_cui_idx RENAME TO idx_silver_companies_cui_tenant;
  ALTER INDEX silver.silver_companies_tenant_id_nr_reg_com_idx RENAME TO idx_silver_companies_nrregcom_tenant;

  ALTER TABLE silver.company_identity_keys
    ADD CONSTRAINT company_identity_keys_company_id_fkey FOREIGN KEY (company_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;
  ALTER TABLE bronze.bronze_contacts
    ADD CONSTRAINT fk_bronze_contacts_promoted_to_silver FOREIGN KEY (promoted_to_silver_id) REFERENCES silver.silver_companies(id) ON DELETE SET NULL;
  ALTER TABLE bronze.bronze_contacts
    ADD CONSTRAINT fk_bronze_contacts_resolved_company FOREIGN KEY (resolved_company_id) REFERENCES silver.silver_companies(id) ON DELETE SET NULL;
  ALTER TABLE gold.gold_companies
    ADD CONSTRAINT gold_companies_silver_id_fkey FOREIGN KEY (silver_id) REFERENCES silver.silver_companies(id) ON DELETE RESTRICT;
  ALTER TABLE silver.silver_bpi_acte
    ADD CONSTRAINT silver_bpi_acte_company_id_fkey FOREIGN KEY (company_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;
  ALTER TABLE silver.silver_cip_incidente
    ADD CONSTRAINT silver_cip_incidente_company_id_fkey FOREIGN KEY (company_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;
  ALTER TABLE silver.silver_company_locations
    ADD CONSTRAINT silver_company_locations_company_id_fkey FOREIGN KEY (company_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;
  ALTER TABLE silver.silver_contacts
    ADD CONSTRAINT silver_contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;
  ALTER TABLE silver.silver_datorii_anaf
    ADD CONSTRAINT silver_datorii_anaf_company_id_fkey FOREIGN KEY (company_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;
  ALTER TABLE silver.silver_dedup_candidates
    ADD CONSTRAINT silver_dedup_candidates_company_a_id_fkey FOREIGN KEY (company_a_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;
  ALTER TABLE silver.silver_dedup_candidates
    ADD CONSTRAINT silver_dedup_candidates_company_b_id_fkey FOREIGN KEY (company_b_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;
  ALTER TABLE silver.silver_dedup_candidates
    ADD CONSTRAINT silver_dedup_candidates_master_company_id_fkey FOREIGN KEY (master_company_id) REFERENCES silver.silver_companies(id) ON DELETE SET NULL;
  ALTER TABLE silver.silver_dosare
    ADD CONSTRAINT silver_dosare_company_id_fkey FOREIGN KEY (company_id) REFERENCES silver.silver_companies(id) ON DELETE CASCADE;

  CREATE OR REPLACE FUNCTION silver.silver_compute_completeness(company silver.silver_companies)
   RETURNS integer
   LANGUAGE plpgsql
   IMMUTABLE
  AS $function$
  DECLARE
    filled_fields integer := 0;
    total_fields  integer := 20;
  BEGIN
    IF company.cui IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.denumire IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.adresa IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.judet IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.localitate IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.status_firma IS NOT NULL AND company.status_firma::text <> 'UNKNOWN' THEN filled_fields := filled_fields + 1; END IF;
    IF company.platitor_tva IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.cod_caen_principal IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.data_inregistrare IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.cifra_afaceri IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.profit_net IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.numar_angajati IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.an_bilant IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.latitude IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.longitude IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.cod_siruta IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.scor_risc_termene IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.categorie_risc IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.inregistrat_e_factura IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF company.nr_reg_com IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

    RETURN LEAST(100, ROUND((filled_fields::numeric / total_fields::numeric) * 100)::integer);
  END;
  $function$;

  ALTER TABLE silver.silver_companies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE silver.silver_companies FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS tenant_isolation_silver_companies ON silver.silver_companies;
  CREATE POLICY tenant_isolation_silver_companies ON silver.silver_companies AS PERMISSIVE FOR ALL TO public
    USING (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)
    WITH CHECK (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid);

  CREATE TRIGGER trg_silver_companies_timestamp
    BEFORE UPDATE ON silver.silver_companies
    FOR EACH ROW EXECUTE FUNCTION silver.silver_update_timestamp();
  CREATE TRIGGER trg_silver_companies_geo
    BEFORE INSERT OR UPDATE OF latitude, longitude ON silver.silver_companies
    FOR EACH ROW EXECUTE FUNCTION silver.silver_compute_geography();
  CREATE TRIGGER trg_silver_companies_quality
    BEFORE INSERT OR UPDATE OF completeness_score, accuracy_score, freshness_score, cui_validated ON silver.silver_companies
    FOR EACH ROW EXECUTE FUNCTION silver.silver_compute_quality_score();

  ANALYZE silver.silver_companies;

  RAISE NOTICE 'silver.silver_companies: catalog rebuild complete (was live=%, dropped=%, total=%)', live_c, drop_c, tot_c;
END;
$silver_companies_catalog_rebuild$;
--> statement-breakpoint

-- Asert: respinge migrarea dacă vreun tabel din schemele aplicației se apropie de plafonul
-- PostgreSQL (1600 atribute fizice / coloane dropped în catalog). Praguri: total ≥ 1200 sau dropped ≥ 300.
DO $assert_pg_attribute_bloat$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch,
           c.relname   AS rel,
           count(*)    AS tot,
           count(*) FILTER (WHERE a.attisdropped) AS dropped
    FROM pg_catalog.pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid AND c.relkind = 'r'
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ANY (
      ARRAY[
        'bronze',
        'silver',
        'gold',
        'approval',
        'audit',
        'integration',
        'outreach',
        'observability',
        'public'
      ]::name[]
    )
    GROUP BY n.nspname, c.relname
    HAVING count(*) >= 1200 OR count(*) FILTER (WHERE a.attisdropped) >= 300
  LOOP
    RAISE EXCEPTION
      'Migrare oprită: pg_attribute bloat pe %.% (total=%, coloane dropped în catalog=%). Limita PG este 1600 sloturi/tabel. Adaugă migrare de tip rebuild (CREATE TABLE … LIKE … INCLUDING ALL, copiere coloane non-generated, refacere FK/RLS/trigger) sau vezi .cursor/rules/database-pg-catalog-bloat.mdc.',
      r.sch, r.rel, r.tot, r.dropped;
  END LOOP;
END;
$assert_pg_attribute_bloat$;
