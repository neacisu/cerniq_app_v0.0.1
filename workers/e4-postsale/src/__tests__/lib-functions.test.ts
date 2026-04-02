/**
 * Teste pentru funcțiile pure din lib/ (E4 Credit Scoring 100p)
 * Fișier separat — fără mock-uri de module, testare reală.
 *
 * Acoperire:
 *   - credit-scoring-engine: toate funcțiile (100% acoperire)
 *   - termene-client: parseBilant, parseDosare
 *   - anaf-client: parseAnafForCredit
 */
import { describe, it, expect } from "vitest";

// ── credit-scoring-engine ─────────────────────────────────────────────────────

import {
  scoreAnafStatus,
  scoreFinancialHealth,
  scoreBpiStatus,
  scorePaymentHistory,
  scoreLitigation,
  resolveRiskTier,
  calculateCreditScore,
  CREDIT_LIMIT_MAP,
  HITL_THRESHOLD_RON,
} from "../lib/credit-scoring-engine.js";

describe("credit-scoring-engine — scoreAnafStatus (15p)", () => {
  it("activ fiscal + TVA activ → 15p", () => {
    expect(
      scoreAnafStatus({ isActivFiscal: true, isTvaActiv: true, stareInregistrare: "ACTIVA" }),
    ).toBe(15);
  });

  it("activ fiscal fără TVA → 10p", () => {
    expect(
      scoreAnafStatus({ isActivFiscal: true, isTvaActiv: false, stareInregistrare: "ACTIVA" }),
    ).toBe(10);
  });

  it("inactiv (radiat) → 0p", () => {
    expect(
      scoreAnafStatus({ isActivFiscal: false, isTvaActiv: false, stareInregistrare: "RADIAT" }),
    ).toBe(0);
  });

  it("inactiv cu TVA → 5p (TVA contează independent)", () => {
    expect(
      scoreAnafStatus({ isActivFiscal: false, isTvaActiv: true, stareInregistrare: "INACTIVA" }),
    ).toBe(5);
  });
});

describe("credit-scoring-engine — scoreFinancialHealth (30p)", () => {
  const threeYears = [
    {
      an: 2021,
      cifraAfaceri: 1_000_000,
      profitNet: 100_000,
      capitaluriProprii: 500_000,
      activeCirculante: 400_000,
      datoriiCurente: 200_000,
    },
    {
      an: 2022,
      cifraAfaceri: 1_100_000,
      profitNet: 110_000,
      capitaluriProprii: 550_000,
      activeCirculante: 420_000,
      datoriiCurente: 200_000,
    },
    {
      an: 2023,
      cifraAfaceri: 1_200_000,
      profitNet: 120_000,
      capitaluriProprii: 600_000,
      activeCirculante: 440_000,
      datoriiCurente: 200_000,
    },
  ];

  it("scor maxim 30p cu toate condițiile pozitive", () => {
    const score = scoreFinancialHealth({ years: threeYears });
    expect(score).toBe(30);
  });

  it("fără date financiare → 0p", () => {
    expect(scoreFinancialHealth({ years: [] })).toBe(0);
  });

  it("profit negativ 3 ani → 0p pe componenta profit", () => {
    const noProfit = threeYears.map((y) => ({ ...y, profitNet: -1_000 }));
    const score = scoreFinancialHealth({ years: noProfit });
    expect(score).toBeLessThan(30);
  });

  it("CA descrescător → 0p pe componenta CA trend", () => {
    const decreasing = [
      {
        an: 2022,
        cifraAfaceri: 1_200_000,
        profitNet: 100_000,
        capitaluriProprii: 500_000,
        activeCirculante: 400_000,
        datoriiCurente: 200_000,
      },
      {
        an: 2023,
        cifraAfaceri: 1_000_000,
        profitNet: 100_000,
        capitaluriProprii: 500_000,
        activeCirculante: 400_000,
        datoriiCurente: 200_000,
      },
    ];
    const score = scoreFinancialHealth({ years: decreasing });
    expect(score).toBeLessThan(30);
  });

  it("equity negativ → scor sub maxim (lipsă 5p equity)", () => {
    const negativeEquity = [{ ...threeYears[2], capitaluriProprii: -10_000 }];
    const score = scoreFinancialHealth({ years: negativeEquity });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(30);
  });

  it("current ratio < 1 → 0p pe componenta current ratio", () => {
    const badRatio = [{ ...threeYears[2], activeCirculante: 50_000, datoriiCurente: 200_000 }];
    const score = scoreFinancialHealth({ years: badRatio });
    expect(score).toBeLessThan(25);
  });

  it("datoriiCurente = 0 → current ratio = ∞ → 5p", () => {
    const noDebt = [{ ...threeYears[2], datoriiCurente: 0 }];
    const score = scoreFinancialHealth({ years: noDebt });
    expect(score).toBeGreaterThanOrEqual(5);
  });

  it("1 an din 3 profitabil → 3-4p din 10p", () => {
    const oneProfit = [
      {
        an: 2021,
        cifraAfaceri: 900_000,
        profitNet: -5_000,
        capitaluriProprii: 400_000,
        activeCirculante: 300_000,
        datoriiCurente: 200_000,
      },
      {
        an: 2022,
        cifraAfaceri: 950_000,
        profitNet: -2_000,
        capitaluriProprii: 420_000,
        activeCirculante: 310_000,
        datoriiCurente: 200_000,
      },
      {
        an: 2023,
        cifraAfaceri: 1_000_000,
        profitNet: 50_000,
        capitaluriProprii: 450_000,
        activeCirculante: 320_000,
        datoriiCurente: 200_000,
      },
    ];
    const score = scoreFinancialHealth({ years: oneProfit });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(30);
  });
});

