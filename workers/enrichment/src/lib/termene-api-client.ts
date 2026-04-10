import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";

const TERMENE_API_URL = process.env.TERMENE_API_URL ?? "https://api.termene.ro/v2";
const TERMENE_API_KEY = process.env.TERMENE_API_KEY ?? "";
const TERMENE_TIMEOUT_MS = Number(process.env.TERMENE_API_TIMEOUT_MS ?? "20000");

const log = createServiceLogger("termene-api", { etapa: "e1" });

function termeneHost(): string {
  try {
    return new URL(TERMENE_API_URL).host;
  } catch {
    return "invalid-termene-url";
  }
}

function errorTypeName(err: unknown): string {
  if (err instanceof Error) return err.constructor?.name ?? "Error";
  return typeof err;
}

/**
 * `dataType` = segmentul Termene după CUI (bilant, scor-risc, dosare, actionari) — mapare1:1 la API.
 */
async function callTermene(
  path: string,
  cui: string,
  dataType: string,
): Promise<Record<string, unknown> | null> {
  const host = termeneHost();

  if (!TERMENE_API_KEY) {
    log.error({
      event: "termene_request_error",
      reason: "missing_api_key",
      cui,
      dataType,
      host,
    });
    throw new Error("Missing TERMENE_API_KEY");
  }

  log.info({
    event: "termene_request_start",
    cui,
    dataType,
    host,
    endpointPath: path,
  });

  const t0 = performance.now();
  const latencyMs = () => Math.round(performance.now() - t0);

  let response: Response;
  try {
    response = await fetch(`${TERMENE_API_URL}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TERMENE_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(TERMENE_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "termene_request_error",
      phase: "network",
      latencyMs: latencyMs(),
      cui,
      dataType,
      host,
      endpointPath: path,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`Termene API [network] ${dataType} cui=${cui}: ${msg}`, { cause: err });
  }

  const statusCode = response.status;

  if (statusCode === 404) {
    log.debug({
      event: "termene_not_found",
      latencyMs: latencyMs(),
      statusCode,
      cui,
      dataType,
      host,
      endpointPath: path,
    });
    return null;
  }

  if (!response.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = (await response.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    const msg = bodySnippet || `HTTP ${statusCode}`;
    const payload = {
      event: "termene_http_error" as const,
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      cui,
      dataType,
      host,
      endpointPath: path,
      errorMessage: msg,
    };
    if (statusCode >= 500) {
      log.error(payload);
    } else {
      log.warn(payload);
    }
    throw new Error(`Termene API [${statusCode}] ${dataType} cui=${cui}: ${msg}`, {
      cause: new Error(`Termene HTTP ${statusCode}: ${msg}`),
    });
  }

  try {
    const json = (await response.json()) as Record<string, unknown>;
    log.info({
      event: "termene_request_success",
      latencyMs: latencyMs(),
      statusCode,
      cui,
      dataType,
      host,
      endpointPath: path,
    });
    return json;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "termene_request_error",
      phase: "json_parse",
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      cui,
      dataType,
      host,
      endpointPath: path,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`Termene API [${statusCode}] ${dataType} cui=${cui}: invalid JSON`, {
      cause: err,
    });
  }
}

export async function getTermeneBalance(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("termene", () => callTermene(`/firme/${cui}/bilant`, cui, "bilant"));
}

export async function getTermeneRisk(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("termene", () => callTermene(`/firme/${cui}/scor-risc`, cui, "scor-risc"));
}

export async function getTermeneDosare(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("termene", () => callTermene(`/firme/${cui}/dosare`, cui, "dosare"));
}

export async function getTermeneActionari(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("termene", () => callTermene(`/firme/${cui}/actionari`, cui, "actionari"));
}
