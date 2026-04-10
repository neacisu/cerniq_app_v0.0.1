import { createHash } from "node:crypto";

const TRANSIENT_PATTERNS = [
  "econnrefused",
  "econnreset",
  "etimedout",
  "enotfound",
  "serialization",
  "deadlock",
  "too many connections",
  "connection terminated",
  "could not obtain lock",
];

/** PostgreSQL — transient / retryable classes (subset). */
const TRANSIENT_PG_CODES = new Set([
  "40001", // serialization_failure
  "40P01", // deadlock_detected
  "08000", // connection_exception
  "08003", // connection_does_not_exist
  "08006", // connection_failure
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
]);

const INFRA_PATTERNS = [
  "econnrefused",
  "enotfound",
  "getaddrinfo",
  "socket hang up",
  "network error",
  "service unavailable",
  "bad gateway",
  "gateway timeout",
];

export type ErrorType = "transient" | "validation" | "infrastructure" | "permanent";

export interface ErrorEnrichment {
  fingerprint: string;
  errorType: ErrorType;
  causeChain: Array<{ name: string; message: string; code?: string }>;
  enrichedMessage: string;
  errorCode?: string;
}

function errorName(err: unknown): string {
  if (err instanceof Error) return err.constructor?.name ?? "Error";
  return typeof err;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function firstStackLine(stack: string | undefined): string {
  if (!stack) return "";
  const lines = stack
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[1] ?? lines[0] ?? "";
}

function collectPgCode(err: unknown): string | undefined {
  let cur: unknown = err;
  const seen = new Set<unknown>();
  while (cur instanceof Error && !seen.has(cur)) {
    seen.add(cur);
    const code = (cur as { code?: string }).code;
    if (typeof code === "string" && code.length > 0) return code;
    cur = cur.cause;
  }
  return undefined;
}

function buildCauseChain(err: unknown): ErrorEnrichment["causeChain"] {
  const chain: ErrorEnrichment["causeChain"] = [];
  const seen = new Set<unknown>();
  let cur: unknown = err;
  let depth = 0;
  const maxDepth = 32;
  while (cur !== undefined && cur !== null && depth < maxDepth) {
    if (seen.has(cur)) {
      chain.push({ name: "CircularCause", message: "(cycle)" });
      break;
    }
    seen.add(cur);
    depth++;
    if (cur instanceof Error) {
      const code = (cur as { code?: string }).code;
      chain.push({
        name: cur.constructor?.name ?? "Error",
        message: cur.message,
        ...(typeof code === "string" ? { code } : {}),
      });
      cur = cur.cause;
    } else {
      chain.push({ name: typeof cur, message: String(cur) });
      break;
    }
  }
  return chain;
}

function canonicalFingerprintInput(err: unknown): string {
  const name = errorName(err);
  const message = errorMessage(err);
  const stackLine = err instanceof Error ? firstStackLine(err.stack) : "";
  const code = collectPgCode(err) ?? "";
  return `${name}\0${message}\0${stackLine}\0${code}`;
}

export function fingerprintError(err: unknown): string {
  const h = createHash("sha256");
  h.update(canonicalFingerprintInput(err), "utf8");
  return h.digest("hex");
}

function isZodLike(err: unknown): boolean {
  return err instanceof Error && err.name === "ZodError";
}

export function isTransientError(error: unknown): boolean {
  const code = collectPgCode(error);
  if (code && TRANSIENT_PG_CODES.has(code)) return true;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return TRANSIENT_PATTERNS.some((p) => lower.includes(p));
}

function classifyErrorType(err: unknown): ErrorType {
  if (isZodLike(err)) return "validation";
  if (isTransientError(err)) return "transient";
  const lower = errorMessage(err).toLowerCase();
  if (INFRA_PATTERNS.some((p) => lower.includes(p))) return "infrastructure";
  const code = collectPgCode(err);
  if (code && /^08|^57|^53/.test(code)) return "infrastructure";
  return "permanent";
}

export function enrichError(error: unknown, context?: Record<string, unknown>): ErrorEnrichment {
  const causeChain = buildCauseChain(error);
  const fingerprint = fingerprintError(error);
  const errorType = classifyErrorType(error);
  let enrichedMessage =
    causeChain.length > 0
      ? causeChain.map((c) => `${c.name}: ${c.message}`).join(" | ")
      : errorMessage(error);
  if (context && Object.keys(context).length > 0) {
    enrichedMessage += ` | ctxKeys:${Object.keys(context)
      .toSorted((a, b) => a.localeCompare(b, "en"))
      .join(",")}`;
  }
  const errorCode = collectPgCode(error);
  return {
    fingerprint,
    errorType,
    causeChain,
    enrichedMessage,
    ...(errorCode ? { errorCode } : {}),
  };
}
