import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";

const ONRC_API_URL =
  process.env.ONRC_API_URL ?? process.env.ONRC_PORTAL_URL ?? "https://portal.onrc.ro/api";
const ONRC_API_KEY = process.env.ONRC_API_KEY ?? "";
const ONRC_TIMEOUT_MS = Number(process.env.ONRC_API_TIMEOUT_MS ?? "20000");

const log = createServiceLogger("onrc-api", { etapa: "e1" });

function onrcHost(): string {
  try {
    return new URL(ONRC_API_URL).host;
  } catch {
    return "invalid-onrc-url";
  }
}

function errorTypeName(err: unknown): string {
  if (err instanceof Error) return err.constructor?.name ?? "Error";
  return typeof err;
}

/** Ultimul segment din path (ex. `administratori`) sau `company` pentru rădăcină `/companies/:cui`. */
function endpointLabel(path: string, cui: string): string {
  const suffix = path.replace(`/companies/${cui}`, "").replace(/^\//, "");
  return suffix.length > 0 ? suffix : "company";
}

async function onrcGet(path: string, cui: string): Promise<Record<string, unknown> | null> {
  const host = onrcHost();
  const endpoint = endpointLabel(path, cui);

  if (!ONRC_API_KEY) {
    log.error({
      event: "onrc_request_error",
      reason: "missing_api_key",
      cui,
      host,
      endpointPath: path,
      endpoint,
    });
    throw new Error("Missing ONRC_API_KEY");
  }

  log.info({
    event: "onrc_request_start",
    cui,
    host,
    endpointPath: path,
    endpoint,
  });

  const t0 = performance.now();
  const latencyMs = () => Math.round(performance.now() - t0);

  let response: Response;
  try {
    response = await fetch(`${ONRC_API_URL}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ONRC_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(ONRC_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "onrc_request_error",
      phase: "network",
      latencyMs: latencyMs(),
      cui,
      host,
      endpointPath: path,
      endpoint,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`ONRC API [network] ${endpoint} cui=${cui}: ${msg}`, { cause: err });
  }

  const statusCode = response.status;

  if (statusCode === 404) {
    log.debug({
      event: "onrc_not_found",
      latencyMs: latencyMs(),
      statusCode,
      cui,
      host,
      endpointPath: path,
      endpoint,
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
      event: "onrc_http_error" as const,
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      cui,
      host,
      endpointPath: path,
      endpoint,
      errorMessage: msg,
    };
    if (statusCode >= 500) {
      log.error(payload);
    } else {
      log.warn(payload);
    }
    throw new Error(`ONRC API [${statusCode}] ${endpoint} cui=${cui}: ${msg}`, {
      cause: new Error(`ONRC HTTP ${statusCode}: ${msg}`),
    });
  }

  try {
    const json = (await response.json()) as Record<string, unknown>;
    log.info({
      event: "onrc_request_success",
      latencyMs: latencyMs(),
      statusCode,
      cui,
      host,
      endpointPath: path,
      endpoint,
    });
    return json;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "onrc_request_error",
      phase: "json_parse",
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      cui,
      host,
      endpointPath: path,
      endpoint,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`ONRC API [${statusCode}] ${endpoint} cui=${cui}: invalid JSON`, {
      cause: err,
    });
  }
}

export async function getOnrcData(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("onrc", () => onrcGet(`/companies/${cui}`, cui));
}

export async function getOnrcAdministratori(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("onrc", () => onrcGet(`/companies/${cui}/administratori`, cui));
}

export async function getOnrcSedii(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("onrc", () => onrcGet(`/companies/${cui}/sedii`, cui));
}

export async function getOnrcHistory(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("onrc", () => onrcGet(`/companies/${cui}/history`, cui));
}