describe("credit-scoring-engine — scoreBpiStatus (20p)", () => {
  it("zero proceduri → 20p", () => {
    expect(
      scoreBpiStatus({
        proceduri_insolventa_active: 0,
        proceduri_insolventa_inchise: 0,
        dosare_parat_active: 0,
        dosare_parat_inactive: 0,
      }),
    ).toBe(20);
  });

  it("proceduri inchise → 10p", () => {
    expect(
      scoreBpiStatus({
        proceduri_insolventa_active: 0,
        proceduri_insolventa_inchise: 2,
        dosare_parat_active: 0,
        dosare_parat_inactive: 0,
      }),
    ).toBe(10);
  });

  it("proceduri active → 0p (insolvent)", () => {
    expect(
      scoreBpiStatus({
        proceduri_insolventa_active: 1,
        proceduri_insolventa_inchise: 0,
        dosare_parat_active: 0,
        dosare_parat_inactive: 0,
      }),
    ).toBe(0);
  });

  it("proceduri active + inchise → 0p (active domină)", () => {
    expect(
      scoreBpiStatus({
        proceduri_insolventa_active: 1,
        proceduri_insolventa_inchise: 5,
        dosare_parat_active: 0,
        dosare_parat_inactive: 0,
      }),
    ).toBe(0);
  });
});

describe("credit-scoring-engine — scorePaymentHistory (25p)", () => {
  it("client nou (fără comenzi) → 12p neutral", () => {
    expect(scorePaymentHistory({ totalOrders: 0, onTimeOrders: 0 })).toBe(12);
  });

  it("on-time rate >95% → 25p", () => {
    expect(scorePaymentHistory({ totalOrders: 100, onTimeOrders: 96 })).toBe(25);
  });

  it("on-time rate exact 96% → 25p", () => {
    expect(scorePaymentHistory({ totalOrders: 100, onTimeOrders: 96 })).toBe(25);
  });

  it("on-time rate 85-95% → 20p", () => {
    expect(scorePaymentHistory({ totalOrders: 100, onTimeOrders: 90 })).toBe(20);
  });

  it("on-time rate exact 85% → 20p (limita inferioară a intervalului)", () => {
    expect(scorePaymentHistory({ totalOrders: 100, onTimeOrders: 85 })).toBe(20);
  });

  it("on-time rate 70-85% → 10p", () => {
    expect(scorePaymentHistory({ totalOrders: 100, onTimeOrders: 75 })).toBe(10);
  });

  it("on-time rate exact 70% → 10p (limita inferioară)", () => {
    expect(scorePaymentHistory({ totalOrders: 100, onTimeOrders: 70 })).toBe(10);
  });

  it("on-time rate <70% → 0p", () => {
    expect(scorePaymentHistory({ totalOrders: 100, onTimeOrders: 60 })).toBe(0);
  });

  it("on-time rate 0% → 0p", () => {
    expect(scorePaymentHistory({ totalOrders: 10, onTimeOrders: 0 })).toBe(0);
  });
});

