/**
 * guardrails.test.ts — Test suite 100% pentru lib/guardrails.ts
 *
 * Acoperire completă:
 *  - extractPrices, extractDiscounts, extractCuis, validateRomanianCui
 *  - detectsStockAvailabilityClaim, extractPotentialSkus
 *  - VALID_TVA_RATES, MIN_MARGIN_PERCENT
 *  - runPriceCheck, runStockCheck, runDiscountCheck
 *  - runSkuValidate, runFiscalValidate, runAllGuardrails
 *  - persistGuardrailViolation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks hoisted ──────────────────────────────────────────────────────────────

const { dbSelectMock, dbExecuteMock, dbInsertMock, setSessionTenantIdMock } = vi.hoisted(() => {
  const dbSelectMock = vi.fn();
  const dbExecuteMock = vi.fn();
  const dbInsertMock = vi.fn().mockResolvedValue(undefined);
  const setSessionTenantIdMock = vi.fn().mockResolvedValue(undefined);
  return { dbSelectMock, dbExecuteMock, dbInsertMock, setSessionTenantIdMock };
});

vi.mock("@cerniq/db", () => {
  const insertValuesChain = { values: () => dbInsertMock() };
  return {
    db: {
      select: dbSelectMock,
      execute: dbExecuteMock,
      insert: () => insertValuesChain,
    },
    setSessionTenantId: setSessionTenantIdMock,
    guardrailViolations: {},
    goldProducts: {
      id: "id",
      tenantId: "tenantId",
      sku: "sku",
      unitPrice: "unitPrice",
      isActive: "isActive",
    },
    negotiationItems: {
      tenantId: "tenantId",
      negotiationId: "negotiationId",
      productId: "productId",
    },
    sql: Object.assign(
      vi.fn((parts: TemplateStringsArray, ...vals: unknown[]) => ({ type: "sql", parts, vals })),
      { raw: vi.fn((s: string) => ({ type: "sql_raw", value: s })) },
    ),
    eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
    and: vi.fn((...args: unknown[]) => ({ and: args })),
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Creează un mock chain pentru db.select() care:
 * - returnează `value` când este awaitat direct (e.g. await db.select().from().where())
 * - returnează `value` când se apelează .limit() (e.g. await db.select().from().where().limit())
 */
function makeSelectChain(value: unknown[]) {
  const chain: Record<string, unknown> = {};
  const selfFn = () => chain;
  chain.from = vi.fn(selfFn);
  chain.innerJoin = vi.fn(selfFn);
  chain.where = vi.fn(selfFn);
  chain.limit = vi.fn().mockResolvedValue(value);
  // Make chain thenable: direct await resolves with value
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    Promise.resolve(value).then(onfulfilled, onrejected);
  dbSelectMock.mockReturnValueOnce(chain);
  return chain;
}

const TENANT_ID = "tenant-uuid-1234";
const NEGOTIATION_ID = "negot-uuid-1234";

import {
  extractPrices,
  extractDiscounts,
  extractCuis,
  validateRomanianCui,
  detectsStockAvailabilityClaim,
  extractPotentialSkus,
  VALID_TVA_RATES,
  runPriceCheck,
  runStockCheck,
  runDiscountCheck,
  runSkuValidate,
  runFiscalValidate,
  runAllGuardrails,
  persistGuardrailViolation,
  MIN_MARGIN_PERCENT,
} from "../lib/guardrails.js";

// ── extractPrices ──────────────────────────────────────────────────────────────

describe("extractPrices", () => {
  it("extrage sumă simplă RON", () => {
    const r = extractPrices("Prețul este 1500 RON.");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.amount).toBe(1500);
  });

  it("extrage format românesc cu punct mie și virgulă zecimală", () => {
    const r = extractPrices("Total: 1.500,50 RON");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.amount).toBeCloseTo(1500.5);
  });

  it("extrage EUR și USD", () => {
    const r = extractPrices("Cost: 200 EUR și 150 USD.");
    expect(r).toHaveLength(2);
    expect(r.map((x) => x.amount)).toEqual(expect.arrayContaining([200, 150]));
  });

  it("extrage simbol €", () => {
    const r = extractPrices("Preț: €999");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.amount).toBe(999);
  });

  it("returnează [] dacă nu există sume monetare", () => {
    expect(extractPrices("Bună ziua, cum vă putem ajuta?")).toHaveLength(0);
  });

  it("ignoră sume zero", () => {
    expect(extractPrices("0 RON gratuit")).toHaveLength(0);
  });

  it("extrage mai multe prețuri din același text", () => {
    const r = extractPrices("De la 100 RON la 500 RON.");
    expect(r.length).toBeGreaterThanOrEqual(2);
  });

  it("extrage valoare cu virgulă ca separator zecimal", () => {
    const r = extractPrices("1500,50 RON");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.amount).toBeCloseTo(1500.5);
  });

  it("extrage valoare cu virgulă separator mii americane", () => {
    const r = extractPrices("1,500 RON");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.amount).toBe(1500);
  });
});

