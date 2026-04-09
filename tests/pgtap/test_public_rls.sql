-- pgTAP: RLS pe public.users / roles / user_roles (0005 + 0007 — current_setting('app.tenant_id', true))
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(3);

CREATE TEMP TABLE pgtap_ctx_public_schema (sc name NOT NULL);
INSERT INTO pgtap_ctx_public_schema VALUES ('public');

SELECT policies_are(
  ctx.sc,
  'users',
  ARRAY[
    'tenant_isolation_users',
    'tenant_insert_users',
    'tenant_update_users',
    'tenant_delete_users'
  ]::name[],
  'public.users: patru policy-uri tenant (0005/0007)'
) FROM pgtap_ctx_public_schema ctx;

SELECT policies_are(
  ctx.sc,
  'roles',
  ARRAY[
    'tenant_isolation_roles',
    'tenant_insert_roles',
    'tenant_update_roles',
    'tenant_delete_roles'
  ]::name[],
  'public.roles: patru policy-uri tenant'
) FROM pgtap_ctx_public_schema ctx;

SELECT policies_are(
  ctx.sc,
  'user_roles',
  ARRAY[
    'tenant_isolation_user_roles',
    'tenant_insert_user_roles',
    'tenant_update_user_roles',
    'tenant_delete_user_roles'
  ]::name[],
  'public.user_roles: patru policy-uri tenant'
) FROM pgtap_ctx_public_schema ctx;

SELECT * FROM finish();
ROLLBACK;