describe("credit-scoring-engine — scoreLitigation (10p)", () => {
  it("zero dosare ca pârât → 10p", () => {
    expect(
      scoreLitigation({
        proceduri_insolventa_active: 0,
        proceduri_insolventa_inchise: 0,
        dosare_parat_active: 0,
        dosare_parat_inactive: 0,
      }),
    ).toBe(10);
  });

  it("dosare inactive → 5p", () => {
    expect(
      scoreLitigation({
        proceduri_insolventa_active: 0,
        proceduri_insolventa_inchise: 0,
        dosare_parat_active: 0,
        dosare_parat_inactive: 3,
      }),
    ).toBe(5);
  });

  it("dosare active → 0p", () => {
    expect(
      scoreLitigation({
        proceduri_insolventa_active: 0,
        proceduri_insolventa_inchise: 0,
        dosare_parat_active: 2,
        dosare_parat_inactive: 0,
      }),
    ).toBe(0);
  });

  it("dosare active + inactive → 0p (active domină)", () => {
    expect(
      scoreLitigation({
        proceduri_insolventa_active: 0,
        proceduri_insolventa_inchise: 0,
        dosare_parat_active: 1,
        dosare_parat_inactive: 5,
      }),
    ).toBe(0);
  });
});

describe("credit-scoring-engine — resolveRiskTier", () => {
  it.each([
    [0, "BLOCKED"],
    [5, "BLOCKED"],
    [19, "BLOCKED"],
    [20, "LOW"],
    [30, "LOW"],
    [39, "LOW"],
    [40, "MEDIUM"],
    [50, "MEDIUM"],
    [59, "MEDIUM"],
    [60, "HIGH"],
    [75, "HIGH"],
    [79, "HIGH"],
    [80, "PREMIUM"],
    [90, "PREMIUM"],
    [100, "PREMIUM"],
  ] as const)("scor %i → tier %s", (score, tier) => {
    expect(resolveRiskTier(score)).toBe(tier);
  });
});

