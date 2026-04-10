import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import pino from "pino";
import { trace, type Span } from "@opentelemetry/api";
import { withSpan, childLoggerWithActiveSpan } from "./tracing.js";

const VALID_TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const VALID_SPAN_ID = "00f067aa0ba902b7";

function mockActiveSpan(): Span {
  return {
    spanContext: () => ({
      traceId: VALID_TRACE_ID,
      spanId: VALID_SPAN_ID,
      traceFlags: 1,
    }),
  } as Span;
}

describe("withSpan", () => {
  beforeEach(() => {
    vi.stubEnv("OTEL_SDK_DISABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returnează valoarea funcției sincrone", () => {
    expect(withSpan("t", () => 42)).toBe(42);
  });

  it("acceptă callback fără argument (compat înapoi)", () => {
    expect(withSpan("t", () => 99)).toBe(99);
  });

  it("propagă erori sincrone", () => {
    expect(() =>
      withSpan("t", () => {
        throw new Error("x");
      }),
    ).toThrow("x");
  });

  it("rezolvă promise-uri", async () => {
    await expect(withSpan("t", async () => 7)).resolves.toBe(7);
  });

  it("propagă reject la async", async () => {
    await expect(
      withSpan("t", async () => {
        throw new Error("async-fail");
      }),
    ).rejects.toThrow("async-fail");
  });

  it("async reject non-Error: recordException primește Error(String)", async () => {
    const nonError = { reason: "string-fail" as const };
    await expect(
      withSpan("t", async () => {
        throw nonError;
      }),
    ).rejects.toBe(nonError);
  });

  it("eroare sincronă cu parentLog: închide span cu ERROR", () => {
    const log = pino({ level: "silent" });
    expect(() =>
      withSpan(
        "t",
        () => {
          throw new Error("sync");
        },
        undefined,
        log,
      ),
    ).toThrow("sync");
  });

  it("eroare sincronă non-Error: recordException cu String(err)", () => {
    const nonError = { reason: "boom" as const };
    expect(() =>
      withSpan("t", () => {
        throw nonError;
      }),
    ).toThrow(nonError);
  });

  it("transmite spanLog când parentLog e setat (fallback părinte fără SDK)", () => {
    const log = pino({ level: "silent" });
    const received: unknown[] = [];
    withSpan(
      "t",
      (spanLog) => {
        received.push(spanLog);
        return 1;
      },
      undefined,
      log,
    );
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(log);
  });

  it("aplică attributes când obiectul e nevid", () => {
    expect(withSpan("t", () => "ok", { "http.route": "/x" })).toBe("ok");
  });

  it("omite attributes când lipsește sau e gol", () => {
    expect(withSpan("t", () => "a", {})).toBe("a");
    expect(withSpan("t", () => "b")).toBe("b");
  });

  it("injectează traceId în child logger când span-ul activ e valid", () => {
    vi.unstubAllEnvs();
    const spy = vi.spyOn(trace, "getActiveSpan").mockReturnValue(mockActiveSpan());
    const log = pino({ level: "silent" });
    let bindings: Record<string, unknown> = {};
    withSpan(
      "inner",
      (spanLog) => {
        bindings = (spanLog as pino.Logger).bindings();
        return undefined;
      },
      undefined,
      log,
    );
    expect(bindings.traceId).toBe(VALID_TRACE_ID);
    expect(bindings.spanId).toBe(VALID_SPAN_ID);
    spy.mockRestore();
  });
});

describe("childLoggerWithActiveSpan", () => {
  beforeEach(() => {
    vi.stubEnv("OTEL_SDK_DISABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returnează undefined fără span activ", () => {
    const log = pino({ level: "silent" });
    expect(trace.getActiveSpan()).toBeUndefined();
    expect(childLoggerWithActiveSpan(log)).toBeUndefined();
  });

  it("returnează undefined în startActiveSpan fără SDK (context noop invalid)", () => {
    const log = pino({ level: "silent" });
    const tracer = trace.getTracer("test", "1");
    tracer.startActiveSpan("outer", () => {
      expect(childLoggerWithActiveSpan(log)).toBeUndefined();
    });
  });

  it("returnează child cu traceId când getActiveSpan raportează context valid", () => {
    const log = pino({ level: "silent" });
    const spy = vi.spyOn(trace, "getActiveSpan").mockReturnValue(mockActiveSpan());
    const child = childLoggerWithActiveSpan(log);
    expect(child).toBeDefined();
    if (child === undefined) {
      throw new Error("expected child logger");
    }
    expect(child.bindings().traceId).toBe(VALID_TRACE_ID);
    expect(child.bindings().spanId).toBe(VALID_SPAN_ID);
    spy.mockRestore();
  });
});
