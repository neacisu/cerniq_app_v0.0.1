/**
 * Span-uri OpenTelemetry pentru driverul `postgres` (postgres.js).
 *
 * Driverul `pg` (node-postgres) nu este folosit în `@cerniq/db`; instrumentarea
 * `@opentelemetry/instrumentation-pg` este dezactivată în `initTelemetry`.
 *
 * Limitări PgBouncer (vezi și `client.ts`): în `pool_mode=transaction`, prepared statements pe conexiune nu persistă între tranzacții — `prepare: false` evită
 * conflictul; span-urile reflectă totuși round-trip-urile reale către server.
 */
import { context, trace, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import type postgres from "postgres";

const TRACER_NAME = "@cerniq/db";
const TRACER_VERSION = "0.0.1";
const MAX_STATEMENT_LEN = 2000;

export function truncateStatement(sqlText: string): string {
  if (sqlText.length <= MAX_STATEMENT_LEN) return sqlText;
  return `${sqlText.slice(0, MAX_STATEMENT_LEN)}…`;
}

function isTemplateStringsArray(value: unknown): value is TemplateStringsArray {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as TemplateStringsArray).raw);
}

/** Reconstruiește text SQL cu placeholders `$n` — fără valorile interpolate (PII). */
export function templateToRedactedStatement(strings: TemplateStringsArray): string {
  if (strings.length === 0) return "";
  let out = strings[0] ?? "";
  for (let i = 1; i < strings.length; i++) {
    out += `$${i}` + (strings[i] ?? "");
  }
  return truncateStatement(out);
}

function wrapPromiseWithDbSpan(result: unknown, statement: string): unknown {
  const pending = result as {
    then?: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => unknown;
  };
  if (typeof pending?.then !== "function") {
    return result;
  }

  const tracer = trace.getTracer(TRACER_NAME, TRACER_VERSION);
  const span = tracer.startSpan("db.postgresql.query", {
    kind: SpanKind.CLIENT,
    attributes: {
      "db.system": "postgresql",
      "db.statement": statement,
    },
  });

  const ctx = trace.setSpan(context.active(), span);

  return context.with(ctx, () =>
    Promise.resolve(pending)
      .then((value) => {
        span.setStatus({ code: SpanStatusCode.OK });
        return value;
      })
      .catch((err: unknown) => {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.recordException(err instanceof Error ? err : new Error(String(err)));
        throw err;
      })
      .finally(() => {
        span.end();
      }),
  );
}

export function wrapPostgresClientForTracing<T extends postgres.Sql>(baseSql: T): T {
  function createProxy(client: postgres.Sql): postgres.Sql {
    return new Proxy(client, {
      apply(_target, _thisArg, argList: unknown[]) {
        const first = argList[0];
        if (isTemplateStringsArray(first)) {
          const stmt = templateToRedactedStatement(first);
          const rawResult = Reflect.apply(
            client as (...args: unknown[]) => unknown,
            client,
            argList,
          );
          return wrapPromiseWithDbSpan(rawResult, stmt);
        }
        return Reflect.apply(client as (...args: unknown[]) => unknown, client, argList);
      },
      get(target, prop, receiver) {
        if (prop === "unsafe") {
          const orig = Reflect.get(target, prop, receiver) as typeof client.unsafe;
          return function unsafe(this: unknown, query: string, ...rest: unknown[]) {
            const rawResult = Reflect.apply(orig, client, [query, ...rest]);
            return wrapPromiseWithDbSpan(rawResult, truncateStatement(query));
          };
        }

        if (prop === "begin") {
          const origBegin = Reflect.get(target, prop, receiver) as (...a: unknown[]) => unknown;
          return function begin(this: unknown, ...args: unknown[]) {
            const last = args[args.length - 1];
            if (typeof last === "function") {
              const wrappedFn = (tx: unknown) =>
                (last as (sql: unknown) => unknown)(createProxy(tx as postgres.Sql));
              if (args.length === 1) {
                return Reflect.apply(origBegin, client, [wrappedFn]);
              }
              return Reflect.apply(origBegin, client, [args[0], wrappedFn]);
            }
            return Reflect.apply(origBegin, client, args);
          };
        }

        if (prop === "savepoint") {
          const origSp = Reflect.get(target, prop, receiver) as (...a: unknown[]) => unknown;
          return function savepoint(this: unknown, ...args: unknown[]) {
            const last = args[args.length - 1];
            if (typeof last === "function") {
              const wrappedFn = (tx: unknown) =>
                (last as (sql: unknown) => unknown)(createProxy(tx as postgres.Sql));
              if (args.length === 1) {
                return Reflect.apply(origSp, client, [wrappedFn]);
              }
              return Reflect.apply(origSp, client, [args[0], wrappedFn]);
            }
            return Reflect.apply(origSp, client, args);
          };
        }

        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          return function (this: unknown, ...fnArgs: unknown[]) {
            return Reflect.apply(value, client, fnArgs);
          };
        }
        return value;
      },
    }) as postgres.Sql;
  }

  return createProxy(baseSql) as T;
}
