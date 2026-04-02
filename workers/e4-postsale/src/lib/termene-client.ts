/**
 * termene-client.ts — HTTP client Termene.ro API pentru E4 Credit Scoring
 *
 * Urmează același pattern ca workers/enrichment/src/lib/termene-api-client.ts
 * (circuit breaker + external API metrics). Refolosind endpoint-urile confirmate:
 *   - /firme/{cui}/bilant  → date financiare (CA, profit, equity, current ratio)
 *   - /firme/{cui}/dosare  → dosare instanță (litigii ca pârât + proceduri insolvență)
 *
 * Anti-halucinare: NU inventăm endpoint-uri noi; refolosim exclusiv endpoint-urile
 * confirmate din codul existent (e1-termene-balance.ts, e2-termene-risk.ts).
 */
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";

const TERMENE_API_URL = process.env.TERMENE_API_URL ?? "https://api.termene.ro/v2";
const TERMENE_API_KEY = process.env.TERMENE_API_KEY ?? "";
const TERMENE_TIMEOUT_MS = Number(process.env.TERMENE_API_TIMEOUT_MS ?? "20000");

async function callTermene(path: string): Promise<Record<string, unknown> | null> {
  if (!TERMENE_API_KEY) {
    throw new Error("Missing TERMENE_API_KEY");
  }
  const response = await fetch(`${TERMENE_API_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${TERMENE_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(TERMENE_TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Termene API error: ${response.status} ${path}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

const termeneBreaker = createCircuitBreaker(callTermene, "termene-e4-credit", {
  timeout: TERMENE_TIMEOUT_MS,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  volumeThreshold: 5,
});

/**
 * Bilanț financiar — CA, profit net, equity, current ratio pentru ultimii 3 ani.
 * Endpoint: /firme/{cui}/bilant (confirmat în e1-termene-balance.ts).
 */
export async function getTermeneBilant(cui: string): Promise<Record<string, unknown> | null> {
  return withExternalApiMetrics("termene", () => termeneBreaker.fire(`/firme/${cui}/bilant`));
}

/**
 * Dosare instanță — litigii ca pârât + proceduri BPI insolvență.
 * Endpoint: /firme/{cui}/dosare (confirmat în termene-api-client.ts existent).
 * Răspunsul conține câmpuri: proceduri_insolventa, dosare_parat, dosare_reclamant, etc.
 */
export async function getTermeneDosare(cui: string): Promise<Record<string, unknown> | null> {
  return withExternalApiMetrics("termene", () => termeneBreaker.fire(`/firme/${cui}/dosare`));
}

// ── Tipuri parsate pentru credit scoring ────────────────────────────────────

export type TermeneBilantYear = {
  an: number;
  cifraAfaceri: number | null;
  profitNet: number | null;
  capitaluriProprii: number | null;
  activeCirculante: number | null;
  datoriiCurente: number | null;
};

export type TermeneBilantParsed = {
  years: TermeneBilantYear[];
};

export type TermeneDosareParsed = {
  proceduri_insolventa_active: number;
  proceduri_insolventa_inchise: number;
  dosare_parat_active: number;
  dosare_parat_inactive: number;
};

/**
 * Parsează răspunsul /bilant din Termene.ro pentru ultimii 3 ani.
 * Termene.ro returnează o listă de obiecte pe an, câmpurile principale:
 *   cifra_afaceri, profit_net, capitaluri_proprii, active_circulante, datorii_curente
 */
export function parseBilant(raw: Record<string, unknown>): TermeneBilantParsed {
  let list: Record<string, unknown>[];
  if (Array.isArray(raw.bilant)) {
    list = raw.bilant as Record<string, unknown>[];
  } else if (Array.isArray(raw.data)) {
    list = raw.data as Record<string, unknown>[];
  } else {
    list = [];
  }

  const years: TermeneBilantYear[] = list
    .slice(0, 3)
    .map((item) => ({
      an: Number(item.an ?? item.year ?? 0),
      cifraAfaceri: toNumberOrNull(item.cifra_afaceri ?? item.revenue),
      profitNet: toNumberOrNull(item.profit_net ?? item.net_profit),
      capitaluriProprii: toNumberOrNull(item.capitaluri_proprii ?? item.equity),
      activeCirculante: toNumberOrNull(item.active_circulante ?? item.current_assets),
      datoriiCurente: toNumberOrNull(item.datorii_curente ?? item.current_liabilities),
    }))
    .filter((y) => y.an > 0);

  return { years };
}

/**
 * Parsează răspunsul /dosare din Termene.ro.
 * Câmpuri relevante pentru scoring:
 *   - proceduri_insolventa: array cu { status: 'activa'|'inchisa', ... }
 *   - dosare_parat: array cu { status: 'activ'|'inchis', ... }
 */
export function parseDosare(raw: Record<string, unknown>): TermeneDosareParsed {
  const insolventa = toArray(raw.proceduri_insolventa ?? raw.insolventa);
  const dosareParat = toArray(raw.dosare_parat ?? raw.dosare);

  return {
    proceduri_insolventa_active: insolventa.filter(
      (d) =>
        String(d.status ?? "")
          .toLowerCase()
          .includes("activ") &&
        !String(d.status ?? "")
          .toLowerCase()
          .includes("inactiv"),
    ).length,
    proceduri_insolventa_inchise: insolventa.filter((d) =>
      String(d.status ?? "")
        .toLowerCase()
        .includes("inchi"),
    ).length,
    dosare_parat_active: dosareParat.filter(
      (d) =>
        String(d.status ?? "")
          .toLowerCase()
          .includes("activ") &&
        !String(d.status ?? "")
          .toLowerCase()
          .includes("inactiv"),
    ).length,
    dosare_parat_inactive: dosareParat.filter(
      (d) =>
        !String(d.status ?? "")
          .toLowerCase()
          .includes("activ") ||
        String(d.status ?? "")
          .toLowerCase()
          .includes("inactiv"),
    ).length,
  };
}

function toNumberOrNull(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function toArray(val: unknown): Record<string, unknown>[] {
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  return [];
}
