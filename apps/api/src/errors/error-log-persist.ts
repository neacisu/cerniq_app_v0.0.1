import { insertErrorLogRows } from "@cerniq/db";
import type { ErrorEnrichment } from "@cerniq/observability";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseOptionalUuid(s: string | null | undefined): string | undefined {
  if (!s || typeof s !== "string") return undefined;
  const t = s.trim();
  return UUID_RE.test(t) ? t : undefined;
}

export type ScheduleApiErrorLogOpts = {
  tenantId: string | null | undefined;
  correlationHeader: string | string[] | undefined;
  traceId?: string;
  spanId?: string;
  errorId: string;
  enriched: ErrorEnrichment;
};

/**
 * Persistă în `observability.error_log` fără a bloca răspunsul. Fără PII în `context`.
 */
export function scheduleApiErrorLogPersist(opts: ScheduleApiErrorLogOpts): void {
  if (process.env.NODE_ENV === "test" && process.env.API_ERROR_LOG_IN_TEST !== "true") {
    return;
  }
  const correlationRaw = opts.correlationHeader;
  const correlationStr = Array.isArray(correlationRaw) ? correlationRaw[0] : correlationRaw;
  const correlationId = parseOptionalUuid(correlationStr);
  const tenantId = parseOptionalUuid(opts.tenantId ?? undefined);

  const row = {
    tenantId,
    fingerprint: opts.enriched.fingerprint,
    message: opts.enriched.enrichedMessage.slice(0, 4000),
    errorType: opts.enriched.errorType,
    context: {
      errorId: opts.errorId,
      causeChain: opts.enriched.causeChain,
    },
    traceId: opts.traceId,
    spanId: opts.spanId,
    correlationId,
  };

  insertErrorLogRows([row]).catch(() => {
    /* evită unhandledRejection; nu logăm aici pentru a nu amplifica I/O la incident DB */
  });
}
