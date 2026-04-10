import { SpanStatusCode, isSpanContextValid, trace, type Span } from "@opentelemetry/api";
import type { Logger } from "pino";

const TRACER_NAME = "@cerniq/observability";
const TRACER_VERSION = "0.0.1";

function getTracer() {
  return trace.getTracer(TRACER_NAME, TRACER_VERSION);
}

/**
 * Child logger cu `traceId` / `spanId` din span-ul activ (dacă contextul e valid).
 * Fără span activ sau context invalid → `undefined` (nu creăm câmpuri false).
 */
export function childLoggerWithActiveSpan(parent: Logger): Logger | undefined {
  const ctx = trace.getActiveSpan()?.spanContext();
  if (!ctx || !isSpanContextValid(ctx)) return undefined;
  return parent.child({ traceId: ctx.traceId, spanId: ctx.spanId });
}

function resolveSpanLog(parentLog: Logger | undefined): Logger | undefined {
  if (!parentLog) return undefined;
  return childLoggerWithActiveSpan(parentLog) ?? parentLog;
}

/**
 * Execută `fn` într-un span activ; înregistrează excepții și status ERROR/OK.
 * Nu inițializează SDK-ul — apelați `initTelemetry()` la startup.
 *
 * Dacă `parentLog` e setat, `fn` primește un child logger cu trace/span când contextul e valid,
 * altfel părintele (fallback pentru OTel dezactivat / fără span).
 */
export function withSpan<T>(
  name: string,
  fn: (spanLog?: Logger) => T | Promise<T>,
  attributes?: Record<string, string | number | boolean>,
  parentLog?: Logger,
): T | Promise<T> {
  const tracer = getTracer();
  const runInSpan = (span: Span) => {
    const spanLog = resolveSpanLog(parentLog);
    try {
      const result = fn(spanLog);
      if (result instanceof Promise) {
        return result
          .then((value) => {
            span.setStatus({ code: SpanStatusCode.OK });
            return value;
          })
          .catch((err: unknown) => {
            span.setStatus({ code: SpanStatusCode.ERROR });
            span.recordException(err instanceof Error ? err : new Error(String(err)));
            throw err;
          })
          .finally(() => span.end());
      }
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (err: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      span.end();
      throw err;
    }
  };

  if (attributes !== undefined && Object.keys(attributes).length > 0) {
    return tracer.startActiveSpan(name, { attributes }, runInSpan);
  }
  return tracer.startActiveSpan(name, runInSpan);
}
