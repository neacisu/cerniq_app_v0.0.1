import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";

const HLR_API_URL = process.env.HLR_API_URL ?? "";
const HLR_API_KEY = process.env.HLR_API_KEY ?? "";
const HLR_TIMEOUT_MS = Number(process.env.HLR_API_TIMEOUT_MS ?? "20000");

const log = createServiceLogger("hlr-api", { etapa: "e1" });

function hlrHost(): string {
  if (!HLR_API_URL) return "missing-hlr-url";
  try {
    return new URL(HLR_API_URL).host;
  } catch {
    return "invalid-hlr-url";
  }
}

function phoneLast4(phoneE164: string): string {
  const digits = phoneE164.replaceAll(/\D/g, "");
  return digits.length > 0 ? digits.slice(-4) : "****";
}

function errorTypeName(err: unknown): string {
  if (err instanceof Error) return err.constructor?.name ?? "Error";
  return typeof err;
}

export type HlrLookupResult = {
  status?: string;
  reachable?: boolean;
  carrier?: string;
  carrier_type?: string;
  country_code?: string;
  mcc_mnc?: string;
  ported?: boolean;
};

async function hlrLookupInternal(phoneE164: string): Promise<HlrLookupResult | null> {
  const host = hlrHost();
  const last4 = phoneLast4(phoneE164);

  if (!HLR_API_URL || !HLR_API_KEY) {
    log.error({
      event: "hlr_request_error",
      reason: "missing_url_or_key",
      hlrHost: host,
      phoneLast4: last4,
    });
    throw new Error("Missing HLR_API_URL or HLR_API_KEY");
  }

  log.info({
    event: "hlr_request_start",
    hlrHost: host,
    phoneLast4: last4,
  });

  const t0 = performance.now();
  const latencyMs = () => Math.round(performance.now() - t0);

  const url = new URL(HLR_API_URL);
  url.searchParams.set("api_key", HLR_API_KEY);
  url.searchParams.set("number", phoneE164);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(HLR_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "hlr_request_error",
      phase: "network",
      latencyMs: latencyMs(),
      hlrHost: host,
      phoneLast4: last4,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`HLR API [network]: ${msg}`, { cause: err });
  }

  const statusCode = response.status;

  if (statusCode === 404) {
    log.debug({
      event: "hlr_not_found",
      latencyMs: latencyMs(),
      statusCode,
      hlrHost: host,
      phoneLast4: last4,
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
      event: "hlr_http_error" as const,
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      hlrHost: host,
      phoneLast4: last4,
      errorMessage: msg,
    };
    if (statusCode >= 500) {
      log.error(payload);
    } else {
      log.warn(payload);
    }
    throw new Error(`HLR API [${statusCode}]: ${msg}`, {
      cause: new Error(`HLR HTTP ${statusCode}: ${msg}`),
    });
  }

  try {
    const json = (await response.json()) as HlrLookupResult;
    log.info({
      event: "hlr_request_success",
      latencyMs: latencyMs(),
      statusCode,
      hlrHost: host,
      phoneLast4: last4,
      hlrStatus: json.status,
      reachable: json.reachable,
      carrier: json.carrier,
    });
    return json;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "hlr_request_error",
      phase: "json_parse",
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      hlrHost: host,
      phoneLast4: last4,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`HLR API [${statusCode}]: invalid JSON`, { cause: err });
  }
}

export async function hlrLookup(phoneE164: string): Promise<HlrLookupResult | null> {
  return callExternalApi("hlr", () => hlrLookupInternal(phoneE164));
}
