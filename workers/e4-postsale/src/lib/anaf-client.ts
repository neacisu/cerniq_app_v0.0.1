/**
 * anaf-client.ts — ANAF API v9 client pentru E4 Credit Scoring
 *
 * Refolosește logica din workers/enrichment/src/lib/anaf-api-client.ts (E1).
 * Necesită o copie locală deoarece pachetul enrichment nu exportă API clients
 * (boundaries monorepo: enrichment ≠ e4-postsale).
 *
 * Anti-halucinare: implementare identică cu E1 — NU adăugăm logică proprie.
 * URL: https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva (ANAF v9)
 * Auth: niciuna (endpoint public ANAF)
 */
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";

const ANAF_TIMEOUT_MS = Number(process.env.ANAF_API_TIMEOUT_MS ?? "25000");
const ANAF_V9_URL =
  process.env.ANAF_V9_URL ?? "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

// ── Tipuri ANAF v9 (identice cu E1) ─────────────────────────────────────────

export type AnafV9DateGenerale = {
  cui: number;
  denumire: string;
  adresa: string;
  nrRegCom: string;
  stare_inregistrare: string;
  data_inregistrare: string;
  cod_CAEN: string;
  statusRO_e_Factura: boolean;
};

export type AnafV9ScopTva = {
  scpTVA: boolean;
  perioade_TVA: Array<{
    data_inceput_ScpTVA: string;
    data_sfarsit_ScpTVA: string;
    data_anul_imp_ScpTVA: string;
    mesaj_ScpTVA: string;
  }>;
};

export type AnafV9StareInactiv = {
  statusInactivi: boolean;
};

export type AnafV9CompanyRecord = {
  date_generale: AnafV9DateGenerale;
  inregistrare_scop_Tva: AnafV9ScopTva;
  stare_inactiv: AnafV9StareInactiv;
};

// ── Client intern ─────────────────────────────────────────────────────────────

async function callAnafV9Batch(cuis: number[]): Promise<Map<number, AnafV9CompanyRecord>> {
  const today = new Date().toISOString().split("T")[0];
  const payload = cuis.map((cui) => ({ cui, data: today }));
  const response = await fetch(ANAF_V9_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(ANAF_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`ANAF v9 API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    cod: number;
    message: string;
    found: AnafV9CompanyRecord[];
    notFound: number[];
  };

  const found = new Map<number, AnafV9CompanyRecord>();
  if (Array.isArray(data.found)) {
    for (const record of data.found) {
      if (record.date_generale?.cui) {
        found.set(Number(record.date_generale.cui), record);
      }
    }
  }
  return found;
}

const anafBreaker = createCircuitBreaker(callAnafV9Batch, "anaf-v9-e4-credit", {
  timeout: ANAF_TIMEOUT_MS,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  volumeThreshold: 5,
});

/**
 * Fetch ANAF v9 pentru un singur CUI.
 * Returnează null dacă CUI-ul nu este găsit în ANAF.
 */
export async function fetchAnafByCui(cleanCui: string): Promise<AnafV9CompanyRecord | null> {
  const cuiNum = Number.parseInt(cleanCui, 10);
  if (Number.isNaN(cuiNum)) return null;

  const found = await withExternalApiMetrics("anaf_v9", () => anafBreaker.fire([cuiNum]));
  return found.get(cuiNum) ?? null;
}

// ── Tipuri parsate pentru credit scoring ────────────────────────────────────

export type AnafCreditData = {
  isActivFiscal: boolean;
  isTvaActiv: boolean;
  stareInregistrare: string;
};

/**
 * Parsează răspunsul ANAF pentru componenta anafStatus (15p) din credit score.
 */
export function parseAnafForCredit(record: AnafV9CompanyRecord): AnafCreditData {
  const stare = String(record.date_generale.stare_inregistrare ?? "").toUpperCase();
  const isActivFiscal =
    !stare.includes("RADIAT") &&
    !stare.includes("INACT") &&
    !stare.includes("DIZOLV") &&
    !stare.includes("INSOLV") &&
    !record.stare_inactiv.statusInactivi;

  const isTvaActiv = record.inregistrare_scop_Tva.scpTVA === true;

  return {
    isActivFiscal,
    isTvaActiv,
    stareInregistrare: stare,
  };
}
