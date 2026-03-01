import { createCircuitBreaker } from "@cerniq/worker-shared";

const TERMENE_API_URL = process.env.TERMENE_API_URL ?? "https://api.termene.ro/v2";
const TERMENE_API_KEY = process.env.TERMENE_API_KEY ?? "";
const TERMENE_TIMEOUT_MS = Number(process.env.TERMENE_API_TIMEOUT_MS ?? "20000");

async function callTermene(path: string): Promise<Record<string, unknown> | null> {
  if (!TERMENE_API_KEY) {
    throw new Error("Missing TERMENE_API_KEY");
  }
  const response = await fetch(`${TERMENE_API_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${TERMENE_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(TERMENE_TIMEOUT_MS),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Termene API error: ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

const termeneBreaker = createCircuitBreaker(
  async (...args: unknown[]) => callTermene(String(args[0] ?? "")),
  "termene-api-client",
  {
    timeout: TERMENE_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
);

export async function getTermeneBalance(cui: string): Promise<Record<string, unknown> | null> {
  return termeneBreaker.fire(`/firme/${cui}/bilant`);
}

export async function getTermeneRisk(cui: string): Promise<Record<string, unknown> | null> {
  return termeneBreaker.fire(`/firme/${cui}/scor-risc`);
}

export async function getTermeneDosare(cui: string): Promise<Record<string, unknown> | null> {
  return termeneBreaker.fire(`/firme/${cui}/dosare`);
}

export async function getTermeneActionari(cui: string): Promise<Record<string, unknown> | null> {
  return termeneBreaker.fire(`/firme/${cui}/actionari`);
}
