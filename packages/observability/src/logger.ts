/**
 * Service logger (Pino) — orthogonal to OpenTelemetry SDK in init.ts.
 */
import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";
import { hostname } from "node:os";

function collectPgFields(err: unknown): { code?: string; detail?: string; constraint?: string } {
  let cur: unknown = err;
  const seen = new Set<unknown>();
  while (cur instanceof Error && !seen.has(cur)) {
    seen.add(cur);
    const o = cur as Error & { code?: string; detail?: string; constraint?: string };
    if (typeof o.code === "string" && o.code.length > 0) {
      return {
        code: o.code,
        ...(typeof o.detail === "string" ? { detail: o.detail } : {}),
        ...(typeof o.constraint === "string" ? { constraint: o.constraint } : {}),
      };
    }
    cur = o.cause;
  }
  return {};
}

function serializeCauseChain(err: Error): unknown[] {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = err.cause;
  while (cur !== undefined && cur !== null) {
    if (seen.has(cur)) {
      chain.push({ circular: true });
      break;
    }
    seen.add(cur);
    if (cur instanceof Error) {
      const e = cur as Error & { code?: string; detail?: string; constraint?: string };
      chain.push({
        type: e.constructor?.name ?? "Error",
        message: e.message,
        stack: e.stack,
        ...collectPgFields(e),
      });
      cur = e.cause;
    } else {
      chain.push(cur);
      break;
    }
  }
  return chain;
}

function errSerializer(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) {
    return { type: typeof err, value: err };
  }
  const pg = collectPgFields(err);
  return {
    type: err.constructor?.name ?? "Error",
    message: err.message,
    stack: err.stack,
    ...pg,
    cause: serializeCauseChain(err),
  };
}

const DEFAULT_REDACT_PATHS = [
  "email",
  "phone",
  "password",
  "token",
  "authorization",
  "cookie",
  "creditCard",
  "*.email",
  "*.phone",
  "*.password",
  "*.token",
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
];

export interface CreateServiceLoggerOptions {
  etapa?: string;
  /** Pino level name (default LOG_LEVEL or info) */
  level?: string;
  /** Override output stream (e.g. tests) */
  destination?: DestinationStream;
}

export function createServiceLogger(
  serviceName: string,
  opts: CreateServiceLoggerOptions = {},
): Logger {
  const environment = process.env.NODE_ENV ?? "development";
  const usePretty =
    environment === "development" && process.env.LOG_PRETTY !== "false" && !opts.destination;

  const base = {
    service: serviceName,
    etapa: opts.etapa ?? process.env.CERNIQ_ETAPA,
    hostname: hostname(),
    pid: process.pid,
    version: process.env.APP_VERSION ?? "0.0.1",
    environment,
  };

  const pinoOpts: LoggerOptions = {
    level: opts.level ?? process.env.LOG_LEVEL ?? "info",
    base,
    serializers: { err: errSerializer },
    redact: {
      paths: DEFAULT_REDACT_PATHS,
      censor: "[REDACTED]",
    },
  };

  if (opts.destination) {
    return pino(pinoOpts, opts.destination);
  }

  if (usePretty) {
    const transport = pino.transport({
      target: "pino-pretty",
      options: { colorize: true },
    });
    return pino(pinoOpts, transport);
  }

  return pino(pinoOpts);
}
