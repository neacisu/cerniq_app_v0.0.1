/**
 * Span-uri OpenTelemetry pentru driverul `postgres` (postgres.js).
 *
 * Driverul `pg` (node-postgres) nu este folosit în `@cerniq/db`; instrumentarea
 * `@opentelemetry/instrumentation-pg` este dezactivată în `initTelemetry`.
 *
 * Limitări PgBouncer (vezi și `client.ts`): în `pool_mode=transaction`, prepared statements pe conexiune nu persistă între tranzacții — `prepare: false` evită
 * conflictul; span-urile reflectă totuși round-trip-urile reale către server.
 */
import { createHash } from "node:crypto";
import { context, trace, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import type postgres from "postgres";

import { getDbClientInitPerformanceMs } from "./db-client-init-marker.js";

const TRACER_NAME = "@cerniq/db";
const TRACER_VERSION = "0.0.1";
const MAX_STATEMENT_LEN = 2000;
const SLOW_QUERY_THRESHOLD_MS = 1000;

/** O singură dată per proces: ms de la primul `createDbClient` până la primul query reușit (lazy pool). */
let emittedFirstQueryConnectLatency = false;

export function queryStatementHash(redactedStatement: string): string {
  return createHash("sha256").update(redactedStatement, "utf8").digest("hex").slice(0, 16);
}

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

/**
 * Ultimul argument la `sql.begin` / `sql.savepoint` este handler-ul `(sql) => …`.
 * Fără acest narrowing, rămânem pe `unknown` + `as` redundant pentru Sonar/TS.
 */
function isPostgresTransactionHandler(value: unknown): value is (sql: postgres.Sql) => unknown {
  return typeof value === "function";
}

/** `postgres.js` Query extinde Promise și expune `.values()` — nu trebuie „aplatizat” la Promise simplu. */
function isPostgresJsQueryLike(result: unknown): boolean {
  return (
    result !== null &&
    typeof result === "object" &&
    typeof (result as { then?: unknown }).then === "function" &&
    typeof (result as { values?: unknown }).values === "function"
  );
}

function wrapPostgresTransactionCallback(
  handler: (sql: postgres.Sql) => unknown,
  proxyFor: (sql: postgres.Sql) => postgres.Sql,
): (tx: postgres.Sql) => unknown {
  return (tx: postgres.Sql) => handler(proxyFor(tx));
}

function wrapTransactionTailCallback(
  args: unknown[],
  proxyFor: (sql: postgres.Sql) => postgres.Sql,
): unknown[] | null {
  const last = args.at(-1);
  if (!isPostgresTransactionHandler(last)) {
    return null;
  }
  const wrappedFn = wrapPostgresTransactionCallback(last, proxyFor);
  return [...args.slice(0, -1), wrappedFn];
}

function wrapPromiseWithDbSpan(result: unknown, statement: string): unknown {
  if (isPostgresJsQueryLike(result)) {
    return result;
  }
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
  const t0 = performance.now();

  return context.with(ctx, () =>
    Promise.resolve(pending)
      .then((value) => {
        const durationMs = Math.round(performance.now() - t0);
        if (!emittedFirstQueryConnectLatency) {
          const initAt = getDbClientInitPerformanceMs();
          if (initAt !== undefined) {
            emittedFirstQueryConnectLatency = true;
            const connectLatencyMs = Math.round(performance.now() - initAt);
            span.addEvent("db_client_first_query", { connectLatencyMs });
          }
        }
        if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
          span.addEvent("slow_query", {
            "db.query.duration_ms": durationMs,
            "db.query.hash": queryStatementHash(statement),
          });
        }
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
            const wrappedArgs = wrapTransactionTailCallback(args, createProxy);
            if (wrappedArgs !== null) {
              return Reflect.apply(origBegin, client, wrappedArgs);
            }
            return Reflect.apply(origBegin, client, args);
          };
        }

        if (prop === "savepoint") {
          const origSp = Reflect.get(target, prop, receiver) as (...a: unknown[]) => unknown;
          return function savepoint(this: unknown, ...args: unknown[]) {
            const wrappedArgs = wrapTransactionTailCallback(args, createProxy);
            if (wrappedArgs !== null) {
              return Reflect.apply(origSp, client, wrappedArgs);
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
    });
  }

  return createProxy(baseSql) as T;
}
