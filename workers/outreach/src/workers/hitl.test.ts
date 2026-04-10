import { describe, expect, it } from "vitest";
import { isRedundantSlaEscalationJob, SLA_HOURS, toPersistedReviewReason } from "./hitl.js";

describe("toPersistedReviewReason", () => {
  it("mapează AI_FLAGGED la AI_UNCERTAIN", () => {
    expect(toPersistedReviewReason("AI_FLAGGED")).toBe("AI_UNCERTAIN");
  });

  it("păstrează motivele canonice", () => {
    expect(toPersistedReviewReason("AI_UNCERTAIN")).toBe("AI_UNCERTAIN");
  });
});

describe("SLA_HOURS", () => {
  it("are chei pentru toate prioritățile documentate", () => {
    expect(SLA_HOURS.URGENT).toBe(1);
    expect(SLA_HOURS.HIGH).toBe(4);
    expect(SLA_HOURS.MEDIUM).toBe(24);
    expect(SLA_HOURS.LOW).toBe(72);
  });
});

describe("isRedundantSlaEscalationJob", () => {
  it("este true când SLA_BREACH și status deja ESCALATED", () => {
    expect(isRedundantSlaEscalationJob("ESCALATED", "SLA_BREACH")).toBe(true);
  });

  it("este false pentru MANUAL chiar dacă ESCALATED", () => {
    expect(isRedundantSlaEscalationJob("ESCALATED", "MANUAL")).toBe(false);
  });

  it("este false pentru SLA_BREACH pe PENDING", () => {
    expect(isRedundantSlaEscalationJob("PENDING", "SLA_BREACH")).toBe(false);
  });
});
