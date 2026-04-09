-- pgTAP: RLS activ + policy names pe gold (sursă: 0010_gold_schema.sql)
-- Notă: superuser BYPASSRLS — nu testăm aici număr de rânduri vizibile cross-tenant fără rol dedicat fără BYPASSRLS și seed.
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(8);

CREATE TEMP TABLE pgtap_ctx_gold_rls (
  sc name NOT NULL,
  tbl_companies name NOT NULL
);
INSERT INTO pgtap_ctx_gold_rls VALUES ('gold', 'gold_companies');

-- RLS + FORCE (echivalent ALTER TABLE ... FORCE ROW LEVEL SECURITY)
SELECT ok(
  (SELECT c.relrowsecurity
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   JOIN pgtap_ctx_gold_rls ctx ON n.nspname = ctx.sc AND c.relname = ctx.tbl_companies),
  'gold.gold_companies: ROW LEVEL SECURITY activ'
);

SELECT ok(
  (SELECT c.relforcerowsecurity
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   JOIN pgtap_ctx_gold_rls ctx ON n.nspname = ctx.sc AND c.relname = ctx.tbl_companies),
  'gold.gold_companies: FORCE ROW LEVEL SECURITY'
);

SELECT policies_are(
  ctx.sc,
  ctx.tbl_companies,
  ARRAY['tenant_isolation_gold_companies']::name[],
  'gold_companies: o singură policy FOR ALL (0010)'
) FROM pgtap_ctx_gold_rls ctx;

SELECT policies_are(
  ctx.sc,
  'gold_contacts',
  ARRAY['tenant_isolation_gold_contacts']::name[],
  'gold_contacts: tenant isolation policy'
) FROM pgtap_ctx_gold_rls ctx;

SELECT policies_are(
  ctx.sc,
  'gold_lead_journey',
  ARRAY['tenant_isolation_gold_lead_journey']::name[],
  'gold_lead_journey: tenant isolation policy'
) FROM pgtap_ctx_gold_rls ctx;

SELECT policies_are(
  ctx.sc,
  'daily_stats',
  ARRAY['tenant_isolation_daily_stats']::name[],
  'daily_stats: tenant isolation policy'
) FROM pgtap_ctx_gold_rls ctx;

SELECT policies_are(
  ctx.sc,
  'pipeline_errors',
  ARRAY['tenant_isolation_pipeline_errors']::name[],
  'pipeline_errors: tenant isolation policy'
) FROM pgtap_ctx_gold_rls ctx;

-- Policy-urile folosesc GUC app.tenant_id (vezi 0010)
SELECT ok(
  COALESCE(
    (SELECT (COALESCE(qual::text, '') || COALESCE(with_check::text, '')) LIKE '%app.tenant_id%'
     FROM pg_policies p
     JOIN pgtap_ctx_gold_rls ctx ON p.schemaname = ctx.sc AND p.tablename = ctx.tbl_companies
     WHERE p.policyname = 'tenant_isolation_gold_companies'),
    false
  ),
  'tenant_isolation_gold_companies referă app.tenant_id (current_setting)'
);

SELECT * FROM finish();
ROLLBACK;
