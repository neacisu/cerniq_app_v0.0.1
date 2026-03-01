import { createCircuitBreaker } from "@cerniq/worker-shared";

const ANAF_API_URL =
  process.env.ANAF_API_URL ?? "https://webservicesp.anaf.ro/AsynchProdFurniz/api/v10/ws/tva";
const ANAF_TIMEOUT_MS = Number(process.env.ANAF_API_TIMEOUT_MS ?? "25000");

export type AnafRecord = Record<string, unknown>;

async function callAnaf(cleanCui: string): Promise<AnafRecord | null> {
  const payload = [
    { cui: Number.parseInt(cleanCui, 10), data: new Date().toISOString().split("T")[0] },
  ];
  const response = await fetch(ANAF_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(ANAF_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`ANAF API error: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data[0] as AnafRecord;
  }
  if (
    data &&
    typeof data === "object" &&
    "found" in data &&
    Array.isArray((data as { found: unknown[] }).found) &&
    (data as { found: unknown[] }).found.length > 0
  ) {
    return (data as { found: AnafRecord[] }).found[0];
  }

  return null;
}

const anafBreaker = createCircuitBreaker(
  async (...args: unknown[]) => callAnaf(String(args[0] ?? "")),
  "anaf-api-client",
  {
    timeout: ANAF_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
);

export async function fetchAnafRecordByCui(cleanCui: string): Promise<AnafRecord | null> {
  return anafBreaker.fire(cleanCui);
}