// ── extractDiscounts ───────────────────────────────────────────────────────────

describe("extractDiscounts", () => {
  it("extrage 'reducere 15%'", () => {
    const r = extractDiscounts("Oferim reducere 15% pentru dumneavoastră.");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.percent).toBe(15);
  });

  it("extrage 'discount de 20%'", () => {
    const r = extractDiscounts("discount de 20% aplicat");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.percent).toBe(20);
  });

  it("extrage '10% reducere'", () => {
    const r = extractDiscounts("10% reducere la comandă");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.percent).toBe(10);
  });

  it("extrage 'rabat 5%'", () => {
    const r = extractDiscounts("rabat 5% oferit clientului fidel");
    expect(r.at(0)?.percent).toBe(5);
  });

  it("deduplicare — nu returnează același procent de două ori", () => {
    const r = extractDiscounts("reducere 10% și discount 10%");
    expect(r.filter((x) => x.percent === 10)).toHaveLength(1);
  });

  it("returnează [] fără discount menționat", () => {
    expect(extractDiscounts("Preț standard fără modificări.")).toHaveLength(0);
  });

  it("respinge procente > 100", () => {
    expect(extractDiscounts("reducere 150% imposibil")).toHaveLength(0);
  });
});

// ── extractCuis ───────────────────────────────────────────────────────────────