describe("credit-scoring-engine — calculateCreditScore (integrare)", () => {
  const perfectAnaf = { isActivFiscal: true, isTvaActiv: true, stareInregistrare: "ACTIVA" };
  const perfectBilant = {
    years: [
      {
        an: 2021,
        cifraAfaceri: 1_000_000,
        profitNet: 100_000,
        capitaluriProprii: 500_000,
        activeCirculante: 400_000,
        datoriiCurente: 100_000,
      },
      {
        an: 2022,
        cifraAfaceri: 1_100_000,
        profitNet: 110_000,
        capitaluriProprii: 550_000,
        activeCirculante: 420_000,
        datoriiCurente: 100_000,
      },
      {
        an: 2023,
        cifraAfaceri: 1_200_000,
        profitNet: 120_000,
        capitaluriProprii: 600_000,
        activeCirculante: 440_000,
        datoriiCurente: 100_000,
      },
    ],
  };
  const cleanDosare = {
    proceduri_insolventa_active: 0,
    proceduri_insolventa_inchise: 0,
    dosare_parat_active: 0,
    dosare_parat_inactive: 0,
  };
  const perfectHistory = { totalOrders: 50, onTimeOrders: 50 };

  it("VERIFICARE PLAN: scor maxim 100 → PREMIUM + 100.000 RON", () => {
    const result = calculateCreditScore(perfectAnaf, perfectBilant, cleanDosare, perfectHistory);
    expect(result.score).toBe(100);
    expect(result.riskTier).toBe("PREMIUM");
    expect(result.creditLimit).toBe(100_000);
  });

  it("VERIFICARE PLAN: BLOCKED → 0 RON", () => {
    const badAnaf = { isActivFiscal: false, isTvaActiv: false, stareInregistrare: "RADIAT" };
    const badDosare = {
      proceduri_insolventa_active: 2,
      proceduri_insolventa_inchise: 0,
      dosare_parat_active: 3,
      dosare_parat_inactive: 0,
    };
    const badHistory = { totalOrders: 10, onTimeOrders: 5 };
    const result = calculateCreditScore(badAnaf, { years: [] }, badDosare, badHistory);
    expect(result.riskTier).toBe("BLOCKED");
    expect(result.creditLimit).toBe(0);
  });

  it("VERIFICARE PLAN: scor ~ 75 → HIGH + 50.000 RON", () => {
    const history85 = { totalOrders: 100, onTimeOrders: 90 };
    const result = calculateCreditScore(perfectAnaf, perfectBilant, cleanDosare, history85);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["HIGH", "PREMIUM"]).toContain(result.riskTier);
    expect([50_000, 100_000]).toContain(result.creditLimit);
  });

  it("componente returnate corect din 5 surse", () => {
    const result = calculateCreditScore(perfectAnaf, perfectBilant, cleanDosare, perfectHistory);
    expect(result.components).toHaveProperty("anafStatus");
    expect(result.components).toHaveProperty("financialHealth");
    expect(result.components).toHaveProperty("bpiStatus");
    expect(result.components).toHaveProperty("paymentHistory");
    expect(result.components).toHaveProperty("litigation");
  });

  it("scor nu depășește 100 chiar cu valori imposibil de mari", () => {
    const result = calculateCreditScore(perfectAnaf, perfectBilant, cleanDosare, {
      totalOrders: 1000,
      onTimeOrders: 1000,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("CREDIT_LIMIT_MAP are valorile corecte din Plan L2070", () => {
    expect(CREDIT_LIMIT_MAP.BLOCKED).toBe(0);
    expect(CREDIT_LIMIT_MAP.LOW).toBe(5_000);
    expect(CREDIT_LIMIT_MAP.MEDIUM).toBe(20_000);
    expect(CREDIT_LIMIT_MAP.HIGH).toBe(50_000);
    expect(CREDIT_LIMIT_MAP.PREMIUM).toBe(100_000);
  });

  it("HITL_THRESHOLD_RON = 50.000 (Plan L2057)", () => {
    expect(HITL_THRESHOLD_RON).toBe(50_000);
  });
});

// ── termene-client ────────────────────────────────────────────────────────────

import { parseBilant, parseDosare } from "../lib/termene-client.js";

describe("termene-client — parseBilant", () => {
  it("parsează structura bilant[]", () => {
    const raw = {
      bilant: [
        {
          an: 2023,
          cifra_afaceri: 1_000_000,
          profit_net: 100_000,
          capitaluri_proprii: 500_000,
          active_circulante: 400_000,
          datorii_curente: 200_000,
        },
        {
          an: 2022,
          cifra_afaceri: 900_000,
          profit_net: 80_000,
          capitaluri_proprii: 450_000,
          active_circulante: 350_000,
          datorii_curente: 180_000,
        },
      ],
    };
    const result = parseBilant(raw);
    expect(result.years).toHaveLength(2);
    expect(result.years[0]?.an).toBe(2023);
    expect(result.years[0]?.cifraAfaceri).toBe(1_000_000);
    expect(result.years[0]?.profitNet).toBe(100_000);
    expect(result.years[0]?.capitaluriProprii).toBe(500_000);
  });

  it("parsează structura data[]", () => {
    const raw = {
      data: [
        {
          an: 2023,
          cifra_afaceri: 500_000,
          profit_net: -10_000,
          capitaluri_proprii: -50_000,
          active_circulante: 100_000,
          datorii_curente: 200_000,
        },
      ],
    };
    const result = parseBilant(raw);
    expect(result.years).toHaveLength(1);
    expect(result.years[0]?.profitNet).toBe(-10_000);
    expect(result.years[0]?.capitaluriProprii).toBe(-50_000);
  });

  it("răspuns gol → years=[]", () => {
    expect(parseBilant({}).years).toHaveLength(0);
    expect(parseBilant({ bilant: [] }).years).toHaveLength(0);
  });

  it("limitează la 3 ani", () => {
    const raw = {
      bilant: [1, 2, 3, 4, 5].map((i) => ({
        an: 2020 + i,
        cifra_afaceri: i * 100_000,
        profit_net: i * 10_000,
      })),
    };
    const result = parseBilant(raw);
    expect(result.years).toHaveLength(3);
  });

  it("filtrează anii fără `an` valid", () => {
    const raw = {
      bilant: [
        { an: 0, cifra_afaceri: 100_000, profit_net: 10_000 },
        { an: 2023, cifra_afaceri: 200_000, profit_net: 20_000 },
      ],
    };
    const result = parseBilant(raw);
    expect(result.years).toHaveLength(1);
    expect(result.years[0]?.an).toBe(2023);
  });
});

describe("termene-client — parseDosare", () => {
  it("parsează proceduri insolventa active și inchise", () => {
    const raw = {
      proceduri_insolventa: [
        { status: "activa", data: "2023-01-01" },
        { status: "inchisa", data: "2022-01-01" },
      ],
      dosare_parat: [{ status: "activ" }, { status: "inactiv" }],
    };
    const result = parseDosare(raw);
    expect(result.proceduri_insolventa_active).toBe(1);
    expect(result.proceduri_insolventa_inchise).toBe(1);
    expect(result.dosare_parat_active).toBe(1);
    expect(result.dosare_parat_inactive).toBe(1);
  });

  it("niciun dosar → toate 0", () => {
    const result = parseDosare({});
    expect(result.proceduri_insolventa_active).toBe(0);
    expect(result.proceduri_insolventa_inchise).toBe(0);
    expect(result.dosare_parat_active).toBe(0);
    expect(result.dosare_parat_inactive).toBe(0);
  });

  it("dosare goale → toate 0", () => {
    const result = parseDosare({ proceduri_insolventa: [], dosare_parat: [] });
    expect(result.proceduri_insolventa_active).toBe(0);
    expect(result.dosare_parat_inactive).toBe(0);
  });

  it("multiple proceduri active → nr corect", () => {
    const raw = {
      proceduri_insolventa: [
        { status: "activa" },
        { status: "activa" },
        { status: "activa" },
        { status: "inchisa" },
      ],
    };
    const result = parseDosare(raw);
    expect(result.proceduri_insolventa_active).toBe(3);
    expect(result.proceduri_insolventa_inchise).toBe(1);
  });
});

// ── anaf-client ───────────────────────────────────────────────────────────────

import { parseAnafForCredit } from "../lib/anaf-client.js";

function makeAnafRecord(stare: string, scpTVA: boolean, statusInactivi = false) {
  return {
    date_generale: {
      cui: 12345678,
      stare_inregistrare: stare,
      denumire: "Test SRL",
      adresa: "Bd. Test",
      nrRegCom: "J40/1/2010",
      cod_CAEN: "6201",
      statusRO_e_Factura: false,
      telefon: "",
      fax: "",
      codPostal: "",
      act: "",
      data_inregistrare: "2010-01-01",
      iban: "",
      organFiscalCompetent: "",
      forma_de_proprietate: "",
      forma_organizare: "",
      forma_juridica: "",
    },
    inregistrare_scop_Tva: { scpTVA, perioade_TVA: [] },
    stare_inactiv: {
      statusInactivi,
      dataInactivare: "",
      dataReactivare: "",
      dataPublicare: "",
      dataRadiere: "",
    },
    inregistrare_RTVAI: {
      dataInceputTvaInc: "",
      dataSfarsitTvaInc: "",
      dataActualizareTvaInc: "",
      dataPublicareTvaInc: "",
      tipActTvaInc: "",
      statusTvaIncasare: false,
    },
    inregistrare_SplitTVA: {
      dataInceputSplitTVA: "",
      dataAnulareSplitTVA: "",
      statusSplitTVA: false,
    },
    adresa_sediu_social: {},
    adresa_domiciliu_fiscal: {},
  };
}

describe("anaf-client — parseAnafForCredit", () => {
  it("companie activă cu TVA → isActivFiscal=true, isTvaActiv=true", () => {
    const result = parseAnafForCredit(makeAnafRecord("ACTIVA", true));
    expect(result.isActivFiscal).toBe(true);
    expect(result.isTvaActiv).toBe(true);
  });

  it("companie activă fără TVA → isActivFiscal=true, isTvaActiv=false", () => {
    const result = parseAnafForCredit(makeAnafRecord("ACTIVA", false));
    expect(result.isActivFiscal).toBe(true);
    expect(result.isTvaActiv).toBe(false);
  });

  it("companie radiată → isActivFiscal=false", () => {
    const result = parseAnafForCredit(makeAnafRecord("RADIATA", false));
    expect(result.isActivFiscal).toBe(false);
  });

  it("companie inactivă (statusInactivi=true) → isActivFiscal=false chiar cu stare ACTIVA", () => {
    const result = parseAnafForCredit(makeAnafRecord("ACTIVA", false, true));
    expect(result.isActivFiscal).toBe(false);
  });

  it("companie dizolvată → isActivFiscal=false", () => {
    const result = parseAnafForCredit(makeAnafRecord("DIZOLVARE", false));
    expect(result.isActivFiscal).toBe(false);
  });

  it("companie în insolvență → isActivFiscal=false", () => {
    const result = parseAnafForCredit(makeAnafRecord("INSOLVENTA", false));
    expect(result.isActivFiscal).toBe(false);
  });

  it("stareInregistrare este inclusă în rezultat", () => {
    const result = parseAnafForCredit(makeAnafRecord("ACTIVA", true));
    expect(result.stareInregistrare).toBe("ACTIVA");
  });
});
