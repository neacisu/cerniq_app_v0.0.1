/**
 * m-workers.test.ts — Test suite 100% pentru M71-M75 Guardrails Workers
 *
 * Acoperire:
 *  - M71 guardrailPriceCheckProcessor: PASS, FAIL + persist violation, job defaults
 *  - M72 guardrailStockCheckProcessor: PASS, FAIL + persist violation
 *  - M73 guardrailDiscountCheckProcessor: PASS, FAIL + persist violation
 *  - M74 guardrailSkuValidateProcessor: PASS, FAIL + persist violation (HIGH)
 *  - M75 guardrailFiscalValidateProcessor: PASS, FAIL + persist violation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks hoisted ──────────────────────────────────────────────────────────────

const {
  setSessionTenantIdMock,
  runPriceCheckMock,
  runStockCheckMock,
  runDiscountCheckMock,
  runSkuValidateMock,
  runFiscalValidateMock,
  persistViolationMock,
} = vi.hoisted(() => {
  return {
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    runPriceCheckMock: vi.fn(),
    runStockCheckMock: vi.fn(),
    runDiscountCheckMock: vi.fn(),
    runSkuValidateMock: vi.fn(),
    runFiscalValidateMock: vi.fn(),
    persistViolationMock: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@cerniq/db", () => ({
  setSessionTenantId: setSessionTenantIdMock,
}));

vi.mock("../lib/guardrails.js", () => ({
  runPriceCheck: runPriceCheckMock,
  runStockCheck: runStockCheckMock,
  runDiscountCheck: runDiscountCheckMock,
  runSkuValidate: runSkuValidateMock,
  runFiscalValidate: runFiscalValidateMock,
  persistGuardrailViolation: persistViolationMock,
}));

import { guardrailPriceCheckProcessor } from "../workers/m71-guardrail-price-check.js";
import { guardrailStockCheckProcessor } from "../workers/m72-guardrail-stock-check.js";
import { guardrailDiscountCheckProcessor } from "../workers/m73-guardrail-discount-check.js";
import { guardrailSkuValidateProcessor } from "../workers/m74-guardrail-sku-validate.js";
import { guardrailFiscalValidateProcessor } from "../workers/m75-guardrail-fiscal-validate.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeJob<T>(data: T, id = "job-001") {
  return { data, id } as never;
}

const TENANT_ID = "tenant-uuid-1234";
const NEGOTIATION_ID = "negot-uuid-5678";
const RESPONSE = "Prețul produsului este 1500 RON.";

// ── M71: guardrailPriceCheckProcessor ────────────────────────────────────────

describe("M71 guardrailPriceCheckProcessor", () => {
  beforeEach(() => {
    setSessionTenantIdMock.mockClear();
    runPriceCheckMock.mockReset();
    persistViolationMock.mockReset();
  });

  it("PASS — apelează runPriceCheck cu parametrii corecți și returnează passed=true", async () => {
    runPriceCheckMock.mockResolvedValue({ passed: true, guardrailType: "price" });

    const result = await guardrailPriceCheckProcessor(
      makeJob({
        tenantId: TENANT_ID,
        negotiationId: NEGOTIATION_ID,
        response: RESPONSE,
      }),
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith(TENANT_ID);
    expect(runPriceCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        negotiationId: NEGOTIATION_ID,
        response: RESPONSE,
        tolerancePercent: 2,
      }),
    );
    expect(persistViolationMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, passed: true, guardrailType: "price" });
  });

  it("FAIL — apelează persistGuardrailViolation cu severity CRITICAL", async () => {
    runPriceCheckMock.mockResolvedValue({
      passed: false,
      guardrailType: "price",
      violation: "Prețul 900 RON deviază față de 1500 RON",
      details: { extractedAmount: 900 },
    });

    const result = await guardrailPriceCheckProcessor(
      makeJob({
        tenantId: TENANT_ID,
        negotiationId: NEGOTIATION_ID,
        response: RESPONSE,
      }),
    );

    expect(persistViolationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        violationType: "price",
        severity: "CRITICAL",
      }),
    );
    expect(result).toMatchObject({ ok: true, passed: false });
  });

  it("folosește tolerancePercent custom din job data", async () => {
    runPriceCheckMock.mockResolvedValue({ passed: true, guardrailType: "price" });

    await guardrailPriceCheckProcessor(
      makeJob({
        tenantId: TENANT_ID,
        negotiationId: NEGOTIATION_ID,
        response: RESPONSE,
        tolerancePercent: 5,
      }),
    );

    expect(runPriceCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({ tolerancePercent: 5 }),
    );
  });

  it("folosește nodeKey custom din job data", async () => {
    runPriceCheckMock.mockResolvedValue({ passed: false, guardrailType: "price", violation: "x" });

    await guardrailPriceCheckProcessor(
      makeJob({
        tenantId: TENANT_ID,
        negotiationId: NEGOTIATION_ID,
        response: RESPONSE,
        nodeKey: "c16:session-abc",
      }),
    );

    expect(persistViolationMock).toHaveBeenCalledWith(
      expect.objectContaining({ nodeKey: "c16:session-abc" }),
    );
  });

  it("nu apelează persist când passed=false dar violation este undefined", async () => {
    runPriceCheckMock.mockResolvedValue({ passed: false, guardrailType: "price" });

    await guardrailPriceCheckProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );

    expect(persistViolationMock).not.toHaveBeenCalled();
  });
});

// ── M72: guardrailStockCheckProcessor ────────────────────────────────────────

describe("M72 guardrailStockCheckProcessor", () => {
  beforeEach(() => {
    setSessionTenantIdMock.mockClear();
    runStockCheckMock.mockReset();
    persistViolationMock.mockReset();
  });

  it("PASS — nu persist violation", async () => {
    runStockCheckMock.mockResolvedValue({ passed: true, guardrailType: "stock" });

    const result = await guardrailStockCheckProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );

    expect(persistViolationMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, passed: true, guardrailType: "stock" });
  });

  it("FAIL — persist cu severity CRITICAL", async () => {
    runStockCheckMock.mockResolvedValue({
      passed: false,
      guardrailType: "stock",
      violation: "AI afirmă stoc dar available=0 pentru SKU-001",
    });

    const result = await guardrailStockCheckProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );

    expect(persistViolationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        violationType: "stock",
        severity: "CRITICAL",
      }),
    );
    expect(result).toMatchObject({ ok: true, passed: false });
  });

  it("apelează setSessionTenantId cu tenantId corect", async () => {
    runStockCheckMock.mockResolvedValue({ passed: true, guardrailType: "stock" });
    await guardrailStockCheckProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );
    expect(setSessionTenantIdMock).toHaveBeenCalledWith(TENANT_ID);
  });
});

// ── M73: guardrailDiscountCheckProcessor ─────────────────────────────────────

describe("M73 guardrailDiscountCheckProcessor", () => {
  beforeEach(() => {
    setSessionTenantIdMock.mockClear();
    runDiscountCheckMock.mockReset();
    persistViolationMock.mockReset();
  });

  it("PASS — nu persist violation", async () => {
    runDiscountCheckMock.mockResolvedValue({ passed: true, guardrailType: "discount" });

    const result = await guardrailDiscountCheckProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );

    expect(persistViolationMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, passed: true, guardrailType: "discount" });
  });

  it("FAIL — persist cu severity CRITICAL", async () => {
    runDiscountCheckMock.mockResolvedValue({
      passed: false,
      guardrailType: "discount",
      violation: "Discount 25% > max 10%",
    });

    await guardrailDiscountCheckProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );

    expect(persistViolationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        violationType: "discount",
        severity: "CRITICAL",
      }),
    );
  });

  it("returnează violation în result", async () => {
    const violation = "Discount 30% > max 10%";
    runDiscountCheckMock.mockResolvedValue({
      passed: false,
      guardrailType: "discount",
      violation,
    });

    const result = await guardrailDiscountCheckProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );

    expect(result).toMatchObject({ violation });
  });
});

// ── M74: guardrailSkuValidateProcessor ───────────────────────────────────────

describe("M74 guardrailSkuValidateProcessor", () => {
  beforeEach(() => {
    setSessionTenantIdMock.mockClear();
    runSkuValidateMock.mockReset();
    persistViolationMock.mockReset();
  });

  it("PASS — nu persist violation", async () => {
    runSkuValidateMock.mockResolvedValue({ passed: true, guardrailType: "sku" });

    const result = await guardrailSkuValidateProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );

    expect(persistViolationMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, passed: true, guardrailType: "sku" });
  });

  it("FAIL — persist cu severity HIGH (nu CRITICAL pentru SKU)", async () => {
    runSkuValidateMock.mockResolvedValue({
      passed: false,
      guardrailType: "sku",
      violation: "SKU-uri inexistente: FAKE-001",
    });

    await guardrailSkuValidateProcessor(
      makeJob({ tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE }),
    );

    expect(persistViolationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        violationType: "sku",
        severity: "HIGH",
      }),
    );
  });

  it("transmite nodeKey din job.id implicit când nu este specificat", async () => {
    runSkuValidateMock.mockResolvedValue({
      passed: false,
      guardrailType: "sku",
      violation: "x",
    });

    await guardrailSkuValidateProcessor(
      makeJob(
        { tenantId: TENANT_ID, negotiationId: NEGOTIATION_ID, response: RESPONSE },
        "job-sku-test",
      ),
    );

    expect(persistViolationMock).toHaveBeenCalledWith(
      expect.objectContaining({ nodeKey: "m74:job-sku-test" }),
    );
  });
});

// ── M75: guardrailFiscalValidateProcessor ────────────────────────────────────

describe("M75 guardrailFiscalValidateProcessor", () => {
  beforeEach(() => {
    setSessionTenantIdMock.mockClear();
    runFiscalValidateMock.mockReset();
    persistViolationMock.mockReset();
  });

  it("PASS — nu persist violation", async () => {
    runFiscalValidateMock.mockResolvedValue({ passed: true, guardrailType: "fiscal" });

    const result = await guardrailFiscalValidateProcessor(
      makeJob({ tenantId: TENANT_ID, response: RESPONSE }),
    );

    expect(persistViolationMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, passed: true, guardrailType: "fiscal" });
  });

  it("FAIL — persist cu severity CRITICAL", async () => {
    runFiscalValidateMock.mockResolvedValue({
      passed: false,
      guardrailType: "fiscal",
      violation: "CUI invalid: 99999999; TVA invalid: 15%",
    });

    await guardrailFiscalValidateProcessor(makeJob({ tenantId: TENANT_ID, response: RESPONSE }));

    expect(persistViolationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        violationType: "fiscal",
        severity: "CRITICAL",
      }),
    );
  });

  it("apelează runFiscalValidate cu doar response (fără negotiationId)", async () => {
    runFiscalValidateMock.mockResolvedValue({ passed: true, guardrailType: "fiscal" });

    await guardrailFiscalValidateProcessor(makeJob({ tenantId: TENANT_ID, response: RESPONSE }));

    expect(runFiscalValidateMock).toHaveBeenCalledWith({ response: RESPONSE });
  });

  it("apelează setSessionTenantId cu tenantId (chiar fără negotiationId)", async () => {
    runFiscalValidateMock.mockResolvedValue({ passed: true, guardrailType: "fiscal" });

    await guardrailFiscalValidateProcessor(makeJob({ tenantId: TENANT_ID, response: RESPONSE }));

    expect(setSessionTenantIdMock).toHaveBeenCalledWith(TENANT_ID);
  });

  it("returnează violation în result", async () => {
    const violation = "CUI invalid: 99999999";
    runFiscalValidateMock.mockResolvedValue({
      passed: false,
      guardrailType: "fiscal",
      violation,
    });

    const result = await guardrailFiscalValidateProcessor(
      makeJob({ tenantId: TENANT_ID, response: RESPONSE }),
    );

    expect(result).toMatchObject({ violation });
  });
});
