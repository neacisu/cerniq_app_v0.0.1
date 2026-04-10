/**
 * Raport erori browser admin → POST /api/v1/errors/client (paritate cu apps/web).
 */
import { apiBase, getAdminSessionCorrelationId as readAdminSessionCorrelationId } from "../api.js";

export { getAdminSessionCorrelationId } from "../api.js";

/** Fingerprint stabil pentru `Idempotency-Key` — aliniat la `apps/web` (FNV-1a pe code points). */
export function buildAdminClientErrorIdempotencyKey(input: {
  message: string;
  stack?: string;
  source?: string;
}): string {
  const part = (s: string | undefined, n: number) => (s ?? "").slice(0, n);
  const raw = `${part(input.message, 4000)}\n${part(input.stack, 400)}\n${part(input.source, 400)}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; ) {
    const cp = raw.codePointAt(i);
    if (cp === undefined) {
      break;
    }
    h ^= cp;
    h = Math.imul(h, 16777619);
    i += cp > 0xffff ? 2 : 1;
  }
  return `xfe:${(h >>> 0).toString(16)}`;
}

export type ReportAdminClientErrorInput = {
  readonly message: string;
  readonly name?: string;
  readonly stack?: string;
  readonly source?: string;
  readonly url?: string;
};

export async function reportAdminClientError(input: ReportAdminClientErrorInput): Promise<void> {
  if (globalThis.window === undefined) return;
  const base = apiBase.replace(/\/$/, "");
  const path = "/api/v1/errors/client";
  const url = `${base}${path}`;
  const cid = readAdminSessionCorrelationId();
  const idempotencyKey = buildAdminClientErrorIdempotencyKey(input);
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": idempotencyKey,
        ...(cid ? { "x-correlation-id": cid } : {}),
      },
      body: JSON.stringify({
        message: input.message.slice(0, 4000),
        name: input.name ?? "WebAdminError",
        stack: input.stack?.slice(0, 12000),
        source: input.source,
        url: input.url ?? globalThis.window.location?.href,
        userAgent: navigator.userAgent,
        clientTimestamp: new Date().toISOString(),
      }),
    });
    if (res.status === 429) return;
  } catch {
    /* offline / CORS */
  }
}
