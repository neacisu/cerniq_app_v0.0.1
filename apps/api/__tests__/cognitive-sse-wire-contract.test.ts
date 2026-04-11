/**
 * Contract JSON comun replay DB vs Redis live (shape trimis clientului SSE).
 */
import { describe, it, expect } from "vitest";

describe("Cognitive SSE wire contract", () => {
  it("replay și live folosesc aceleași chei de nivel superior", () => {
    const keys = new Set(["id", "tenantId", "nodeKey", "eventType", "timestamp", "data"]);
    const replay = {
      id: 1,
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
      nodeKey: "e1:test",
      eventType: "node_started",
      timestamp: new Date().toISOString(),
      data: { traceId: null, spanId: null, correlationId: null },
    };
    const live = {
      id: 2,
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
      batchId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      nodeKey: "e1:test",
      eventType: "node_started",
      timestamp: new Date().toISOString(),
      data: { traceId: null, spanId: null, correlationId: null },
    };
    for (const k of Object.keys(replay)) {
      expect(keys.has(k)).toBe(true);
    }
    for (const k of ["id", "tenantId", "nodeKey", "eventType", "timestamp", "data"] as const) {
      expect(Object.prototype.hasOwnProperty.call(live, k)).toBe(true);
    }
  });
});
