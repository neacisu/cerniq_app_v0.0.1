/**
 * association-scraping.test.ts — Test Suite FAZA 9g (Plan §X G37-G42)
 *
 * Testează:
 *   1. County Normalization (SIRUTA)
 *   2. CUI Format Validation
 *   3. Name Normalization
 *   4. Jaccard Bigrams Similarity
 *   5. PDF Scrape Result Validation
 *   6. Area Parsing
 *   7. Rate Limit Config (Anti-halucin. B)
 *   8. Queue Registry (328 entries)
 *   9. AssociationMember Match Threshold
 *   10. Coverage Polygon Minimum Points
 *   11. Prometheus Metrics Exist
 */
import { describe, it, expect } from "vitest";
import { QUEUES, queueRegistry } from "@cerniq/worker-shared";
import {
  e5AssociationEntriesScrapedTotal,
  e5AssociationMemberMatchesTotal,
} from "../lib/e5-metrics.js";

// ---------------------------------------------------------------------------
// Secțiunea 1: County Normalization (SIRUTA)
// ---------------------------------------------------------------------------

const COUNTY_NAME_MAP: Record<string, string> = {
  AB: "ALBA",
  AR: "ARAD",
  AG: "ARGES",
  BC: "BACAU",
  BH: "BIHOR",
  BN: "BISTRITA-NASAUD",
  BT: "BOTOSANI",
  BV: "BRASOV",
  BR: "BRAILA",
  B: "BUCURESTI",
  BUC: "BUCURESTI",
  BZ: "BUZAU",
  CS: "CARAS-SEVERIN",
  CL: "CALARASI",
  CJ: "CLUJ",
  CT: "CONSTANTA",
  CV: "COVASNA",
  DB: "DAMBOVITA",
  DJ: "DOLJ",
  GL: "GALATI",
  GR: "GIURGIU",
  GJ: "GORJ",
  HR: "HARGHITA",
  HD: "HUNEDOARA",
  IL: "IALOMITA",
  IS: "IASI",
  IF: "ILFOV",
  MM: "MARAMURES",
  MH: "MEHEDINTI",
  MS: "MURES",
  NT: "NEAMT",
  OT: "OLT",
  PH: "PRAHOVA",
  SM: "SATU-MARE",
  SJ: "SALAJ",
  SB: "SIBIU",
  SV: "SUCEAVA",
  TR: "TELEORMAN",
  TM: "TIMIS",
  TL: "TULCEA",
  VS: "VASLUI",
  VL: "VALCEA",
  VN: "VRANCEA",
  // County full names (identity-like, after normalize diacritics)
  ALBA: "ALBA",
  ARAD: "ARAD",
  ARGES: "ARGES",
  BACAU: "BACAU",
  BIHOR: "BIHOR",
  BUZAU: "BUZAU",
  CLUJ: "CLUJ",
  CONSTANTA: "CONSTANTA",
  DOLJ: "DOLJ",
  GALATI: "GALATI",
  IASI: "IASI",
  ILFOV: "ILFOV",
  TIMIS: "TIMIS",
  BUCURESTI: "BUCURESTI",
  IALOMITA: "IALOMITA",
};

function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .replaceAll("ș", "s")
    .replaceAll("ț", "t")
    .replaceAll("ă", "a")
    .replaceAll("â", "a")
    .replaceAll("î", "i");
}

function normalizeCounty(raw: string): string {
  const cleaned = raw.trim().toUpperCase();
  const withoutDiacritics = stripDiacritics(cleaned);
  // Try original uppercase first
  if (COUNTY_NAME_MAP[withoutDiacritics]) return COUNTY_NAME_MAP[withoutDiacritics];
  // Try as-is
  if (COUNTY_NAME_MAP[cleaned]) return COUNTY_NAME_MAP[cleaned];
  return withoutDiacritics;
}

