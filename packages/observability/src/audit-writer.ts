/**
 * Scriere bufferizată în audit.audit_log (fără a bloca răspunsul HTTP).
 */
import { createHash, randomUUID } from "node:crypto";
import { insertAuditLogRows, type AuditLogInsertRow } from "@cerniq/db";

function parseOptionalUuid(s: string | null | undefined): string | null {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) {
    return t;
  }
  return null;
}

export type AuditEventInput = {
  tenantId?: string | null;
  userId?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  method: string;
  routePattern: string;
  statusCode: number;
  ipHash?: string | null;
  userAgent?: string | null;
  requestBodyHash?: string | null;
  metadata?: Record<string, unknown>;
  /** Lanț opțional: hash eveniment anterior (aceeași instanță / tenant). */
  previousHash?: string | null;
};

type AuditRow = AuditLogInsertRow;

const BUFFER_MAX = 50;
/** Interval flush (~1.5s): compromis între latență și batch; planul original menționa 1s — ajustare după tuning. */
const FLUSH_MS = 1500;
const CB_FAILURE_THRESHOLD = 5;
const CB_OPEN_MS = 30_000;

let buffer: AuditRow[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let circuitOpenUntil = 0;
let consecutiveFailures = 0;

/** Ultimul event_hash per tenant (lanț simplu, best-effort, o singură instanță). */
const lastHashByTenant = new Map<string, string>();

function refreshCircuit(): void {
  if (Date.now() >= circuitOpenUntil) {
    consecutiveFailures = 0;
  }
}

function shouldAttemptDb(): boolean {
  refreshCircuit();
  return Date.now() >= circuitOpenUntil;
}

function onFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= CB_FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CB_OPEN_MS;
  }
}

function onSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

function stableStringifyForHash(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).toSorted((a, b) => a.localeCompare(b, "en"));
  return JSON.stringify(keys.map((k) => [k, obj[k]]));
}

export function computeAuditEventHash(parts: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringifyForHash(parts), "utf8").digest("hex");
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAuditBufferInternal();
  }, FLUSH_MS);
  flushTimer.unref?.();
}

async function flushAuditBufferInternal(): Promise<void> {
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
        await insertAuditLogRows(batch);
        onSuccess();
      } catch (err: unknown) {
        onFailure();
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[audit-writer] insert failed: ${msg}\n`);
        stdoutFallback(batch);
      }
    }
  } finally {
    flushing = false;
  }
}

function stdoutFallback(rows: AuditRow[]): void {
  for (const row of rows) {
    try {
      process.stdout.write(`${JSON.stringify({ auditLog: row, fallback: "circuit_or_db" })}\n`);
    } catch {
      /* ignore */
    }
  }
}

function enqueue(row: AuditRow): void {
  buffer.push(row);
  if (buffer.length >= BUFFER_MAX) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flushAuditBufferInternal();
  } else {
    scheduleFlush();
  }
}

/** Input compatibil plan: câmpuri semantice mapate în `metadata` (fără coloane SQL dedicate). */
export type AuditWriterWriteInput = AuditEventInput & {
  action?: string;
  resource?: string;
  resourceId?: string | null;
};

/** Mapare `action` / `resource` / `resourceId` în `metadata` + apel `recordAuditEvent`. */
export function writeAuditEvent(input: AuditWriterWriteInput): void {
  const { action, resource, resourceId, metadata: baseMeta, ...rest } = input;
  const merged: Record<string, unknown> = { ...baseMeta };
  if (action !== undefined) merged.action = action;
  if (resource !== undefined) merged.resource = resource;
  if (resourceId !== undefined) merged.resourceId = resourceId;
  recordAuditEvent({ ...rest, metadata: merged });
}

export const auditWriter = { write: writeAuditEvent };

/** Apel neblocant — pune evenimentul în coadă. */
export function recordAuditEvent(input: AuditEventInput): void {
  try {
    const tenantKey = input.tenantId ?? "_none_";
    const previousFromChain =
      input.previousHash ??
      (tenantKey === "_none_" ? null : (lastHashByTenant.get(tenantKey) ?? null));

    const correlationUuid = parseOptionalUuid(input.correlationId ?? undefined);

    const hashPayload: Record<string, unknown> = {
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      correlationId: correlationUuid,
      traceId: input.traceId ?? null,
      spanId: input.spanId ?? null,
      method: input.method,
      routePattern: input.routePattern,
      statusCode: input.statusCode,
      ipHash: input.ipHash ?? null,
      requestBodyHash: input.requestBodyHash ?? null,
      metadata: input.metadata ?? {},
      previousHash: previousFromChain,
      nonce: randomUUID(),
    };

    const eventHash = computeAuditEventHash(hashPayload);

    if (tenantKey !== "_none_") {
      lastHashByTenant.set(tenantKey, eventHash);
    }

    const row: AuditRow = {
      tenantId: input.tenantId ?? undefined,
      userId: input.userId ?? undefined,
      correlationId: correlationUuid ?? undefined,
      traceId: input.traceId ?? undefined,
      spanId: input.spanId ?? undefined,
      method: input.method.slice(0, 16),
      routePattern: input.routePattern,
      statusCode: input.statusCode,
      ipHash: input.ipHash ?? undefined,
      userAgent: input.userAgent ?? undefined,
      requestBodyHash: input.requestBodyHash ?? undefined,
      metadata: input.metadata ?? {},
      eventHash,
      previousHash: previousFromChain ?? undefined,
    };

    enqueue(row);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[audit-writer] enqueue error: ${msg}\n`);
  }
}

export async function flushAuditBuffer(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushAuditBufferInternal();
}

/** Doar teste — golește buffer și lanțul. */
export function resetAuditWriterTestState(): void {
  buffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushing = false;
  circuitOpenUntil = 0;
  consecutiveFailures = 0;
  lastHashByTenant.clear();
}

process.once("beforeExit", () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  void flushAuditBufferInternal();
});
