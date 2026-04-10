import { randomUUID } from "node:crypto";

export type JobTracingAugment = {
  /** Job BullMQ părinte care a produs acest payload (lanț cauzal). */
  causationJobId?: string;
  traceId?: string;
};

function normalizeHttpAndCorrelation(o: Record<string, unknown>): void {
  let c = typeof o.correlationId === "string" ? o.correlationId.trim() : "";
  const h = typeof o.httpCorrelationId === "string" ? o.httpCorrelationId.trim() : "";
  if (h && !c) {
    o.correlationId = h;
    c = h;
  }
  if (c && !h) {
    o.httpCorrelationId = c;
  }
}

function applyAugment(o: Record<string, unknown>, augment?: JobTracingAugment): void {
  if (augment?.causationJobId !== undefined && augment.causationJobId !== "") {
    o.causationJobId = augment.causationJobId;
  }
  if (augment?.traceId !== undefined && augment.traceId !== "") {
    o.traceId = augment.traceId;
  }
}

/**
 * Propagă `correlationId` / `httpCorrelationId` în payload-uri BullMQ pentru trasabilitate.
 * Acceptă doar `httpCorrelationId` și completează perechea; altfel generează `correlationId` nou.
 */
export function ensureJobDataCorrelationId(data: unknown, augment?: JobTracingAugment): object {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = { ...(data as Record<string, unknown>) };
    normalizeHttpAndCorrelation(o);
    const c = typeof o.correlationId === "string" ? o.correlationId.trim() : "";
    if (c.length > 0) {
      applyAugment(o, augment);
      return o as object;
    }
    const out = { ...o, correlationId: randomUUID() };
    normalizeHttpAndCorrelation(out);
    applyAugment(out, augment);
    return out as object;
  }
  const out: Record<string, unknown> = { payload: data, correlationId: randomUUID() };
  normalizeHttpAndCorrelation(out);
  applyAugment(out, augment);
  return out as object;
}

/** Correlation pentru înveliș DLQ / metadate: păstrează lanțul din `originalJobData`, nu un UUID nou. */
export function correlationIdForDlqEnvelope(ensuredOriginalJobData: object): string {
  const o = ensuredOriginalJobData as Record<string, unknown>;
  const c = typeof o.correlationId === "string" ? o.correlationId.trim() : "";
  if (c.length > 0) return c;
  const h = typeof o.httpCorrelationId === "string" ? o.httpCorrelationId.trim() : "";
  if (h.length > 0) return h;
  return randomUUID();
}
