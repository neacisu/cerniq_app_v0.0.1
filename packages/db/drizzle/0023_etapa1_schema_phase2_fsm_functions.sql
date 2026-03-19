ALTER TYPE company_status ADD VALUE IF NOT EXISTS 'UNKNOWN';
--> statement-breakpoint
UPDATE gold.gold_companies gc
SET cui = sc.cui
FROM silver.silver_companies sc
WHERE gc.silver_id = sc.id
  AND gc.cui IS NULL
  AND sc.cui IS NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM gold.gold_companies WHERE cui IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce gold.gold_companies.cui NOT NULL while rows with NULL CUI still exist';
  END IF;
END;
$$;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
ALTER COLUMN cui SET NOT NULL;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
DROP CONSTRAINT IF EXISTS chk_gold_state;
--> statement-breakpoint
ALTER TABLE gold.gold_companies
ADD CONSTRAINT chk_gold_state CHECK (
  current_state IN (
    'COLD',
    'CONTACTED_WA',
    'CONTACTED_EMAIL',
    'CONTACTED_PHONE',
    'WARM_REPLY',
    'ENGAGED',
    'NEGOTIATION',
    'PROPOSAL',
    'CLOSING',
    'CONVERTED',
    'ONBOARDING',
    'NURTURING_ACTIVE',
    'AT_RISK',
    'LOYAL_ADVOCATE',
    'CHURNED',
    'DEAD',
    'DO_NOT_CONTACT'
  )
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bronze.bronze_compute_content_hash(p_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      jsonb_build_object(
        'n', lower(trim(coalesce(p_payload->>'denumire', p_payload->>'name', p_payload->>'company_name', ''))),
        'c', regexp_replace(coalesce(p_payload->>'cui', p_payload->>'CUI', p_payload->>'cod_fiscal', ''), '[^0-9]', '', 'g'),
        'p', regexp_replace(coalesce(p_payload->>'telefon', p_payload->>'phone', p_payload->>'tel', p_payload->>'mobil', ''), '[^0-9+]', '', 'g'),
        'e', lower(trim(coalesce(p_payload->>'email', p_payload->>'Email', p_payload->>'EMAIL', p_payload->>'e_mail', '')))
      )::text,
      'sha256'
    ),
    'hex'
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION silver.silver_compute_quality_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_quality_score := ROUND((
    COALESCE(NEW.completeness_score, 0) * 0.40 +
    COALESCE(NEW.accuracy_score, 0) * 0.35 +
    COALESCE(NEW.freshness_score, 0) * 0.25
  )::numeric, 2);

  IF NEW.promotion_status = 'promoted' THEN
    RETURN NEW;
  END IF;

  IF NEW.total_quality_score >= 70 AND COALESCE(NEW.cui_validated, FALSE) = TRUE THEN
    NEW.promotion_status := 'eligible';
    NEW.promotion_blocked_reason := NULL;
  ELSIF NEW.total_quality_score >= 40 THEN
    NEW.promotion_status := 'review_required';
    NEW.promotion_blocked_reason := 'quality_review_required';
  ELSE
    NEW.promotion_status := 'blocked';
    NEW.promotion_blocked_reason := 'quality_below_threshold';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_silver_companies_quality ON silver.silver_companies;
--> statement-breakpoint
CREATE TRIGGER trg_silver_companies_quality
BEFORE INSERT OR UPDATE OF completeness_score, accuracy_score, freshness_score, cui_validated
ON silver.silver_companies
FOR EACH ROW
EXECUTE FUNCTION silver.silver_compute_quality_score();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION silver.silver_compute_completeness(company silver.silver_companies)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  filled_fields integer := 0;
  total_fields integer := 20;
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
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION silver.silver_get_stats(p_tenant_id uuid)
RETURNS TABLE(
  total_companies bigint,
  validated_companies bigint,
  enriched_companies bigint,
  eligible_for_gold bigint,
  promoted_to_gold bigint,
  pending_dedup_review bigint,
  avg_quality_score numeric,
  avg_completeness numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE cui_validated = TRUE)::bigint,
    COUNT(*) FILTER (WHERE enrichment_status = 'complete')::bigint,
    COUNT(*) FILTER (WHERE promotion_status = 'eligible')::bigint,
    COUNT(*) FILTER (WHERE promotion_status = 'promoted')::bigint,
    (
      SELECT COUNT(*)::bigint
      FROM silver.silver_dedup_candidates d
      WHERE d.tenant_id = p_tenant_id
        AND d.status IN ('pending', 'hitl_pending')
    ),
    ROUND(AVG(total_quality_score)::numeric, 2),
    ROUND(AVG(completeness_score)::numeric, 2)
  FROM silver.silver_companies
  WHERE tenant_id = p_tenant_id
    AND COALESCE(is_master_record, TRUE) = TRUE;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gold.gold_log_state_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_performed_by uuid;
BEGIN
  IF NEW.current_state IS DISTINCT FROM OLD.current_state THEN
    NEW.previous_state := OLD.current_state;
    NEW.state_changed_at := now();
    NEW.state_history := COALESCE(OLD.state_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'from', OLD.current_state,
        'to', NEW.current_state,
        'at', now()
      )
    );

    v_performed_by := NULLIF(
      current_setting('app.current_user_id', true),
      '00000000-0000-0000-0000-000000000000'
    )::uuid;

    INSERT INTO gold.gold_lead_journey (
      tenant_id,
      company_id,
      event_type,
      from_state,
      to_state,
      metadata,
      performed_by,
      correlation_id
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      'state_transition',
      OLD.current_state,
      NEW.current_state,
      jsonb_build_object('trigger', 'gold_log_state_transition'),
      v_performed_by,
      COALESCE(NEW.metadata->>'correlationId', OLD.metadata->>'correlationId')
    );
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gold.gold_compute_fit_score(company gold.gold_companies)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gold.gold_get_dashboard_stats(p_tenant_id uuid)
RETURNS TABLE(
  total_leads bigint,
  cold_leads bigint,
  warm_leads bigint,
  hot_leads bigint,
  converted bigint,
  avg_lead_score numeric,
  conversion_rate numeric,
  leads_by_state jsonb,
  leads_by_region jsonb
)
LANGUAGE sql
STABLE
AS $$
  WITH scoped AS (
    SELECT *
    FROM gold.gold_companies
    WHERE tenant_id = p_tenant_id
  ),
  state_stats AS (
    SELECT COALESCE(jsonb_object_agg(current_state, state_count), '{}'::jsonb) AS payload
    FROM (
      SELECT current_state, COUNT(*)::bigint AS state_count
      FROM scoped
      GROUP BY current_state
    ) s
  ),
  region_stats AS (
    SELECT COALESCE(jsonb_object_agg(judet_cod, region_count), '{}'::jsonb) AS payload
    FROM (
      SELECT judet_cod, COUNT(*)::bigint AS region_count
      FROM scoped
      WHERE judet_cod IS NOT NULL
      GROUP BY judet_cod
    ) r
  ),
  agg AS (
    SELECT
      COUNT(*)::bigint                                                                                                     AS total_leads,
      COUNT(*) FILTER (WHERE current_state = 'COLD')::bigint                                                             AS cold_leads,
      COUNT(*) FILTER (WHERE current_state IN ('WARM_REPLY', 'ENGAGED', 'ONBOARDING', 'NURTURING_ACTIVE', 'LOYAL_ADVOCATE'))::bigint AS warm_leads,
      COUNT(*) FILTER (WHERE current_state IN ('NEGOTIATION', 'PROPOSAL', 'CLOSING', 'AT_RISK'))::bigint                 AS hot_leads,
      COUNT(*) FILTER (WHERE current_state = 'CONVERTED')::bigint                                                        AS converted,
      ROUND(AVG(lead_score)::numeric, 2)                                                                                  AS avg_lead_score,
      ROUND((COUNT(*) FILTER (WHERE current_state = 'CONVERTED')::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 2)      AS conversion_rate
    FROM scoped
  )
  SELECT
    agg.total_leads,
    agg.cold_leads,
    agg.warm_leads,
    agg.hot_leads,
    agg.converted,
    agg.avg_lead_score,
    agg.conversion_rate,
    state_stats.payload,
    region_stats.payload
  FROM agg
  CROSS JOIN state_stats
  CROSS JOIN region_stats;
$$;
