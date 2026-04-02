/**
 * job-logger.ts
 *
 * Non-blocking, structured per-job logger for the import pipeline.
 * Writes log entries to `bronze.job_logs` asynchronously (fire-and-forget).
 * Never throws — a logging failure must never crash a worker.
 *
 * Usage:
 *   const log = createJobLogger({ batchId, tenantId, workerName, jobId });
 *   log.info('file_hash_check', 'Hash SHA-256 verificat cu succes', { filePath, hash });
 *   log.error('insert_rows', 'Eroare la inserarea rândurilor', { error: err.message, stack: err.stack });
 */

import { db, jobLogs } from "@cerniq/db";
import type { ImportExecutionContext } from "@cerniq/worker-shared";

export type JobLogLevel = "debug" | "info" | "warn" | "error";

export interface JobLoggerOpts {
  /**
   * UUID of the `bronze_import_batches` row this job belongs to.
   * Required for DB persistence. When absent (e.g. webhook/API-poll/manual-entry
   * workers that are not triggered by a CSV batch), log entries are written only
   * to stdout and never to `bronze.job_logs` — the DB table requires a batch UUID.
   */
  batchId?: string;
  tenantId: string;
  workerName: string;
  jobId?: string;
  /**
   * Unix timestamp (ms) recorded at job start via `Date.now()`.
   * When provided, `log.done()` automatically computes and appends
   * `durationMs` to the context, eliminating manual `Date.now() - startedAt`
   * calculations in worker code.
   */
  startedAt?: number;
  sessionId?: string;
  runtimeJobKey?: string;
  parentRuntimeJobKey?: string | null;
  importExecution?: ImportExecutionContext | null;
}

export interface JobLogger {
  debug(step: string, message: string, context?: Record<string, unknown>): void;
  info(step: string, message: string, context?: Record<string, unknown>): void;
  warn(step: string, message: string, context?: Record<string, unknown>): void;
  error(step: string, message: string, context?: Record<string, unknown>): void;
  /** Convenience: log info + write to stdout */
  step(step: string, message: string, context?: Record<string, unknown>): void;
  /**
   * Log job completion at INFO level.  Automatically appends `durationMs`
   * to the context when `startedAt` was provided in the constructor options.
   */
  done(step: string, message: string, context?: Record<string, unknown>): void;
  /** Gets a child logger scoped to a specific bronzeContactId */
  forContact(contactId: string): JobLogger;
}

function writeLog(
  opts: JobLoggerOpts,
  level: JobLogLevel,
  step: string,
  message: string,
  context: Record<string, unknown> | undefined,
  contactId?: string,
): void {
  // Non-batch workers (webhook/API-poll/manual-entry) have no batchId.
  // The bronze.job_logs table requires batch_id UUID NOT NULL, so we skip the
  // DB write and rely solely on stdout for observability in these cases.
  if (!opts.batchId) return;

  // Fire-and-forget: errors are swallowed intentionally to never break the worker
  db.insert(jobLogs)
    .values({
      tenantId: opts.tenantId,
      batchId: opts.batchId,
      sessionId: opts.importExecution?.sessionId ?? opts.sessionId ?? undefined,
      contactId: contactId ?? undefined,
      workerName: opts.workerName,
      jobId: opts.jobId ?? undefined,
      runtimeJobKey: opts.importExecution?.runtimeJobKey ?? opts.runtimeJobKey ?? undefined,
      parentRuntimeJobKey:
        opts.importExecution?.parentRuntimeJobKey ?? opts.parentRuntimeJobKey ?? undefined,
      level,
      step,
      message,
      context: context ?? null,
    })
    .catch((err: unknown) => {
      // Last resort: write to stderr so it appears in container logs
      const errMsg = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `[job-logger] WRITE FAILED batchId=${opts.batchId} worker=${opts.workerName} step=${step}: ${errMsg}\n`,
      );
    });
}

/**
 * Builds the merged context object for `log.done()` calls.
 * Incorporates `durationMs` (derived from `startedAt`) when the job logger
 * was constructed with a start timestamp.  Returns a plain spread of the
 * caller-supplied context otherwise, never mutating the original object.
 *
 * Using a positive `=== undefined` guard (rather than `!== undefined`) keeps
 * this in line with Sonar S7735 and makes the "no timing" path the base case.
 */
function buildDoneContext(
  startedAt: number | undefined,
  context: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return startedAt === undefined
    ? { ...context }
    : { ...context, durationMs: Date.now() - startedAt };
}

export function createJobLogger(opts: JobLoggerOpts): JobLogger {
  // Pre-compute a safe batch label for stdout prefixes.
  // Non-batch workers (no batchId) use the worker name alone.
  const batchLabel = opts.batchId ? opts.batchId.slice(0, 8) : "no-batch";

  const logger: JobLogger = {
    debug(step, message, context) {
      writeLog(opts, "debug", step, message, context);
    },
    info(step, message, context) {
      writeLog(opts, "info", step, message, context);
    },
    warn(step, message, context) {
      writeLog(opts, "warn", step, message, context);
    },
    error(step, message, context) {
      writeLog(opts, "error", step, message, context);
    },
    step(step, message, context) {
      // Both DB + stdout for important milestones
      writeLog(opts, "debug", step, message, context);
      const ctxStr = context ? ` ${JSON.stringify(context)}` : "";
      process.stdout.write(`[${opts.workerName}] [${batchLabel}] ${step}: ${message}${ctxStr}\n`);
    },
    done(step, message, context) {
      const enriched = buildDoneContext(opts.startedAt, context);
      writeLog(opts, "info", step, message, enriched);
      const ctxStr = Object.keys(enriched).length > 0 ? ` ${JSON.stringify(enriched)}` : "";
      process.stdout.write(`[${opts.workerName}] [${batchLabel}] ${step}: ${message}${ctxStr}\n`);
    },
    forContact(contactId: string): JobLogger {
      return {
        debug(step, message, context) {
          writeLog(opts, "debug", step, message, context, contactId);
        },
        info(step, message, context) {
          writeLog(opts, "info", step, message, context, contactId);
        },
        warn(step, message, context) {
          writeLog(opts, "warn", step, message, context, contactId);
        },
        error(step, message, context) {
          writeLog(opts, "error", step, message, context, contactId);
        },
        step(step, message, context) {
          writeLog(opts, "debug", step, message, context, contactId);
          const ctxStr = context ? ` ${JSON.stringify(context)}` : "";
          process.stdout.write(
            `[${opts.workerName}] [${batchLabel}] [contact:${contactId.slice(0, 8)}] ${step}: ${message}${ctxStr}\n`,
          );
        },
        done(step, message, context) {
          const enriched = buildDoneContext(opts.startedAt, context);
          writeLog(opts, "info", step, message, enriched, contactId);
          const ctxStr = Object.keys(enriched).length > 0 ? ` ${JSON.stringify(enriched)}` : "";
          process.stdout.write(
            `[${opts.workerName}] [${batchLabel}] [contact:${contactId.slice(0, 8)}] ${step}: ${message}${ctxStr}\n`,
          );
        },
        forContact(nestedId: string): JobLogger {
          return createJobLogger(opts).forContact(nestedId);
        },
      };
    },
  };
  return logger;
}
