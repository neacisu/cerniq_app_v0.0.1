-- pgTAP: constrângeri cheie, NOT NULL, CHECK, indexuri pe gold.gold_companies
-- Sursă: 0010_gold_schema.sql, 0014_fix_indexes_fks_alignment.sql, 0023_etapa1_schema_phase2_fsm_functions.sql
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(12);

-- O singură sursă pentru identificatori (Sonar plsql:S1192); evită psql :'var' repetat
CREATE TEMP TABLE pgtap_ctx_gold_companies (
  sc name NOT NULL,
  tbl name NOT NULL,
  col_tenant name NOT NULL,
  col_silver name NOT NULL,
  col_cui name NOT NULL
);
INSERT INTO pgtap_ctx_gold_companies VALUES (
  'gold',
  'gold_companies',
  'tenant_id',
  'silver_id',
  'cui'
);

-- FK: has_fk() în pgTAP 1.3.x = (schema, tabel, descriere), fără nume constrângere — folosim col_is_fk + fk_ok
SELECT col_is_fk(ctx.sc, ctx.tbl, ctx.col_tenant::text, 'tenant_id este FK') FROM pgtap_ctx_gold_companies ctx;
SELECT col_is_fk(ctx.sc, ctx.tbl, ctx.col_silver::text, 'silver_id este FK') FROM pgtap_ctx_gold_companies ctx;

SELECT fk_ok(
  ctx.sc,
  ctx.tbl,
  ARRAY[ctx.col_tenant]::name[],
  'public',
  'tenants',
  ARRAY['id']::name[],
  'fk_ok: tenant_id → tenants.id'
) FROM pgtap_ctx_gold_companies ctx;

SELECT fk_ok(
  ctx.sc,
  ctx.tbl,
  ARRAY[ctx.col_silver]::name[],
  'silver',
  'silver_companies',
  ARRAY['id']::name[],
  'fk_ok: silver_id → silver.silver_companies.id'
) FROM pgtap_ctx_gold_companies ctx;

SELECT col_not_null(ctx.sc, ctx.tbl, ctx.col_tenant::text, 'tenant_id NOT NULL') FROM pgtap_ctx_gold_companies ctx;
SELECT col_not_null(ctx.sc, ctx.tbl, ctx.col_silver::text, 'silver_id NOT NULL') FROM pgtap_ctx_gold_companies ctx;
SELECT col_not_null(ctx.sc, ctx.tbl, ctx.col_cui::text, 'cui NOT NULL (post-0023)') FROM pgtap_ctx_gold_companies ctx;

-- has_check(schema, table, text) în pgTAP verifică „există vreun CHECK”, nu numele constrângerii — nume explicit: pg_constraint
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class r ON r.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
    JOIN pgtap_ctx_gold_companies ctx ON n.nspname = ctx.sc AND r.relname = ctx.tbl
    WHERE c.contype = 'c'
      AND c.conname = 'chk_gold_state'
  ),
  'chk_gold_state (CHECK current_state / FSM)'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class r ON r.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
    JOIN pgtap_ctx_gold_companies ctx ON n.nspname = ctx.sc AND r.relname = ctx.tbl
    WHERE c.contype = 'c'
      AND c.conname = 'chk_gold_lead_score'
  ),
  'chk_gold_lead_score (CHECK lead_score 0..100)'
);

SELECT has_index(
  ctx.sc,
  ctx.tbl,
  'idx_gold_companies_cui_tenant',
  ARRAY[ctx.col_tenant, ctx.col_cui]::name[],
  'UNIQUE INDEX (tenant_id, cui)'
) FROM pgtap_ctx_gold_companies ctx;

SELECT has_index(
  ctx.sc,
  ctx.tbl,
  'idx_gold_companies_state',
  ARRAY[ctx.col_tenant, 'current_state'::name, 'state_changed_at'::name],
  'INDEX (tenant_id, current_state, state_changed_at)'
) FROM pgtap_ctx_gold_companies ctx;

-- Index parțial (0014): has_index fără predicat — verificăm definiția
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_indexes i
    JOIN pgtap_ctx_gold_companies ctx ON i.schemaname = ctx.sc::text AND i.tablename = ctx.tbl::text
    WHERE i.indexname = 'idx_gold_companies_lead_score'
      AND i.indexdef ILIKE '%do_not_contact%'
  ),
  'idx_gold_companies_lead_score este parțial (do_not_contact = FALSE)'
);

SELECT * FROM finish();
ROLLBACK;
