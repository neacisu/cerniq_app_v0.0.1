import { createHash } from "node:crypto";
import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "@cerniq/worker-shared";

const HUNTER_API_URL = process.env.HUNTER_API_URL ?? "https://api.hunter.io/v2";
const HUNTER_API_KEY = process.env.HUNTER_API_KEY ?? "";
const HUNTER_TIMEOUT_MS = Number(process.env.HUNTER_API_TIMEOUT_MS ?? "20000");

const log = createServiceLogger("hunter-api", { etapa: "e1" });

function emailHashPrefix(email: string): string {
  return createHash("sha256").update(email, "utf8").digest("hex").slice(0, 12);
}

function errorTypeName(err: unknown): string {
  if (err instanceof Error) return err.constructor?.name ?? "Error";
  return typeof err;
}

function cardinalityFields(params: Record<string, string>): Record<string, string> {
  if (params.domain !== undefined) return { domain: params.domain };
  if (params.email !== undefined) return { emailHashPrefix: emailHashPrefix(params.email) };
  return {};
}

async function hunterGet(
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const endpointPath = path;
  const card = cardinalityFields(params);

  if (!HUNTER_API_KEY) {
    log.error({
      event: "hunter_request_error",
      reason: "missing_api_key",
      endpointPath,
      ...card,
    });
    throw new Error("Missing HUNTER_API_KEY");
  }

  log.info({
    event: "hunter_request_start",
    endpointPath,
    ...card,
  });

  const t0 = performance.now();
  const latencyMs = () => Math.round(performance.now() - t0);

  let response: Response;
  try {
    const url = new URL(`${HUNTER_API_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("api_key", HUNTER_API_KEY);

    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(HUNTER_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "hunter_request_error",
      phase: "network",
      latencyMs: latencyMs(),
      endpointPath,
      errorMessage: msg,
      errorType: errorTypeName(err),
      ...card,
      err,
    });
    throw new Error(`Hunter API [network] ${endpointPath}: ${msg}`, { cause: err });
  }

  const statusCode = response.status;

  if (statusCode === 404) {
    log.debug({
      event: "hunter_not_found",
      latencyMs: latencyMs(),
      statusCode,
      endpointPath,
      ...card,
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
      event: "hunter_http_error" as const,
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      endpointPath,
      errorMessage: msg,
      ...card,
    };
    if (statusCode >= 500) {
      log.error(payload);
    } else {
      log.warn(payload);
    }
    throw new Error(`Hunter API [${statusCode}] ${endpointPath}: ${msg}`, {
      cause: new Error(`Hunter HTTP ${statusCode}: ${msg}`),
    });
  }

  try {
    const json = (await response.json()) as Record<string, unknown>;
    log.info({
      event: "hunter_request_success",
      latencyMs: latencyMs(),
      statusCode,
      endpointPath,
      ...card,
    });
    return json;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({
      event: "hunter_request_error",
      phase: "json_parse",
      latencyMs: latencyMs(),
      httpStatus: statusCode,
      endpointPath,
      errorMessage: msg,
      errorType: errorTypeName(err),
      ...card,
      err,
    });
    throw new Error(`Hunter API [${statusCode}] ${endpointPath}: invalid JSON`, { cause: err });
  }
}

export type HunterEmailRecord = {
  value?: string;
  confidence?: number;
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  verification?: { status?: string };
  linkedin?: string;
};

export type HunterDomainSearchResult = {
  domain: string;
  emails: HunterEmailRecord[];
};

export type HunterEmailVerifyResult = {
  email: string;
  status: string;
  score: number;
  result: string;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mx_records: boolean;
  smtp_server: boolean;
  smtp_check: boolean;
  accept_all: boolean;
  block: boolean;
  role: boolean;
  sources: Array<{ domain: string; uri: string; extracted_on: string }>;
};

export async function hunterEmailVerify(email: string): Promise<HunterEmailVerifyResult | null> {
  const result = await callExternalApi("hunter", () => hunterGet("/email-verifier", { email }));
  if (!result || typeof result !== "object") return null;

  const data = (result.data ?? null) as Record<string, unknown> | null;
  if (!data) return null;

  return {
    email: typeof data.email === "string" ? data.email : email,
    status: typeof data.status === "string" ? data.status : "unknown",
    score: Number(data.score ?? 0),
    result: typeof data.result === "string" ? data.result : "unknown",
    regexp: Boolean(data.regexp),
    gibberish: Boolean(data.gibberish),
    disposable: Boolean(data.disposable),
    webmail: Boolean(data.webmail),
    mx_records: Boolean(data.mx_records),
    smtp_server: Boolean(data.smtp_server),
    smtp_check: Boolean(data.smtp_check),
    accept_all: Boolean(data.accept_all),
    block: Boolean(data.block),
    role: Boolean(data.role),
    sources: Array.isArray(data.sources)
      ? (data.sources as Array<{ domain: string; uri: string; extracted_on: string }>)
      : [],
  };
}

export async function hunterDomainSearch(domain: string): Promise<HunterDomainSearchResult | null> {
  const result = await callExternalApi("hunter", () => hunterGet("/domain-search", { domain }));
  if (!result || typeof result !== "object") return null;

  const data = (result.data ?? null) as Record<string, unknown> | null;
  if (!data) return null;
  const emails = Array.isArray(data.emails) ? (data.emails as HunterEmailRecord[]) : [];
  return {
    domain: typeof data.domain === "string" ? data.domain : domain,
    emails,
  };
}