describe("Secțiunea 1: County Normalization (SIRUTA)", () => {
  it("AB → ALBA", () => {
    expect(normalizeCounty("AB")).toBe("ALBA");
  });

  it("ab (lowercase) → ALBA", () => {
    expect(normalizeCounty("ab")).toBe("ALBA");
  });

  it("Iasi (diacritice) → IASI", () => {
    expect(normalizeCounty("Iași")).toBe("IASI");
  });

  it("MÜNCHEN → nu e județ, returnează uppercase", () => {
    const result = normalizeCounty("MÜNCHEN");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("TIMIS → TIMIS (identity)", () => {
    expect(normalizeCounty("TIMIS")).toBe("TIMIS");
  });

  it("B → BUCURESTI", () => {
    expect(normalizeCounty("B")).toBe("BUCURESTI");
  });

  it("  Alba  (extra whitespace) → ALBA", () => {
    expect(normalizeCounty("  Alba  ")).toBe("ALBA");
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 2: CUI Format Validation
// ---------------------------------------------------------------------------

function isValidCui(cui: string | null | undefined): boolean {
  if (!cui) return false;
  return /^\d{2,10}$/.test(cui.trim());
}

describe("Secțiunea 2: CUI Format Validation", () => {
  it("'12345' este valid", () => {
    expect(isValidCui("12345")).toBe(true);
  });

  it("'RO12345' este invalid (prefix RO)", () => {
    expect(isValidCui("RO12345")).toBe(false);
  });

  it("'1234567890' este valid (10 cifre)", () => {
    expect(isValidCui("1234567890")).toBe(true);
  });

  it("'1' este invalid (< 2 cifre)", () => {
    expect(isValidCui("1")).toBe(false);
  });

  it("'12345678901' este invalid (> 10 cifre)", () => {
    expect(isValidCui("12345678901")).toBe(false);
  });

  it("null este invalid", () => {
    expect(isValidCui(null)).toBe(false);
  });

  it("'' (string gol) este invalid", () => {
    expect(isValidCui("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 3: Name Normalization
// ---------------------------------------------------------------------------

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .replaceAll(/[^a-z0-9\s]/gu, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

describe("Secțiunea 3: Name Normalization", () => {
  it("'Cooperativa Agricolă' → 'cooperativa agricola'", () => {
    expect(normalizeForMatch("Cooperativa Agricolă")).toBe("cooperativa agricola");
  });

  it("'OUAI IALOMIȚA' → 'ouai ialomita'", () => {
    expect(normalizeForMatch("OUAI IALOMIȚA")).toBe("ouai ialomita");
  });

  it("'  multiple   spaces  ' → 'multiple spaces'", () => {
    expect(normalizeForMatch("  multiple   spaces  ")).toBe("multiple spaces");
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 4: Jaccard Bigrams Similarity
// ---------------------------------------------------------------------------

function getBigrams(s: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.slice(i, i + 2));
  }
  return bigrams;
}

function jaccardBigrams(a: string, b: string): number {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (na.length < 2 || nb.length < 2) return 0;
  const bigramsA = getBigrams(na);
  const bigramsB = getBigrams(nb);
  const intersection = new Set([...bigramsA].filter((bg) => bigramsB.has(bg)));
  const union = new Set([...bigramsA, ...bigramsB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

describe("Secțiunea 4: Jaccard Bigrams Similarity", () => {
  it("('abc', 'abc') → 1.0", () => {
    expect(jaccardBigrams("abc", "abc")).toBe(1);
  });

  it("('abc', 'xyz') → 0", () => {
    expect(jaccardBigrams("abc", "xyz")).toBe(0);
  });

  it("('', 'abc') → 0", () => {
    expect(jaccardBigrams("", "abc")).toBe(0);
  });

  it("('COOPERATIVA ALBA', 'Cooperativa Alba SRL') — similarity > 0.5", () => {
    expect(jaccardBigrams("COOPERATIVA ALBA", "Cooperativa Alba SRL")).toBeGreaterThan(0.5);
  });

  it("('OUAI Ialomita', 'OUAI IALOMITA') — similarity > 0.8", () => {
    expect(jaccardBigrams("OUAI Ialomita", "OUAI IALOMITA")).toBeGreaterThan(0.8);
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 5: PDF Scrape Result Validation
// ---------------------------------------------------------------------------

function validateOuaiEntry(entry: unknown): boolean {
  const e = entry as Record<string, unknown>;
  return (
    typeof e.ouai_name === "string" &&
    e.ouai_name.length > 0 &&
    typeof e.county === "string" &&
    e.county.length > 0 &&
    typeof e.net_area_ha === "number" &&
    e.net_area_ha >= 0
  );
}

function validateMadrEntry(entry: unknown): boolean {
  const e = entry as Record<string, unknown>;
  return (
    typeof e.name === "string" &&
    e.name.length > 0 &&
    typeof e.county === "string" &&
    ["OUAI", "COOPERATIVE", "PRODUCER_GROUP", "OTHER"].includes(e.association_type as string)
  );
}

describe("Secțiunea 5: PDF Scrape Result Validation", () => {
  it("OUAI entry valid", () => {
    expect(
      validateOuaiEntry({
        ouai_name: "OUAI Ialomița",
        county: "IL",
        net_area_ha: 1234.56,
      }),
    ).toBe(true);
  });

  it("OUAI entry invalid — lipsă ouai_name", () => {
    expect(
      validateOuaiEntry({
        ouai_name: "",
        county: "IL",
        net_area_ha: 100,
      }),
    ).toBe(false);
  });

  it("OUAI entry invalid — net_area_ha negativ", () => {
    expect(
      validateOuaiEntry({
        ouai_name: "OUAI Test",
        county: "IS",
        net_area_ha: -5,
      }),
    ).toBe(false);
  });

  it("OUAI entry invalid — tip greșit pentru net_area_ha", () => {
    expect(
      validateOuaiEntry({
        ouai_name: "OUAI Test",
        county: "IS",
        net_area_ha: "500",
      }),
    ).toBe(false);
  });

  it("MADR entry valid OUAI", () => {
    expect(
      validateMadrEntry({
        name: "OUAI Dobrogea",
        county: "CT",
        association_type: "OUAI",
      }),
    ).toBe(true);
  });

  it("MADR entry valid COOPERATIVE", () => {
    expect(
      validateMadrEntry({
        name: "Cooperativa Agricola Alba",
        county: "AB",
        association_type: "COOPERATIVE",
      }),
    ).toBe(true);
  });

  it("MADR entry invalid — association_type necunoscut", () => {
    expect(
      validateMadrEntry({
        name: "Test",
        county: "TM",
        association_type: "UNKNOWN_TYPE",
      }),
    ).toBe(false);
  });

  it("MADR entry invalid — name gol", () => {
    expect(
      validateMadrEntry({
        name: "",
        county: "CJ",
        association_type: "OUAI",
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 6: Area Parsing
// ---------------------------------------------------------------------------

function parseArea(value: string): number {
  if (!value) return 0;
  return Number.parseFloat(String(value).replaceAll(".", "").replaceAll(",", ".")) || 0;
}

describe("Secțiunea 6: Area Parsing", () => {
  it("'1.234,56' → 1234.56", () => {
    expect(parseArea("1.234,56")).toBeCloseTo(1234.56);
  });

  it("'500' → 500", () => {
    expect(parseArea("500")).toBe(500);
  });

  it("'0,5' → 0.5", () => {
    expect(parseArea("0,5")).toBeCloseTo(0.5);
  });

  it("'' → 0", () => {
    expect(parseArea("")).toBe(0);
  });

  it("'invalid' → 0", () => {
    expect(parseArea("invalid")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 7: Rate Limit Config (Anti-halucin. B)
// ---------------------------------------------------------------------------

describe("Secțiunea 7: Rate Limit Config G37-G38", () => {
  it("G37 (association:ouai:scrape) are rateLimit.max === 5", () => {
    const g37Config = queueRegistry.find((q) => q.name === QUEUES.E5_ASSOCIATION_OUAI_SCRAPE);
    expect(g37Config).toBeDefined();
    expect(g37Config?.rateLimit?.max).toBe(5);
  });

  it("G38 (association:madr:scrape) are rateLimit.max === 5", () => {
    const g38Config = queueRegistry.find((q) => q.name === QUEUES.E5_ASSOCIATION_MADR_SCRAPE);
    expect(g38Config).toBeDefined();
    expect(g38Config?.rateLimit?.max).toBe(5);
  });

  it("G37 are rateLimit.duration === 60_000", () => {
    const g37Config = queueRegistry.find((q) => q.name === QUEUES.E5_ASSOCIATION_OUAI_SCRAPE);
    expect(g37Config?.rateLimit?.duration).toBe(60_000);
  });

  it("G38 are rateLimit.duration === 60_000", () => {
    const g38Config = queueRegistry.find((q) => q.name === QUEUES.E5_ASSOCIATION_MADR_SCRAPE);
    expect(g38Config?.rateLimit?.duration).toBe(60_000);
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 8: Queue Registry (328 entries)
// ---------------------------------------------------------------------------

describe("Secțiunea 8: Queue Registry count", () => {
  it("queueRegistry are exact 346 înregistrări (345 E5+… + ai:response:generate E2 outreach în worker-shared)", () => {
    expect(queueRegistry.length).toBe(346);
  });

  it("QUEUES.E5_ASSOCIATION_OUAI_SCRAPE există și este 'association:ouai:scrape'", () => {
    expect(QUEUES.E5_ASSOCIATION_OUAI_SCRAPE).toBe("association:ouai:scrape");
  });

  it("QUEUES.E5_ASSOCIATION_MADR_SCRAPE există și este 'association:madr:scrape'", () => {
    expect(QUEUES.E5_ASSOCIATION_MADR_SCRAPE).toBe("association:madr:scrape");
  });

  it("QUEUES.E5_ASSOCIATION_COVERAGE_UPDATE există și este 'association:coverage:update'", () => {
    expect(QUEUES.E5_ASSOCIATION_COVERAGE_UPDATE).toBe("association:coverage:update");
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 9: AssociationMember Match Threshold
// ---------------------------------------------------------------------------

describe("Secțiunea 9: AssociationMember Match Threshold (0.45)", () => {
  const threshold = 0.45;

  it("COOPERATIVA AGRICOLA ALBA vs Cooperativa Agricola Alba SRL → similarity >= 0.45", () => {
    expect(
      jaccardBigrams("COOPERATIVA AGRICOLA ALBA", "Cooperativa Agricola Alba SRL") >= threshold,
    ).toBe(true);
  });

  it("OUAI DOBROGEA vs COOPERATIVA TIMISOARA → similarity < 0.45", () => {
    expect(jaccardBigrams("OUAI DOBROGEA", "COOPERATIVA TIMISOARA") >= threshold).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 10: Coverage Polygon Minimum Points
// ---------------------------------------------------------------------------

function canBuildConvexHull(memberCount: number): boolean {
  return memberCount >= 3;
}

describe("Secțiunea 10: Coverage Polygon Minimum Points", () => {
  it("canBuildConvexHull(0) → false", () => {
    expect(canBuildConvexHull(0)).toBe(false);
  });

  it("canBuildConvexHull(2) → false", () => {
    expect(canBuildConvexHull(2)).toBe(false);
  });

  it("canBuildConvexHull(3) → true", () => {
    expect(canBuildConvexHull(3)).toBe(true);
  });

  it("canBuildConvexHull(100) → true", () => {
    expect(canBuildConvexHull(100)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Secțiunea 11: Prometheus Metrics Exist
// ---------------------------------------------------------------------------

describe("Secțiunea 11: Prometheus Metrics FAZA 9g", () => {
  it("e5AssociationEntriesScrapedTotal este definit", () => {
    expect(e5AssociationEntriesScrapedTotal).toBeDefined();
  });

  it("e5AssociationMemberMatchesTotal este definit", () => {
    expect(e5AssociationMemberMatchesTotal).toBeDefined();
  });
});
