#!/usr/bin/env node
import assert from "node:assert/strict";
import { test } from "node:test";
import { extractSonarTokenFromRenderedEnvContent } from "../../infra/scripts/lib/sonar-token-from-rendered-env.mjs";

test("extrage SONAR_TOKEN din format agent (fără ghilimele)", () => {
  const raw = `# gen
SONAR_TOKEN=abc123def
OPENBAO_SONAR_ENV_RENDERED=true
`;
  assert.equal(extractSonarTokenFromRenderedEnvContent(raw), "abc123def");
});

test("elimină ghilimele duble înconjurătoare", () => {
  assert.equal(
    extractSonarTokenFromRenderedEnvContent('SONAR_TOKEN="tok:with=chars"\n'),
    "tok:with=chars",
  );
});

test("elimină apostrofuri înconjurătoare", () => {
  assert.equal(extractSonarTokenFromRenderedEnvContent("SONAR_TOKEN='tok_1'\n"), "tok_1");
});

test("ignoră linii goale și comentarii", () => {
  assert.equal(
    extractSonarTokenFromRenderedEnvContent("# c\n\nSONAR_TOKEN=z\n"),
    "z",
  );
});

test("returnează null dacă lipsește cheia", () => {
  assert.equal(extractSonarTokenFromRenderedEnvContent("OTHER=1\n"), null);
});