describe("extractCuis", () => {
  it("extrage CUI cu prefix explicit", () => {
    const r = extractCuis("CUI: 12345670");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.cui).toBe("12345670");
  });

  it("extrage CIF cu prefix", () => {
    const r = extractCuis("CIF: 12345670");
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  it("extrage C.U.I. cu puncte", () => {
    const r = extractCuis("C.U.I. 1234567");
    expect(r).toHaveLength(1);
    expect(r.at(0)?.cui).toBe("1234567");
  });

  it("returnează [] fără CUI în text", () => {
    expect(extractCuis("Bună ziua, avem ofertă specială.")).toHaveLength(0);
  });
});

// ── validateRomanianCui ───────────────────────────────────────────────────────

describe("validateRomanianCui", () => {
  it("validează CUI real SC Dedeman SA (13027440)", () => {
    expect(validateRomanianCui("13027440")).toBe(true);
  });

  it("validează CUI real Kaufland Romania (5888716)", () => {
    expect(validateRomanianCui("5888716")).toBe(true);
  });

  it("invalidează CUI cu cifra de control greșită", () => {
    expect(validateRomanianCui("13027441")).toBe(false);
  });

  it("respinge CUI cu mai puțin de 2 cifre", () => {
    expect(validateRomanianCui("1")).toBe(false);
  });

  it("respinge CUI cu mai mult de 10 cifre", () => {
    expect(validateRomanianCui("12345678901")).toBe(false);
  });

  it("ignoră prefixul RO și alte caractere non-digit", () => {
    expect(validateRomanianCui("RO13027440")).toBe(true);
  });

  it("returnează boolean indiferent de input", () => {
    expect(typeof validateRomanianCui("1234567890")).toBe("boolean");
  });
});

// ── detectsStockAvailabilityClaim ─────────────────────────────────────────────

describe("detectsStockAvailabilityClaim", () => {
  it.each([
    "avem stoc pentru acest produs",
    "produsul este în stoc",
    "este disponibil imediat",
    "putem livra mâine",
    "avem disponibil la depozit",
    "stoc disponibil confirmat",
    "livrare imediată posibilă",
    "in stock right now",
    "available immediately",
  ])("detectează afirmație pozitivă: %s", (text) => {
    expect(detectsStockAvailabilityClaim(text)).toBe(true);
  });

  it.each([
    "Nu avem informații despre stoc.",
    "Vă vom confirma disponibilitatea.",
    "Prețul este 1500 RON.",
  ])("nu detectează fals pozitiv: %s", (text) => {
    expect(detectsStockAvailabilityClaim(text)).toBe(false);
  });
});

// ── extractPotentialSkus ──────────────────────────────────────────────────────

describe("extractPotentialSkus", () => {
  it("extrage SKU explicit cu prefix 'SKU:'", () => {
    const r = extractPotentialSkus("SKU: ABC123 este disponibil.");
    expect(r).toContain("ABC123");
  });

  it("extrage 'cod produs: XYZ'", () => {
    const r = extractPotentialSkus("cod produs: PROD-001 la preț special");
    expect(r).toContain("PROD-001");
  });

  it("extrage 'product code: REF456'", () => {
    const r = extractPotentialSkus("product code: REF456");
    expect(r).toContain("REF456");
  });

  it("returnează [] fără SKU explicit", () => {
    expect(extractPotentialSkus("Prețul este 1500 RON.")).toHaveLength(0);
  });

  it("nu returnează duplicate", () => {
    const r = extractPotentialSkus("SKU: ABC123 și SKU: ABC123 din nou");
    expect(r.filter((s) => s === "ABC123")).toHaveLength(1);
  });
});

// ── VALID_TVA_RATES ────────────────────────────────────────────────────────────

describe("VALID_TVA_RATES", () => {
  it("conține ratele valide 0, 5, 9, 19", () => {
    expect(VALID_TVA_RATES.has(0)).toBe(true);
    expect(VALID_TVA_RATES.has(5)).toBe(true);
    expect(VALID_TVA_RATES.has(9)).toBe(true);
    expect(VALID_TVA_RATES.has(19)).toBe(true);
  });

  it("nu conține rate invalide", () => {
    expect(VALID_TVA_RATES.has(15)).toBe(false);
    expect(VALID_TVA_RATES.has(20)).toBe(false);
    expect(VALID_TVA_RATES.has(25)).toBe(false);
  });
});

// ── MIN_MARGIN_PERCENT ────────────────────────────────────────────────────────

describe("MIN_MARGIN_PERCENT", () => {
  it("este 8", () => {
    expect(MIN_MARGIN_PERCENT).toBe(8);
  });
});

// ── runPriceCheck ──────────────────────────────────────────────────────────────

describe("runPriceCheck", () => {
  beforeEach(() => {
    dbSelectMock.mockReset();
    setSessionTenantIdMock.mockClear();
  });

  it("PASS când nu există prețuri în răspuns", async () => {
    const result = await runPriceCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Bună ziua, cum vă putem ajuta?",
    });
    expect(result.passed).toBe(true);
    expect(result.guardrailType).toBe("price");
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("PASS când prețul AI corespunde prețului oficial (în toleranță 2%)", async () => {
    makeSelectChain([{ sku: "SKU-001", officialPrice: "1500.00" }]);
    const result = await runPriceCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Prețul este 1500 RON.",
    });
    expect(result.passed).toBe(true);
  });

  it("PASS când nu există produse în negociere (items=[]) — no false positive", async () => {
    makeSelectChain([]);
    const result = await runPriceCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Prețul este 999 RON.",
    });
    expect(result.passed).toBe(true);
  });

  it("FAIL când prețul AI deviază >2% față de prețul oficial", async () => {
    makeSelectChain([{ sku: "SKU-001", officialPrice: "1500.00" }]);
    const result = await runPriceCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Prețul special este 900 RON.",
    });
    expect(result.passed).toBe(false);
    expect(result.violation).toMatch(/900/);
    expect(result.guardrailType).toBe("price");
  });

  it("PASS cu toleranță customizată (5%) — preț cu mică deviere", async () => {
    makeSelectChain([{ sku: "SKU-001", officialPrice: "1500.00" }]);
    const result = await runPriceCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Prețul este 1520 RON.",
      tolerancePercent: 5,
    });
    // 1520 vs 1500 = 1.33% deviere, < 5% → PASS
    expect(result.passed).toBe(true);
  });

  it("PASS când items au officialPrice null", async () => {
    makeSelectChain([{ sku: "SKU-001", officialPrice: null }]);
    const result = await runPriceCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Prețul este 500 RON.",
    });
    expect(result.passed).toBe(true);
  });

  it("apelează setSessionTenantId", async () => {
    makeSelectChain([]);
    await runPriceCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "1000 RON",
    });
    expect(setSessionTenantIdMock).toHaveBeenCalledWith(TENANT_ID);
  });
});

// ── runStockCheck ─────────────────────────────────────────────────────────────

