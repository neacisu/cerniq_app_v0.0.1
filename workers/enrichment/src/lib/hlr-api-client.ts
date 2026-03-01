import { createCircuitBreaker } from "@cerniq/worker-shared";

const HLR_API_URL = process.env.HLR_API_URL ?? "";
const HLR_API_KEY = process.env.HLR_API_KEY ?? "";
const HLR_TIMEOUT_MS = Number(process.env.HLR_API_TIMEOUT_MS ?? "20000");

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
  if (!HLR_API_URL || !HLR_API_KEY) {
    throw new Error("Missing HLR_API_URL or HLR_API_KEY");
  }

  const url = new URL(HLR_API_URL);
  url.searchParams.set("api_key", HLR_API_KEY);
  url.searchParams.set("number", phoneE164);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(HLR_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`HLR API error: ${response.status}`);
  }
  return (await response.json()) as HlrLookupResult;
}

const hlrBreaker = createCircuitBreaker(
  async (...args: unknown[]) => hlrLookupInternal(String(args[0] ?? "")),
  "hlr-api-client",
  {
    timeout: HLR_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
);

export async function hlrLookup(phoneE164: string): Promise<HlrLookupResult | null> {
  return hlrBreaker.fire(phoneE164);
}
