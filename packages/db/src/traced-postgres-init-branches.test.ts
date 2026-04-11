import { describe, expect, it, vi } from "vitest";
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
  getDbClientInitPerformanceMs: () => undefined,
}));

import { wrapPostgresClientForTracing } from "./traced-postgres.js";

describe("traced-postgres — fără marcaj init (ramură initAt undefined)", () => {
  it("interogare reușită fără eveniment db_client_first_query", async () => {
    vi.clearAllMocks();
    const root = Object.assign(async function tagged() {
      return [1];
    }, {}) as unknown as postgres.Sql;

    const wrapped = wrapPostgresClientForTracing(root);
    const strings = Object.assign(["SELECT 1"], { raw: ["SELECT 1"] }) as TemplateStringsArray;
    await Reflect.apply(wrapped as (...a: unknown[]) => unknown, wrapped, [strings]);
    expect(
      spanMock.addEvent.mock.calls.find((c) => c[0] === "db_client_first_query"),
    ).toBeUndefined();
    expect(spanMock.end).toHaveBeenCalled();
  });
});
