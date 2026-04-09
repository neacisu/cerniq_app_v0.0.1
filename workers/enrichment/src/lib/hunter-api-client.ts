import { callExternalApi } from "@cerniq/worker-shared";

const HUNTER_API_URL = process.env.HUNTER_API_URL ?? "https://api.hunter.io/v2";
const HUNTER_API_KEY = process.env.HUNTER_API_KEY ?? "";
const HUNTER_TIMEOUT_MS = Number(process.env.HUNTER_API_TIMEOUT_MS ?? "20000");

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

async function hunterGet(
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  if (!HUNTER_API_KEY) {
    throw new Error("Missing HUNTER_API_KEY");
  }

  const url = new URL(`${HUNTER_API_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", HUNTER_API_KEY);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(HUNTER_TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Hunter API error: ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

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
