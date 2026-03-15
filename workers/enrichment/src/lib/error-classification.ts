import { UnrecoverableError } from "bullmq";

const TRANSIENT_PATTERNS = [
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "serialization",
  "deadlock",
  "too many connections",
  "connection terminated",
  "could not obtain lock",
];

export function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_PATTERNS.some((p) => message.toLowerCase().includes(p.toLowerCase()));
}

export function classifyAndRethrow(error: unknown): never {
  if (isTransientError(error)) {
    throw error;
  }
  const message = error instanceof Error ? error.message : String(error);
  throw new UnrecoverableError(message);
}
