/**
 * Log structurat comun pentru eșecuri în worker-ii SMS (enrichError + job_logs + Pino).
 * Nu include corp SMS complet sau răspuns provider în clar — doar câmpuri sumarizate / enrichError.
 */
import { enrichError } from "@cerniq/observability";
import type { JobLogger } from "./job-logger.js";

export type SvcLogErrorFn = (obj: Record<string, unknown>, msg: string) => void;

const MAX_ENRICHED_MSG_LOG_CHARS = 500;

function trimForJobLog(enrichedMessage: string): string {
  if (enrichedMessage.length <= MAX_ENRICHED_MSG_LOG_CHARS) return enrichedMessage;
  return `${enrichedMessage.slice(0, MAX_ENRICHED_MSG_LOG_CHARS)}…`;
}

/** Înregistrează fingerprint + tip eroare + context și re-aruncă (pentru BullMQ retry / DLQ). */
export function logSmsJobFailureAndThrow(
  svcLogError: SvcLogErrorFn,
  jlog: Pick<JobLogger, "error">,
  err: unknown,
  svcMessage: string,
  logStep: string,
  baseContext: Record<string, unknown>,
): never {
  const enr = enrichError(err, baseContext);
  svcLogError(
    {
      err,
      ...baseContext,
      fingerprint: enr.fingerprint,
      errorType: enr.errorType,
      errorCode: enr.errorCode,
      enrichedMessage: trimForJobLog(enr.enrichedMessage),
    },
    svcMessage,
  );
  jlog.error(logStep, "failed", {
    ...baseContext,
    fingerprint: enr.fingerprint,
    errorType: enr.errorType,
    errorCode: enr.errorCode,
    enrichedMessage: trimForJobLog(enr.enrichedMessage),
  });
  throw err;
}
