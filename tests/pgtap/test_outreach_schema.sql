-- pgTAP: schema outreach + tabele canonice (0025_create_outreach_schema.sql)
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(5);

CREATE TEMP TABLE pgtap_ctx_outreach (sc name NOT NULL);
INSERT INTO pgtap_ctx_outreach VALUES ('outreach');

SELECT has_schema(ctx.sc, 'schema outreach există (0025)') FROM pgtap_ctx_outreach ctx;

SELECT has_table(ctx.sc, 'lead_journey', 'outreach.lead_journey') FROM pgtap_ctx_outreach ctx;
SELECT has_table(ctx.sc, 'communication_log', 'outreach.communication_log') FROM pgtap_ctx_outreach ctx;
SELECT has_table(ctx.sc, 'wa_phone_numbers', 'outreach.wa_phone_numbers') FROM pgtap_ctx_outreach ctx;
SELECT has_table(ctx.sc, 'human_review_queue', 'outreach.human_review_queue') FROM pgtap_ctx_outreach ctx;

SELECT * FROM finish();
ROLLBACK;
