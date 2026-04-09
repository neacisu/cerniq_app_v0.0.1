import { callExternalApi } from "@cerniq/worker-shared";

const ONRC_API_URL =
  process.env.ONRC_API_URL ?? process.env.ONRC_PORTAL_URL ?? "https://portal.onrc.ro/api";
const ONRC_API_KEY = process.env.ONRC_API_KEY ?? "";
const ONRC_TIMEOUT_MS = Number(process.env.ONRC_API_TIMEOUT_MS ?? "20000");

async function onrcGet(path: string): Promise<Record<string, unknown> | null> {
  if (!ONRC_API_KEY) {
    throw new Error("Missing ONRC_API_KEY");
  }
  const response = await fetch(`${ONRC_API_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ONRC_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(ONRC_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`ONRC API error: ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

export async function getOnrcData(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("onrc", () => onrcGet(`/companies/${cui}`));
}

export async function getOnrcAdministratori(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("onrc", () => onrcGet(`/companies/${cui}/administratori`));
}

export async function getOnrcSedii(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("onrc", () => onrcGet(`/companies/${cui}/sedii`));
}

export async function getOnrcHistory(cui: string): Promise<Record<string, unknown> | null> {
  return callExternalApi("onrc", () => onrcGet(`/companies/${cui}/history`));
}