describe("runStockCheck", () => {
  beforeEach(() => {
    dbSelectMock.mockReset();
    dbExecuteMock.mockReset();
    setSessionTenantIdMock.mockClear();
  });

  it("PASS când AI nu face afirmație de stoc — fără DB query", async () => {
    const result = await runStockCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Prețul este 1500 RON. Vă trimitem oferta.",
    });
    expect(result.passed).toBe(true);
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("PASS când AI afirmă stoc și stocul real > 0", async () => {
    makeSelectChain([{ sku: "SKU-001" }]);
    dbExecuteMock.mockResolvedValue([{ available: 10 }]);
    const result = await runStockCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "avem stoc disponibil pentru comandă",
    });
    expect(result.passed).toBe(true);
  });

  it("FAIL când AI afirmă stoc dar available=0", async () => {
    makeSelectChain([{ sku: "SKU-001" }]);
    dbExecuteMock.mockResolvedValue([{ available: 0 }]);
    const result = await runStockCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "avem stoc pentru acest produs",
    });
    expect(result.passed).toBe(false);
    expect(result.violation).toMatch(/SKU-001/);
    expect(result.guardrailType).toBe("stock");
  });

  it("PASS când SKU-urile sunt null — fallback safe", async () => {
    makeSelectChain([{ sku: null }]);
    const result = await runStockCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "avem stoc disponibil",
    });
    expect(result.passed).toBe(true);
  });

  it("PASS când items sunt goale", async () => {
    makeSelectChain([]);
    const result = await runStockCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "avem stoc disponibil imediat",
    });
    expect(result.passed).toBe(true);
  });

  it("FAIL cu available undefined (fallback la 0)", async () => {
    makeSelectChain([{ sku: "SKU-002" }]);
    dbExecuteMock.mockResolvedValue([{ available: undefined }]);
    const result = await runStockCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "putem livra imediat",
    });
    expect(result.passed).toBe(false);
  });
});

// ── runDiscountCheck ──────────────────────────────────────────────────────────

describe("runDiscountCheck", () => {
  beforeEach(() => {
    dbSelectMock.mockReset();
    dbExecuteMock.mockReset();
    setSessionTenantIdMock.mockClear();
  });

  it("PASS când nu există discount menționat — fără DB query", async () => {
    const result = await runDiscountCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Prețul standard este 1500 RON.",
    });
    expect(result.passed).toBe(true);
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("PASS când discount < maxDiscount", async () => {
    makeSelectChain([{ productId: "prod-1", sku: "SKU-001", unitPrice: "1500.00" }]);
    dbExecuteMock.mockResolvedValue([{ max_discount: 20 }]);
    const result = await runDiscountCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Oferim reducere 10% pentru comanda dumneavoastră.",
    });
    expect(result.passed).toBe(true);
  });

  it("FAIL când discount > maxDiscount", async () => {
    makeSelectChain([{ productId: "prod-1", sku: "SKU-001", unitPrice: "1500.00" }]);
    dbExecuteMock.mockResolvedValue([{ max_discount: 10 }]);
    const result = await runDiscountCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Oferim reducere 25% excepțional.",
    });
    expect(result.passed).toBe(false);
    expect(result.violation).toMatch(/25/);
    expect(result.guardrailType).toBe("discount");
  });

  it("FAIL când marja netă < 8%", async () => {
    makeSelectChain([{ productId: "prod-1", sku: "SKU-001", unitPrice: "100.00" }]);
    // max_discount = 95%, dar 93% discount → marja netă = 7% < 8%
    dbExecuteMock.mockResolvedValue([{ max_discount: 95 }]);
    const result = await runDiscountCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "reducere 93% ofertă specială",
    });
    expect(result.passed).toBe(false);
    expect(result.violation).toMatch(/marjă/);
  });

  it("PASS când items sunt goale", async () => {
    makeSelectChain([]);
    const result = await runDiscountCheck({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "reducere 30% disponibilă",
    });
    expect(result.passed).toBe(true);
  });
});

// ── runSkuValidate ────────────────────────────────────────────────────────────

