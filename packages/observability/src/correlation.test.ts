import { describe, it, expect } from "vitest";
import {
  CorrelationContext,
  getCorrelationStore,
  runWithCorrelation,
  enterCorrelationContext,
} from "./correlation.js";

describe("correlation", () => {
  it("runWithCorrelation expune store în fn", () => {
    runWithCorrelation({ correlationId: "c1", requestId: "r1" }, () => {
      expect(getCorrelationStore()?.correlationId).toBe("c1");
      expect(getCorrelationStore()?.requestId).toBe("r1");
    });
  });

  it("CorrelationContext.run / get / getCorrelationId", () => {
    CorrelationContext.run({ correlationId: "x-2", requestId: "y" }, () => {
      expect(CorrelationContext.get()?.correlationId).toBe("x-2");
      expect(CorrelationContext.getCorrelationId()).toBe("x-2");
    });
  });

  it("getCorrelationId fără store → undefined", () => {
    expect(CorrelationContext.getCorrelationId()).toBeUndefined();
    expect(getCorrelationStore()).toBeUndefined();
  });

  it("câmpuri opționale tenantId, userId, traceId", () => {
    runWithCorrelation(
      {
        correlationId: "c",
        tenantId: "t1",
        userId: "u1",
        traceId: "abc123",
      },
      () => {
        const s = getCorrelationStore();
        expect(s?.tenantId).toBe("t1");
        expect(s?.userId).toBe("u1");
        expect(s?.traceId).toBe("abc123");
      },
    );
  });

  it("imbricare: run interior suprascrie store-ul", () => {
    runWithCorrelation({ correlationId: "outer" }, () => {
      expect(getCorrelationStore()?.correlationId).toBe("outer");
      runWithCorrelation({ correlationId: "inner", requestId: "r" }, () => {
        expect(getCorrelationStore()?.correlationId).toBe("inner");
        expect(getCorrelationStore()?.requestId).toBe("r");
      });
      expect(getCorrelationStore()?.correlationId).toBe("outer");
    });
  });

  it("enterCorrelationContext + get în același sync", () => {
    enterCorrelationContext({ correlationId: "ent", requestId: "q" });
    expect(getCorrelationStore()?.correlationId).toBe("ent");
  });
});
