import { createHash } from "node:crypto";
import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";

const ZEROBOUNCE_API_URL = process.env.ZEROBOUNCE_API_URL ?? "https://api.zerobounce.net/v2";
const ZEROBOUNCE_API_KEY = process.env.ZEROBOUNCE_API_KEY ?? "";
const ZEROBOUNCE_TIMEOUT_MS = Number(process.env.ZEROBOUNCE_API_TIMEOUT_MS ?? "20000");

const log = createServiceLogger("zerobounce-api", { etapa: "e1" });

function emailHashPrefix(email: string): string {
  return createHash("sha256").update(email, "utf8").digest("hex").slice(0, 12);
}

function errorTypeName(err: unknown): string {
  if (err instanceof Error) return err.constructor?.name ?? "Error";
  return typeof err;
}

export type ZeroBounceValidationResult = {
  status?: string;
  sub_status?: string;
  free_email?: boolean;
  did_you_mean?: string;
  mx_found?: string;
  smtp_provider?: string;
};

async function zerobounceValidateInternal(
  email: string,
): Promise<ZeroBounceValidationResult | null> {
  const emailHash = emailHashPrefix(email);

  if (!ZEROBOUNCE_API_KEY) {
    log.error({
      event: "zerobounce_request_error",
      reason: "missing_api_key",
      emailHashPrefix: emailHash,
    });
    throw new Error("Missing ZEROBOUNCE_API_KEY");
  }

  log.info({
    event: "zerobounce_request_start",
    emailHashPrefix: emailHash,
    endpointPath: "/validate",
  });

  const t0 = performance.now();
  const latencyMs = () => Math.round(performance.now() - t0);

  const url = new URL(`${ZEROBOUNCE_API_URL}/validate`);
  url.searchParams.set("api_key", ZEROBOUNCE_API_KEY);
  url.searchParams.set("email", email);
  url.searchParams.set("ip_address", "");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(ZEROBOUNCE_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "zerobounce_request_error",
      phase: "network",
      latencyMs: latencyMs(),
      emailHashPrefix: emailHash,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`ZeroBounce API [network]: ${msg}`, { cause: err });
  }

  const statusCode = response.status;

  if (statusCode === 404) {
    log.debug({
      event: "zerobounce_not_found",
      latencyMs: latencyMs(),
      statusCode,
      emailHashPrefix: emailHash,
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
      event: "zerobounce_http_error" as const,
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      emailHashPrefix: emailHash,
      errorMessage: msg,
    };
    if (statusCode >= 500) {
      log.error(payload);
    } else {
      log.warn(payload);
    }
    throw new Error(`ZeroBounce API [${statusCode}]: ${msg}`, {
      cause: new Error(`ZeroBounce HTTP ${statusCode}: ${msg}`),
    });
  }

  try {
    const json = (await response.json()) as ZeroBounceValidationResult;
    log.info({
      event: "zerobounce_request_success",
      latencyMs: latencyMs(),
      statusCode,
      emailHashPrefix: emailHash,
      validationStatus: json.status,
      validationSubStatus: json.sub_status,
    });
    return json;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "zerobounce_request_error",
      phase: "json_parse",
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      emailHashPrefix: emailHash,
      errorMessage: msg,
      errorType: errorTypeName(err),
      err,
    });
    throw new Error(`ZeroBounce API [${statusCode}]: invalid JSON`, { cause: err });
  }
}

export async function zerobounceValidate(
  email: string,
): Promise<ZeroBounceValidationResult | null> {
  return callExternalApi("zerobounce", () => zerobounceValidateInternal(email));
}
