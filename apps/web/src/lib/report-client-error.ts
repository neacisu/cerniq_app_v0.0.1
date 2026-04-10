/**
 * Raportare erori din browser către POST /api/v1/errors/client (fără buclă la429/offline).
 */
import { getApiBase } from "./api-url.js";

const SESSION_CORR_KEY = "cerniq_x_correlation_id";

/** ID sesiune pentru header `x-correlation-id` (poate fi non-UUID; UUID-ul DB e separat în API). */
export function getSessionCorrelationId(): string {
  if (globalThis.window === undefined) return "";
  try {
    let id = sessionStorage.getItem(SESSION_CORR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_CORR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export type ReportClientErrorInput = {
  readonly message: string;
  readonly name?: string;
  readonly stack?: string;
  /** componentStack React */
  readonly source?: string;
  readonly url?: string;
};

/** Fingerprint stabil (fără async) pentru `Idempotency-Key` — același raport repetat în TTL e deduplicat server-side. */
export function buildClientErrorIdempotencyKey(input: ReportClientErrorInput): string {
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

export async function reportClientError(input: ReportClientErrorInput): Promise<void> {
  if (globalThis.window === undefined) return;
  const base = getApiBase();
  const path = "/api/v1/errors/client";
  const url = `${base.replace(/\/$/, "")}${path}`;
  const cid = getSessionCorrelationId();
  const idempotencyKey = buildClientErrorIdempotencyKey(input);
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
        name: input.name,
        stack: input.stack?.slice(0, 12000),
        source: input.source,
        url: input.url ?? globalThis.window.location?.href,
        userAgent: navigator.userAgent,
        clientTimestamp: new Date().toISOString(),
      }),
    });
    if (res.status === 429) return;
  } catch {
    /* offline / CORS / DNS — fără retry infinit */
  }
}
