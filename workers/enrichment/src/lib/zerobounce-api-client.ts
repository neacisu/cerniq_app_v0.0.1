import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";

const ZEROBOUNCE_API_URL = process.env.ZEROBOUNCE_API_URL ?? "https://api.zerobounce.net/v2";
const ZEROBOUNCE_API_KEY = process.env.ZEROBOUNCE_API_KEY ?? "";
const ZEROBOUNCE_TIMEOUT_MS = Number(process.env.ZEROBOUNCE_API_TIMEOUT_MS ?? "20000");

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
  if (!ZEROBOUNCE_API_KEY) {
    throw new Error("Missing ZEROBOUNCE_API_KEY");
  }
  const url = new URL(`${ZEROBOUNCE_API_URL}/validate`);
  url.searchParams.set("api_key", ZEROBOUNCE_API_KEY);
  url.searchParams.set("email", email);
  url.searchParams.set("ip_address", "");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(ZEROBOUNCE_TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`ZeroBounce API error: ${response.status}`);
  }

  return (await response.json()) as ZeroBounceValidationResult;
}

const zerobounceBreaker = createCircuitBreaker(
  zerobounceValidateInternal,
  "zerobounce-api-client",
  {
    timeout: ZEROBOUNCE_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
);

export async function zerobounceValidate(
  email: string,
): Promise<ZeroBounceValidationResult | null> {
  return withExternalApiMetrics("zerobounce", () => zerobounceBreaker.fire(email));
}