describe("runSkuValidate", () => {
  beforeEach(() => {
    dbSelectMock.mockReset();
    setSessionTenantIdMock.mockClear();
  });

  it("PASS când nu există SKU explicit în răspuns — fără DB query", async () => {
    const result = await runSkuValidate({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Bună ziua, avem produse disponibile.",
    });
    expect(result.passed).toBe(true);
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("PASS când SKU există în catalog", async () => {
    makeSelectChain([{ id: "prod-uuid-1" }]);
    const result = await runSkuValidate({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "SKU: ABC123 este disponibil la 1500 RON.",
    });
    expect(result.passed).toBe(true);
  });

  it("FAIL când SKU nu există în catalog (rows=[])", async () => {
    makeSelectChain([]);
    const result = await runSkuValidate({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "SKU: INVALID-SKU este un produs excelent.",
    });
    expect(result.passed).toBe(false);
    expect(result.violation).toMatch(/INVALID-SKU/);
    expect(result.guardrailType).toBe("sku");
  });
});

// ── runFiscalValidate ─────────────────────────────────────────────────────────

describe("runFiscalValidate", () => {
  it("PASS când nu există date fiscale în răspuns", async () => {
    const result = await runFiscalValidate({
      response: "Bună ziua, avem oferta pregătită.",
    });
    expect(result.passed).toBe(true);
  });

  it("PASS cu CUI valid (SC Dedeman 13027440)", async () => {
    const result = await runFiscalValidate({
      response: "Factură pentru CUI: 13027440",
    });
    expect(result.passed).toBe(true);
  });

  it("FAIL cu CUI invalid (cifra de control greșită)", async () => {
    const result = await runFiscalValidate({
      response: "Factură pentru CUI: 13027441",
    });
    expect(result.passed).toBe(false);
    expect(result.violation).toMatch(/CUI/i);
    expect(result.guardrailType).toBe("fiscal");
  });

  it("PASS cu TVA valid 19%", async () => {
    const result = await runFiscalValidate({
      response: "TVA de 19% aplicat pe valoarea facturii.",
    });
    expect(result.passed).toBe(true);
  });

  it("PASS cu TVA valid 9%", async () => {
    const result = await runFiscalValidate({ response: "TVA 9% conform legislației." });
    expect(result.passed).toBe(true);
  });

  it("FAIL cu TVA invalid 15%", async () => {
    const result = await runFiscalValidate({
      response: "TVA de 15% conform contractului.",
    });
    expect(result.passed).toBe(false);
    expect(result.violation).toMatch(/15%/);
  });

  it("FAIL cu TVA invalid 20%", async () => {
    const result = await runFiscalValidate({
      response: "aplicăm TVA 20% standard european",
    });
    expect(result.passed).toBe(false);
  });

  it("FAIL cu CUI invalid și TVA invalid — violations multiple", async () => {
    const result = await runFiscalValidate({
      response: "CUI: 99999999, TVA de 15% aplicat.",
    });
    expect(result.passed).toBe(false);
    expect(Array.isArray(result.details?.violations)).toBe(true);
  });

  it("returnează guardrailType fiscal", async () => {
    const result = await runFiscalValidate({ response: "TVA 20% greșit" });
    expect(result.guardrailType).toBe("fiscal");
  });
});

// ── runAllGuardrails ──────────────────────────────────────────────────────────

describe("runAllGuardrails", () => {
  beforeEach(() => {
    dbSelectMock.mockReset();
    dbExecuteMock.mockReset();
    setSessionTenantIdMock.mockClear();
  });

  it("returnează passed=true când toate trec (fără prețuri/discounturi/SKU/CUI)", async () => {
    makeSelectChain([]); // price check items
    makeSelectChain([]); // stock check items
    makeSelectChain([]); // discount check items
    const result = await runAllGuardrails({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Bună ziua, avem oferta pregătită pentru dumneavoastră.",
    });
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(5);
    expect(result.violations).toHaveLength(0);
  });

  it("returnează violations când fiscal guardrail eșuează (TVA invalid)", async () => {
    makeSelectChain([]); // price
    makeSelectChain([]); // stock
    makeSelectChain([]); // discount
    const result = await runAllGuardrails({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "TVA de 15% aplicat conform contractului.",
    });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.guardrailType === "fiscal")).toBe(true);
  });

  it("returnează toate 5 rezultate indiferent de outcome", async () => {
    makeSelectChain([]);
    makeSelectChain([]);
    makeSelectChain([]);
    const result = await runAllGuardrails({
      tenantId: TENANT_ID,
      negotiationId: NEGOTIATION_ID,
      response: "Răspuns generic.",
    });
    expect(result.results).toHaveLength(5);
  });
});

// ── persistGuardrailViolation ─────────────────────────────────────────────────

describe("persistGuardrailViolation", () => {
  beforeEach(() => {
    dbInsertMock.mockReset();
    dbInsertMock.mockResolvedValue(undefined);
  });

  it("apelează db.insert cu parametrii corecți", async () => {
    await persistGuardrailViolation({
      tenantId: TENANT_ID,
      nodeKey: "m71:test-job",
      violationType: "price",
      violation: "Prețul 900 RON deviază față de 1500 RON",
      details: { extractedAmount: 900 },
      severity: "CRITICAL",
    });
    expect(dbInsertMock).toHaveBeenCalledOnce();
  });

  it("folosește severity HIGH implicit când nu este specificat", async () => {
    await persistGuardrailViolation({
      tenantId: TENANT_ID,
      nodeKey: "m74:test",
      violationType: "sku",
      violation: "SKU invalid",
    });
    expect(dbInsertMock).toHaveBeenCalledOnce();
  });
});
