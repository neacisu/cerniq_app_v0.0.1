import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type postgres from "postgres";

const spanMock = vi.hoisted(() => ({
  addEvent: vi.fn(),
  setStatus: vi.fn(),
  recordException: vi.fn(),
  end: vi.fn(),
}));

const tracerMock = vi.hoisted(() => ({
  startSpan: vi.fn(() => spanMock),
}));

vi.mock("@opentelemetry/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@opentelemetry/api")>();
  return {
    ...actual,
    trace: {
      ...actual.trace,
      getTracer: () => tracerMock,
    },
  };
});

vi.mock("./db-client-init-marker.js", () => ({
  getDbClientInitPerformanceMs: () => 100,
}));

import { templateToRedactedStatement, wrapPostgresClientForTracing } from "./traced-postgres.js";

describe("traced-postgres — instrumentare span (mock OTEL)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sql tag: înfășoară Promise simplu, span OK și slow_query peste prag", async () => {
    const now = vi.spyOn(performance, "now");
    now.mockReturnValueOnce(0).mockReturnValueOnce(1500);

    const root = Object.assign(async function tagged() {
      return [];
    }, {}) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const strings = Object.assign(["SELECT 1"], { raw: ["SELECT 1"] }) as TemplateStringsArray;
    const p = Reflect.apply(wrapped as (...a: unknown[]) => unknown, wrapped, [strings]);
    await expect(Promise.resolve(p)).resolves.toEqual([]);
    expect(tracerMock.startSpan).toHaveBeenCalled();
    expect(spanMock.addEvent).toHaveBeenCalledWith(
      "db_client_first_query",
      expect.objectContaining({ connectLatencyMs: expect.any(Number) }),
    );
    expect(spanMock.addEvent).toHaveBeenCalledWith(
      "slow_query",
      expect.objectContaining({
        "db.query.duration_ms": 1500,
      }),
    );
    expect(spanMock.setStatus).toHaveBeenCalledWith({ code: 1 });
    expect(spanMock.end).toHaveBeenCalled();
  });

  it("sql tag: eroare în Promise înregistrează excepție și status ERROR", async () => {
    const root = Object.assign(async function tagged() {
      throw new Error("boom");
    }, {}) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const strings = Object.assign(["SELECT bad"], { raw: ["SELECT bad"] }) as TemplateStringsArray;
    const pending = Reflect.apply(wrapped as (...a: unknown[]) => unknown, wrapped, [
      strings,
    ]) as Promise<unknown>;
    await expect(pending).rejects.toThrow("boom");
    expect(spanMock.setStatus).toHaveBeenCalledWith({ code: 2 });
    expect(spanMock.recordException).toHaveBeenCalled();
    expect(spanMock.end).toHaveBeenCalled();
  });

  it("sql tag: respingere non-Error este învelită în Error la recordException", async () => {
    const nonErrorReason = { kind: "plain" as const };
    const root = Object.assign(function tagged() {
      // Intenționat non-Error: acoperă `err instanceof Error ? err : new Error(String(err))` în traced-postgres.
      return Promise.reject(nonErrorReason); // NOSONAR
    }, {}) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const strings = Object.assign(["SELECT x"], { raw: ["SELECT x"] }) as TemplateStringsArray;
    const pending = Reflect.apply(wrapped as (...a: unknown[]) => unknown, wrapped, [
      strings,
    ]) as Promise<unknown>;
    await expect(pending).rejects.toBe(nonErrorReason);
    expect(spanMock.recordException).toHaveBeenCalledWith(
      expect.objectContaining({ message: String(nonErrorReason) }),
    );
  });

  it("unsafe: înfășoară rezultatul și trunchiază statement-ul", async () => {
    const root = Object.assign(async function rootFn() {}, {
      unsafe(this: unknown, q: string) {
        return Promise.resolve([q.length]);
      },
    }) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const u = (wrapped as { unsafe: (q: string) => Promise<number[]> }).unsafe;
    await expect(u.call(wrapped, "SELECT 1")).resolves.toEqual([8]);
    expect(tracerMock.startSpan).toHaveBeenCalled();
  });

  it("begin fără handler final: pasează argumentele originale", async () => {
    const calls: unknown[][] = [];
    const root = Object.assign(async function r() {}, {
      begin(this: unknown, ...args: unknown[]) {
        calls.push(args);
        return "passthrough";
      },
    }) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const out = await (wrapped as { begin: (...a: unknown[]) => Promise<string> }).begin("x", 1);
    expect(out).toBe("passthrough");
    expect(calls[0]).toEqual(["x", 1]);
  });

  it("begin: fără funcție la final — nu modifică args", async () => {
    const root = Object.assign(async function r() {}, {
      begin(this: unknown, ...args: unknown[]) {
        return args.length;
      },
    }) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const n = await (wrapped as { begin: (...a: unknown[]) => Promise<number> }).begin(1, 2, 3);
    expect(n).toBe(3);
  });

  it("savepoint: același comportament ca begin pentru tail callback", async () => {
    const inner = Object.assign(async function i() {}, {});
    const root = Object.assign(async function r() {}, {
      savepoint(this: unknown, _n: string, cb: (sql: postgres.Sql) => Promise<string>) {
        return cb(inner as unknown as postgres.Sql);
      },
    }) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const out = await (
      wrapped as unknown as {
        savepoint: (n: string, cb: (s: postgres.Sql) => Promise<string>) => Promise<string>;
      }
    ).savepoint("sp1", async (tx) => {
      expect(tx).not.toBe(inner);
      return "ok";
    });
    expect(out).toBe("ok");
  });

  it("savepoint fără handler: pasează mai departe", async () => {
    const root = Object.assign(async function r() {}, {
      savepoint(this: unknown, ...args: unknown[]) {
        return args;
      },
    }) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const args = await (
      wrapped as unknown as { savepoint: (...a: unknown[]) => Promise<unknown[]> }
    ).savepoint("a", 2);
    expect(args).toEqual(["a", 2]);
  });

  it("get: proprietate non-funcție este returnată", async () => {
    const root = Object.assign(async function r() {}, {
      version: "9",
    }) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    expect((wrapped as unknown as { version: string }).version).toBe("9");
  });

  it("get: metodă este legată de client", async () => {
    const root = Object.assign(async function r() {}, {
      echo(this: postgres.Sql, x: number) {
        return Promise.resolve(x * 2);
      },
    }) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const fn = (wrapped as unknown as { echo: (x: number) => Promise<number> }).echo;
    await expect(fn(11)).resolves.toBe(22);
  });

  it("Query postgres.js cu .values(): nu dublează înfășurarea", () => {
    const queryLike = Object.assign(Promise.resolve([1]), {
      values: () => Promise.resolve([[1]]),
    });
    const root = Object.assign(function tagged() {
      return queryLike;
    }, {}) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const strings = Object.assign(["SELECT v"], { raw: ["SELECT v"] }) as TemplateStringsArray;
    const out = Reflect.apply(wrapped as (...a: unknown[]) => unknown, wrapped, [strings]);
    expect(out).toBe(queryLike);
    expect(tracerMock.startSpan).not.toHaveBeenCalled();
  });

  it("sql tag: rezultat fără then este returnat fără span", () => {
    const root = Object.assign(function tagged() {
      return { ok: true };
    }, {}) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const strings = Object.assign(["SELECT plain"], {
      raw: ["SELECT plain"],
    }) as TemplateStringsArray;
    const out = Reflect.apply(wrapped as (...a: unknown[]) => unknown, wrapped, [strings]);
    expect(out).toEqual({ ok: true });
    expect(tracerMock.startSpan).not.toHaveBeenCalled();
  });

  it("apply non-template: delegă către client", async () => {
    const root = Object.assign(async function plain() {
      return 7;
    }, {}) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const out = await (wrapped as (...a: unknown[]) => Promise<number>)(1, 2, 3);
    expect(out).toBe(7);
  });
});

describe("traced-postgres — template gol", () => {
  it("templateToRedactedStatement cu zero segmente", () => {
    const empty = Object.assign([], { raw: [] }) as TemplateStringsArray;
    expect(templateToRedactedStatement(empty)).toBe("");
  });
});
