/**
 * Buffered job execution logger → observability.job_logs.
 * Never throws from logging paths.
 */
import { trace } from "@opentelemetry/api";
import { insertJobLogRows, type JobLogInsertRow } from "@cerniq/db";
import { getCorrelationStore } from "./correlation.js";

function parseOptionalUuid(s: string | null | undefined): string | undefined {
  if (!s || typeof s !== "string") return undefined;
  const t = s.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) {
    return t;
  }
  return undefined;
}

export type JobLogLevel = "debug" | "info" | "warn" | "error";

type JobLogInsert = JobLogInsertRow;

const BUFFER_MAX = 100;
const FLUSH_MS = 2000;
const CB_FAILURE_THRESHOLD = 5;
const CB_OPEN_MS = 30_000;

type CircuitState = "closed" | "open" | "half_open";

let buffer: JobLogInsert[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

let circuitState: CircuitState = "closed";
let consecutiveFailures = 0;
let openUntil = 0;

export interface JobLoggerOpts {
  batchId?: string;
  tenantId: string;
  workerName: string;
  jobId?: string;
  startedAt?: number;
  sessionId?: string;
  runtimeJobKey?: string;
  parentRuntimeJobKey?: string | null;
  /** Pipeline etapa (default e1 — import enrichment). */
  etapa?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  entityType?: string;
  entityId?: string;
  queueName?: string;
  /** Set on error-level logs when available (e.g. from enrichError). */
  errorFingerprint?: string;
}

export interface JobLogger {
  debug(step: string, message: string, context?: Record<string, unknown>): void;
  info(step: string, message: string, context?: Record<string, unknown>): void;
  warn(step: string, message: string, context?: Record<string, unknown>): void;
  error(step: string, message: string, context?: Record<string, unknown>): void;
  step(step: string, message: string, context?: Record<string, unknown>): void;
  done(step: string, message: string, context?: Record<string, unknown>): void;
  forContact(contactId: string): JobLogger;
}

function refreshCircuit(): void {
  if (circuitState === "open" && Date.now() >= openUntil) {
    circuitState = "half_open";
  }
}

function shouldAttemptDb(): boolean {
  refreshCircuit();
  return circuitState === "closed" || circuitState === "half_open";
}

function onInsertFailure(): void {
  consecutiveFailures += 1;
  if (circuitState === "half_open" || consecutiveFailures >= CB_FAILURE_THRESHOLD) {
    circuitState = "open";
    openUntil = Date.now() + CB_OPEN_MS;
  }
}

function onInsertSuccess(): void {
  consecutiveFailures = 0;
  circuitState = "closed";
}

function stdoutFallback(rows: JobLogInsert[]): void {
  for (const row of rows) {
    try {
      process.stdout.write(`${JSON.stringify({ jobLog: row, fallback: "circuit_or_db" })}\n`);
    } catch {
      /* ignore */
    }
  }
}

function scheduleFlushDelayed(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushInternal();
  }, FLUSH_MS);
  flushTimer.unref?.();
}

async function flushInternal(): Promise<void> {
  if (flushing || buffer.length === 0) return;
  flushing = true;
  try {
    while (buffer.length > 0) {
      const batch = buffer.splice(0, BUFFER_MAX);
      if (!shouldAttemptDb()) {
        stdoutFallback(batch);
        continue;
      }
      try {
        await insertJobLogRows(batch);
        onInsertSuccess();
      } catch (err: unknown) {
        onInsertFailure();
        const errMsg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[job-logger] WRITE FAILED worker=batch: ${errMsg}\n`);
        stdoutFallback(batch);
      }
    }
  } finally {
    flushing = false;
  }
}

function enqueue(row: JobLogInsert): void {
  buffer.push(row);
  if (buffer.length >= BUFFER_MAX) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flushInternal();
  } else {
    scheduleFlushDelayed();
  }
}

/** Best-effort flush (tests / shutdown). */
export async function flushJobLogBuffer(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushInternal();
}

/** Vitest-only: clears buffer and circuit (module singleton). */
export function resetJobLogTestState(): void {
  buffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushing = false;
  circuitState = "closed";
  consecutiveFailures = 0;
  openUntil = 0;
}

process.once("beforeExit", () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  void flushInternal();
});

function extractDurationMs(context: Record<string, unknown> | undefined): number | undefined {
  if (!context || typeof context.durationMs !== "number") return undefined;
  return context.durationMs;
}

function mergeContextFromOtel(opts: JobLoggerOpts): {
  correlationId?: string;
  traceId?: string;
  spanId?: string;
} {
  const fromAls = getCorrelationStore();
  const spanCtx = trace.getActiveSpan()?.spanContext();
  const traceFromSpan =
    spanCtx?.traceId && spanCtx.traceId !== "00000000000000000000000000000000"
      ? spanCtx.traceId
      : undefined;
  const traceId = opts.traceId ?? fromAls?.traceId ?? traceFromSpan;
  const spanId = opts.spanId ?? spanCtx?.spanId;
  const correlationRaw = opts.correlationId ?? fromAls?.correlationId;
  const correlationId = parseOptionalUuid(correlationRaw ?? undefined);
  return { correlationId, traceId, spanId };
}

function buildRow(
  opts: JobLoggerOpts,
  level: JobLogLevel,
  step: string,
  message: string,
  context: Record<string, unknown> | undefined,
  contactId?: string,
): JobLogInsert {
  const durationMs = extractDurationMs(context);
  const merged = mergeContextFromOtel(opts);
  return {
    tenantId: opts.tenantId,
    etapa: opts.etapa ?? "e1",
    batchId: opts.batchId ?? null,
    sessionId: opts.sessionId ?? undefined,
    contactId: contactId ?? undefined,
    workerName: opts.workerName,
    queueName: opts.queueName ?? undefined,
    jobId: opts.jobId ?? undefined,
    runtimeJobKey: opts.runtimeJobKey ?? undefined,
    parentRuntimeJobKey: opts.parentRuntimeJobKey ?? undefined,
    level,
    step,
    message,
    context: context ?? null,
    correlationId: merged.correlationId,
    traceId: merged.traceId,
    spanId: merged.spanId,
    entityType: opts.entityType ?? undefined,
    entityId: opts.entityId ?? undefined,
    errorFingerprint: level === "error" ? (opts.errorFingerprint ?? undefined) : undefined,
    durationMs: durationMs ?? undefined,
  };
}

function writeLog(
  opts: JobLoggerOpts,
  level: JobLogLevel,
  step: string,
  message: string,
  context: Record<string, unknown> | undefined,
  contactId?: string,
): void {
  try {
    enqueue(buildRow(opts, level, step, message, context, contactId));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[job-logger] enqueue failed: ${errMsg}\n`);
  }
}

function buildDoneContext(
  startedAt: number | undefined,
  context: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return startedAt === undefined
    ? { ...context }
    : { ...context, durationMs: Date.now() - startedAt };
}

export function createJobLogger(opts: JobLoggerOpts): JobLogger {
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
