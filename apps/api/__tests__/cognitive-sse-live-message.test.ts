import { describe, expect, it } from "vitest";
import {
  evaluateCognitiveSseLiveMessage,
  MAX_SSE_BRAIN_PAYLOAD_BYTES,
} from "../src/lib/cognitive-sse-live-message.js";

const baseMsg = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    nodeKey: "e1:test",
    eventType: "node_started",
    timestamp: "2026-01-01T00:00:00.000Z",
    data: {},
    ...over,
  });

describe("evaluateCognitiveSseLiveMessage", () => {
  it("acceptă mesaj valid pentru același tenant", () => {
    const r = evaluateCognitiveSseLiveMessage(
      baseMsg(),
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      undefined,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.wire.tenantId).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
      expect(r.wire.nodeKey).toBe("e1:test");
    }
  });

  it("respinge tenant greșit (fără scurgere către alt tenant)", () => {
    const r = evaluateCognitiveSseLiveMessage(
      baseMsg(),
      "11111111-2222-3333-4444-555555555555",
      undefined,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("tenant_mismatch");
  });

  it("respinge legacy fără tenantId", () => {
    const r = evaluateCognitiveSseLiveMessage(
      JSON.stringify({
        nodeKey: "e1:test",
        eventType: "x",
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      undefined,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("legacy_no_tenant");
  });

  it("cu batchId în query, cere același batchId în mesaj", () => {
    const batch = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const ok = evaluateCognitiveSseLiveMessage(
      baseMsg({ batchId: batch }),
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      batch,
    );
    expect(ok.ok).toBe(true);

    const wrong = evaluateCognitiveSseLiveMessage(
      baseMsg({ batchId: "cccccccc-cccc-cccc-cccc-cccccccccccc" }),
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      batch,
    );
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.reason).toBe("batch_scope");
  });

  it("respinge payload prea mare", () => {
    const huge = "x".repeat(MAX_SSE_BRAIN_PAYLOAD_BYTES + 10);
    const r = evaluateCognitiveSseLiveMessage(
      huge,
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      undefined,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("payload_too_large");
  });

  it("include id numeric când e prezent", () => {
    const r = evaluateCognitiveSseLiveMessage(
      baseMsg({ id: 42 }),
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      undefined,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.wire.id).toBe(42);
  });
});
