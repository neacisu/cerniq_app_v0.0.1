import { describe, it, expect } from "vitest";
import { auditLlmCalls } from "../src/schemas/audit-llm.js";
import { jobPayloads } from "../src/schemas/job-payloads.js";
import { nomenclatorSiruta } from "../src/schemas/nomenclator-siruta.js";
import { goldCompanies } from "../src/schemas/gold.js";

describe("FAZA 15 — audit LLM, job payloads, nomenclator SIRUTA", () => {
  it("auditLlmCalls are câmpuri obligatorii pentru audit frontier/self-hosted", () => {
    expect(auditLlmCalls.tenantId).toBeDefined();
    expect(auditLlmCalls.workerQueue).toBeDefined();
    expect(auditLlmCalls.modelUsed).toBeDefined();
    expect(auditLlmCalls.promptHash).toBeDefined();
    expect(auditLlmCalls.latencyMs).toBeDefined();
    expect(auditLlmCalls.guardrailPassed).toBeDefined();
    expect(auditLlmCalls.createdAt).toBeDefined();
  });

  it("jobPayloads leagă tenant + expirare pentru offload Redis", () => {
    expect(jobPayloads.tenantId).toBeDefined();
    expect(jobPayloads.payload).toBeDefined();
    expect(jobPayloads.expiresAt).toBeDefined();
  });

  it("nomenclatorSiruta folosește cod_siruta PK și tip enum", () => {
    expect(nomenclatorSiruta.codSiruta).toBeDefined();
    expect(nomenclatorSiruta.denumire).toBeDefined();
    expect(nomenclatorSiruta.tip).toBeDefined();
    expect(nomenclatorSiruta.mediu).toBeDefined();
  });

  it("goldCompanies folosește lichiditateCurenta (fără typo lididitatea*)", () => {
    expect(goldCompanies.lichiditateCurenta).toBeDefined();
    expect("lididitateaCurenta" in goldCompanies).toBe(false);
  });
});
