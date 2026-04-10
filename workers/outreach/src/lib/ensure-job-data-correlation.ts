import { randomUUID } from "node:crypto";

/** Propagă `correlationId` în payload-uri BullMQ pentru trasabilitate observabilitate. */
export function ensureJobDataCorrelationId(data: unknown): object {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (typeof o.correlationId === "string" && o.correlationId.trim().length > 0) {
      return o as object;
    }
    return { ...o, correlationId: randomUUID() };
  }
  return { payload: data, correlationId: randomUUID() };
}
