import { describe, expect, it } from "vitest";
import type postgres from "postgres";
import {
  queryStatementHash,
  templateToRedactedStatement,
  truncateStatement,
  wrapPostgresClientForTracing,
} from "./traced-postgres.js";

describe("traced-postgres (statement redaction)", () => {
  it("templateToRedactedStatement: array gol", () => {
    const strings = Object.assign([], { raw: [] as readonly string[] }) as TemplateStringsArray;
    expect(templateToRedactedStatement(strings)).toBe("");
  });

  it("templateToRedactedStatement: primul segment nullish devine gol înainte de placeholder-e", () => {
    const strings = Object.assign([undefined as unknown as string, "tail"], {
      raw: [undefined as unknown as string, "tail"],
    }) as TemplateStringsArray;
    expect(templateToRedactedStatement(strings)).toBe("$1tail");
  });

  it("templateToRedactedStatement folosește ?? pentru segmente lipsă", () => {
    const strings = Object.assign(["a", undefined as unknown as string, "c"], {
      raw: ["a", undefined as unknown as string, "c"],
    }) as TemplateStringsArray;
    // Trei segmente ⇒ două placeholder-e ($1, $2); segmentul din mijloc devine gol prin ??.
    expect(templateToRedactedStatement(strings)).toBe("a$1$2c");
  });

  it("templateToRedactedStatement înlocuiește valorile cu placeholders numerotate", () => {
    const strings = Object.assign(["SELECT * FROM users WHERE id = ", " AND x = ", ""], {
      raw: ["SELECT * FROM users WHERE id = ", " AND x = ", ""],
    }) as TemplateStringsArray;
    const stmt = templateToRedactedStatement(strings);
    expect(stmt).toBe("SELECT * FROM users WHERE id = $1 AND x = $2");
  });

  it("truncateStatement limitează lungimea", () => {
    const long = "a".repeat(3000);
    expect(truncateStatement(long).length).toBeLessThanOrEqual(2002);
    expect(truncateStatement(long).endsWith("…")).toBe(true);
  });

  it("queryStatementHash este stabil și trunchiat", () => {
    const h = queryStatementHash("SELECT $1 FROM t");
    expect(h).toHaveLength(16);
    expect(queryStatementHash("SELECT $1 FROM t")).toBe(h);
  });
});

describe("wrapPostgresClientForTracing (tranzacții, fără Postgres real)", () => {
  it("begin: clientul din callback este re-învelit (Proxy), nu același obiect ca cel intern", async () => {
    const innerForCallback = Object.assign(
      async function innerTagged() {
        return [];
      },
      { __kind: "inner" as const },
    );

    const root = Object.assign(
      async function rootTagged() {
        return [];
      },
      {
        async begin(cb: (sql: postgres.Sql) => Promise<unknown>) {
          return cb(innerForCallback as unknown as postgres.Sql);
        },
      },
    ) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    await wrapped.begin(async (tx) => {
      expect(tx).not.toBe(innerForCallback);
      expect((tx as { __kind?: string }).__kind).toBe("inner");
    });
  });

  it("begin(options, cb): păstrează șirul de opțiuni (API postgres.js) și învelește callback-ul", async () => {
    /** Fragment după `BEGIN` — vezi postgres.js README: `sql.begin('read write', async sql => …)`. */
    const beginOptions = "read write";
    const innerForCallback = Object.assign(async function inner() {
      return [];
    }, {});

    const root = Object.assign(
      async function root() {
        return [];
      },
      {
        async begin(opts: string, cb: (sql: postgres.Sql) => Promise<string>) {
          expect(opts).toBe(beginOptions);
          return cb(innerForCallback as unknown as postgres.Sql);
        },
      },
    ) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const out = await wrapped.begin(beginOptions, async (tx) => {
      expect(tx).not.toBe(innerForCallback);
      return "ok";
    });
    expect(out).toBe("ok");
  });

  it("în begin: savepoint(name, cb) pe TransactionSql păstrează numele și învelește callback-ul", async () => {
    const innerAfterSp = Object.assign(
      async function afterSp() {
        return [];
      },
      {
        __afterSp: true as const,
      },
    );

    const transactionSql = Object.assign(
      async function txTagged() {
        return [];
      },
      {
        async savepoint(name: string, cb: (sql: postgres.Sql) => Promise<number>) {
          expect(name).toBe("audit_step");
          return cb(innerAfterSp as unknown as postgres.Sql);
        },
      },
    );

    const root = Object.assign(
      async function root() {
        return [];
      },
      {
        async begin(cb: (sql: postgres.Sql) => Promise<number>) {
          return cb(transactionSql as unknown as postgres.Sql);
        },
      },
    ) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const out = await wrapped.begin(async (tx) => {
      return tx.savepoint("audit_step", async (spSql) => {
        expect(spSql).not.toBe(innerAfterSp);
        expect((spSql as { __afterSp?: boolean }).__afterSp).toBe(true);
        return 42;
      });
    });
    expect(out).toBe(42);
  });
});
