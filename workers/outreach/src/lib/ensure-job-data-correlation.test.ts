import { describe, expect, it } from "vitest";
import { ensureJobDataCorrelationId } from "./ensure-job-data-correlation.js";

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("ensureJobDataCorrelationId", () => {
  it("păstrează correlationId nevid existent", () => {
    const input = { tenantId: "t1", correlationId: "  abc-123  " };
    const out = ensureJobDataCorrelationId(input) as Record<string, unknown>;
    expect(out.correlationId).toBe("  abc-123  ");
    expect(out.tenantId).toBe("t1");
  });

  it("adaugă correlationId dacă lipsește pe obiect", () => {
    const input = { tenantId: "t1", foo: 1 };
    const out = ensureJobDataCorrelationId(input) as Record<string, unknown>;
    expect(String(out.correlationId)).toMatch(UUID_LIKE);
    expect(out.tenantId).toBe("t1");
    expect(out.foo).toBe(1);
  });

  it("adaugă correlationId dacă stringul e gol", () => {
    const input = { correlationId: "   " };
    const out = ensureJobDataCorrelationId(input) as Record<string, unknown>;
    expect(String(out.correlationId)).toMatch(UUID_LIKE);
  });

  it("înfășoară non-obiect într-un obiect cu payload + correlationId", () => {
    const out = ensureJobDataCorrelationId("raw") as Record<string, unknown>;
    expect(out.payload).toBe("raw");
    expect(String(out.correlationId)).toMatch(UUID_LIKE);
  });

  it("tratează array ca non-obiect", () => {
    const out = ensureJobDataCorrelationId([1, 2]) as Record<string, unknown>;
    expect(out.payload).toEqual([1, 2]);
    expect(String(out.correlationId)).toMatch(UUID_LIKE);
  });
});
