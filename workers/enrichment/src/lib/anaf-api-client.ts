import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";

/**
 * I16 — HTTP batch ANAF partajat (callExternalApi `anaf`). Jobul C2 folosește încă un apel
 * direct + breaker dedicat validare CUI; acolo rămân `enrichError` la deschiderea breaker-ului.
 * Fără dublu-info: detalii request/response aici; C2 = doar eșecuri de validare / circuit.
 */

/** Aliniat la circuit breaker `anaf` (15s); suprascrie cu `ANAF_API_TIMEOUT_MS`. */
const ANAF_TIMEOUT_MS = Number(process.env.ANAF_API_TIMEOUT_MS ?? "15000");

const log = createServiceLogger("anaf-api", { etapa: "e1" });

/** Evită cardinalitate mare în loguri la batch-uri foarte mari. */
const CUI_SAMPLE_MAX = 8;

function errorTypeName(err: unknown): string {
  if (err instanceof Error) return err.constructor?.name ?? "Error";
  return typeof err;
}

// ── ANAF v9 Batch API (single source of truth) ─────────────────────

const ANAF_V9_URL =
  process.env.ANAF_V9_URL ?? "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

export type AnafV9DateGenerale = {
  cui: number;
  data: string;
  denumire: string;
  adresa: string;
  nrRegCom: string;
  telefon: string;
  fax: string;
  codPostal: string;
  act: string;
  stare_inregistrare: string;
  data_inregistrare: string;
  cod_CAEN: string;
  iban: string;
  statusRO_e_Factura: boolean;
  organFiscalCompetent: string;
  forma_de_proprietate: string;
  forma_organizare: string;
  forma_juridica: string;
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

export type AnafV9RTVAI = {
  dataInceputTvaInc: string;
  dataSfarsitTvaInc: string;
  dataActualizareTvaInc: string;
  dataPublicareTvaInc: string;
  tipActTvaInc: string;
  statusTvaIncasare: boolean;
};

export type AnafV9StareInactiv = {
  dataInactivare: string;
  dataReactivare: string;
  dataPublicare: string;
  dataRadiere: string;
  statusInactivi: boolean;
};

export type AnafV9SplitTVA = {
  dataInceputSplitTVA: string;
  dataAnulareSplitTVA: string;
  statusSplitTVA: boolean;
};

export type AnafV9Adresa = {
  sdenumire_Strada?: string;
  snumar_Strada?: string;
  sdenumire_Localitate?: string;
  scod_Localitate?: string;
  sdenumire_Judet?: string;
  scod_Judet?: string;
  scod_JudetAuto?: string;
  stara?: string;
  sdetalii_Adresa?: string;
  scod_Postal?: string;
  ddenumire_Strada?: string;
  dnumar_Strada?: string;
  ddenumire_Localitate?: string;
  dcod_Localitate?: string;
  ddenumire_Judet?: string;
  dcod_Judet?: string;
  dcod_JudetAuto?: string;
  dtara?: string;
  ddetalii_Adresa?: string;
  dcod_Postal?: string;
};

export type AnafV9CompanyRecord = {
  date_generale: AnafV9DateGenerale;
  inregistrare_scop_Tva: AnafV9ScopTva;
  inregistrare_RTVAI: AnafV9RTVAI;
  stare_inactiv: AnafV9StareInactiv;
  inregistrare_SplitTVA: AnafV9SplitTVA;
  adresa_sediu_social: AnafV9Adresa;
  adresa_domiciliu_fiscal: AnafV9Adresa;
};

export type AnafV9BatchResult = {
  found: Map<number, AnafV9CompanyRecord>;
  notFound: number[];
};

async function callAnafV9Batch(cuis: number[]): Promise<AnafV9BatchResult> {
  const cuiCount = cuis.length;
  const cuiSample = cuis.slice(0, CUI_SAMPLE_MAX);
  const endpoint = ANAF_V9_URL;

  log.info({
    event: "anaf_request_start",
    cuiCount,
    cuiSample,
    endpoint,
  });

  const t0 = performance.now();
  const latencyMs = () => Math.round(performance.now() - t0);

  let response: Response;
  try {
    const today = new Date().toISOString().split("T")[0];
    const payload = cuis.map((cui) => ({ cui, data: today }));
    response = await fetch(ANAF_V9_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(ANAF_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "anaf_request_error",
      latencyMs: latencyMs(),
      httpStatus: undefined,
      errorMessage: msg,
      errorType: errorTypeName(err),
      cuiCount,
      err,
    });
    throw new Error(`ANAF API [network] batch cuiCount=${cuiCount}: ${msg}`, { cause: err });
  }

  const statusCode = response.status;

  if (!response.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = (await response.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    const msg = bodySnippet || `HTTP ${statusCode}`;
    log.error({
      event: "anaf_request_error",
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      errorMessage: msg,
      errorType: "HttpError",
      cuiCount,
    });
    throw new Error(`ANAF API [${statusCode}] batch cuiCount=${cuiCount}: ${msg}`, {
      cause: new Error(`ANAF HTTP ${statusCode}: ${msg}`),
    });
  }

  let data: {
    cod: number;
    message: string;
    found: AnafV9CompanyRecord[];
    notFound: number[];
  };
  try {
    data = (await response.json()) as typeof data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "anaf_request_error",
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      errorMessage: msg,
      errorType: errorTypeName(err),
      cuiCount,
      err,
    });
    throw new Error(`ANAF API [${statusCode}] batch cuiCount=${cuiCount}: invalid JSON`, {
      cause: err,
    });
  }

  const found = new Map<number, AnafV9CompanyRecord>();
  if (Array.isArray(data.found)) {
    for (const record of data.found) {
      if (record.date_generale?.cui) {
        found.set(Number(record.date_generale.cui), record);
      }
    }
  }
  const notFound = Array.isArray(data.notFound) ? data.notFound : [];

  log.info({
    event: "anaf_request_success",
    latencyMs: latencyMs(),
    statusCode,
    cuiCount,
    foundCount: found.size,
    notFoundCount: notFound.length,
  });

  return {
    found,
    notFound,
  };
}

export async function fetchAnafBatchByCuis(cuis: string[]): Promise<AnafV9BatchResult> {
  const numericCuis = cuis.map((c) => Number.parseInt(c, 10)).filter((n) => !Number.isNaN(n));
  if (numericCuis.length === 0) return { found: new Map(), notFound: [] };
  return callExternalApi("anaf", () => callAnafV9Batch(numericCuis));
}

export async function fetchAnafSingleByCui(cleanCui: string): Promise<AnafV9CompanyRecord | null> {
  const result = await fetchAnafBatchByCuis([cleanCui]);
  const cuiNum = Number.parseInt(cleanCui, 10);
  return result.found.get(cuiNum) ?? null;
}
