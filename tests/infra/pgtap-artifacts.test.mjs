#!/usr/bin/env node
/**
 * Artefacte pgTAP: fișiere SQL și scriptul run-pgtap.sh aliniate la migrațiile reale (fără execuție DB în CI).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const GOLD_0010 = path.join(root, "packages/db/drizzle/0010_gold_schema.sql");
const RLS = path.join(root, "tests/pgtap/test_rls.sql");
const CONSTRAINTS = path.join(root, "tests/pgtap/test_constraints.sql");
const ENUMS = path.join(root, "tests/pgtap/test_enums.sql");
const OUTREACH = path.join(root, "tests/pgtap/test_outreach_schema.sql");
const PUBLIC_RLS = path.join(root, "tests/pgtap/test_public_rls.sql");

test("tests/pgtap/*.sql există", () => {
  const dir = path.join(root, "tests/pgtap");
  assert.ok(fs.existsSync(dir), "tests/pgtap/");
  const expected = [
    "test_constraints.sql",
    "test_enums.sql",
    "test_outreach_schema.sql",
    "test_public_rls.sql",
    "test_rls.sql",
  ];
  for (const name of expected) {
    assert.ok(fs.existsSync(path.join(dir, name)), name);
  }
});

test("test_rls.sql folosește policy-urile din 0010_gold_schema (tenant_isolation_gold_*)", () => {
  const sql = fs.readFileSync(RLS, "utf8");
  assert.match(sql, /tenant_isolation_gold_companies/);
  assert.match(sql, /tenant_isolation_gold_contacts/);
  assert.match(sql, /app\.tenant_id/);
  const gold = fs.readFileSync(GOLD_0010, "utf8");
  assert.match(gold, /CREATE POLICY tenant_isolation_gold_companies/);
});

/**
 * Context unic INSERT (Sonar plsql:S1192): identificatori canonici fără psql :'var' repetat.
 */
test("fișierele pgTAP folosesc CREATE TEMP TABLE + INSERT pentru identificatori canonici", () => {
  const c = fs.readFileSync(CONSTRAINTS, "utf8");
  assert.match(c, /CREATE TEMP TABLE pgtap_ctx_gold_companies/i);
  assert.match(c, /INSERT INTO pgtap_ctx_gold_companies VALUES\s*\(\s*'gold'/);

  const e = fs.readFileSync(ENUMS, "utf8");
  assert.match(e, /CREATE TEMP TABLE pgtap_ctx_public_schema/i);
  assert.match(e, /INSERT INTO pgtap_ctx_public_schema VALUES\s*\(\s*'public'/);

  const o = fs.readFileSync(OUTREACH, "utf8");
  assert.match(o, /CREATE TEMP TABLE pgtap_ctx_outreach/i);
  assert.match(o, /INSERT INTO pgtap_ctx_outreach VALUES\s*\(\s*'outreach'/);

  const p = fs.readFileSync(PUBLIC_RLS, "utf8");
  assert.match(p, /CREATE TEMP TABLE pgtap_ctx_public_schema/i);

  const r = fs.readFileSync(RLS, "utf8");
  assert.match(r, /CREATE TEMP TABLE pgtap_ctx_gold_rls/i);
  assert.match(r, /INSERT INTO pgtap_ctx_gold_rls VALUES\s*\(\s*'gold'/);
});

test("infra/scripts/run-pgtap.sh există și e bash valid", () => {
  const sh = path.join(root, "infra/scripts/run-pgtap.sh");
  assert.ok(fs.existsSync(sh));
  const { status } = spawnSync("bash", ["-n", sh], { stdio: "pipe" });
  assert.equal(status, 0);
});
