-- pgTAP: tipuri ENUM — gold (0010 + gold.ts) și outreach/E2 (0024, 0025, migrații ADD VALUE)
-- leadStates în gold sunt chk_gold_state pe varchar, nu ENUM PostgreSQL.
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(13);

CREATE TEMP TABLE pgtap_ctx_public_schema (sc name NOT NULL);
INSERT INTO pgtap_ctx_public_schema VALUES ('public');

SELECT enum_has_labels(
  ctx.sc,
  'risk_category',
  ARRAY['LOW', 'MEDIUM', 'HIGH']::text[],
  'risk_category (gold.ts riskCategoryEnum)'
) FROM pgtap_ctx_public_schema ctx;

SELECT enum_has_labels(
  ctx.sc,
  'contact_role',
  ARRAY[
    'ADMINISTRATOR',
    'ACTIONAR',
    'CONTACT',
    'ASOCIAT',
    'REPREZENTANT'
  ]::text[],
  'contact_role (gold.ts contactRoleEnum)'
) FROM pgtap_ctx_public_schema ctx;

SELECT enum_has_labels(
  ctx.sc,
  'error_severity',
  ARRAY['warning', 'error', 'critical']::text[],
  'error_severity (gold.ts errorSeverityEnum)'
) FROM pgtap_ctx_public_schema ctx;

SELECT is(
  (SELECT COUNT(*)::integer
   FROM pg_enum e
   JOIN pg_type t ON t.oid = e.enumtypid
   JOIN pg_namespace n ON n.oid = t.typnamespace
   JOIN pgtap_ctx_public_schema ctx ON n.nspname = ctx.sc
   WHERE t.typname = 'current_state_enum'),
  18,
  'current_state_enum: 8 (0024) + 10 (0057)'
);

SELECT is(
  (SELECT COUNT(*)::integer
   FROM pg_enum e
   JOIN pg_type t ON t.oid = e.enumtypid
   JOIN pg_namespace n ON n.oid = t.typnamespace
   JOIN pgtap_ctx_public_schema ctx ON n.nspname = ctx.sc
   WHERE t.typname = 'channel_enum'),
  6,
  'channel_enum: baza E2 + SMS (0061)'
);

SELECT is(
  (SELECT COUNT(*)::integer
   FROM pg_enum e
   JOIN pg_type t ON t.oid = e.enumtypid
   JOIN pg_namespace n ON n.oid = t.typnamespace
   JOIN pgtap_ctx_public_schema ctx ON n.nspname = ctx.sc
   WHERE t.typname = 'message_status_enum'),
  10,
  'message_status_enum: baza + BLOCKED (0058)'
);

SELECT enum_has_labels(
  ctx.sc,
  'phone_status_enum',
  ARRAY['ACTIVE', 'PAUSED', 'OFFLINE', 'BANNED', 'RECONNECTING']::text[],
  'phone_status_enum (RECONNECTING canonical)'
) FROM pgtap_ctx_public_schema ctx;

SELECT enum_has_labels(
  ctx.sc,
  'review_priority_enum',
  ARRAY['LOW', 'MEDIUM', 'HIGH', 'URGENT']::text[],
  'review_priority_enum'
) FROM pgtap_ctx_public_schema ctx;

SELECT enum_has_labels(
  ctx.sc,
  'review_reason_enum',
  ARRAY[
    'NEGATIVE_SENTIMENT',
    'KEYWORD_TRIGGER',
    'BOUNCE_DETECTED',
    'COMPLAINT',
    'MANUAL_FLAG',
    'AI_UNCERTAIN'
  ]::text[],
  'review_reason_enum (0024)'
) FROM pgtap_ctx_public_schema ctx;

SELECT is(
  (SELECT COUNT(*)::integer
   FROM pg_enum e
   JOIN pg_type t ON t.oid = e.enumtypid
   JOIN pg_namespace n ON n.oid = t.typnamespace
   JOIN pgtap_ctx_public_schema ctx ON n.nspname = ctx.sc
   WHERE t.typname = 'sequence_status_enum'),
  6,
  'sequence_status_enum: baza + STOPPED (0026)'
);

SELECT enum_has_labels(
  ctx.sc,
  'template_status_enum',
  ARRAY['DRAFT', 'ACTIVE', 'ARCHIVED']::text[],
  'template_status_enum'
) FROM pgtap_ctx_public_schema ctx;

SELECT enum_has_labels(
  ctx.sc,
  'template_type_enum',
  ARRAY['INITIAL', 'FOLLOWUP', 'RESPONSE', 'CLOSING']::text[],
  'template_type_enum'
) FROM pgtap_ctx_public_schema ctx;

SELECT enum_has_labels(
  ctx.sc,
  'message_direction_enum',
  ARRAY['OUTBOUND', 'INBOUND']::text[],
  'message_direction_enum'
) FROM pgtap_ctx_public_schema ctx;

SELECT * FROM finish();
ROLLBACK;
