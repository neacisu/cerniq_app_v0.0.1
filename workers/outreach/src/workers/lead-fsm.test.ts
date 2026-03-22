import { vi, describe, it, expect } from "vitest";

// Mock @cerniq/db to prevent DATABASE_URL requirement
// (transitive via @cerniq/worker-shared → import-execution.js → @cerniq/db)
vi.mock("@cerniq/db", () => ({ db: {}, sql: vi.fn(), eq: vi.fn(), and: vi.fn() }));

import { validateTransition, VALID_TRANSITIONS } from "./lead-fsm.js";

// ─── VALID_TRANSITIONS map ────────────────────────────────────────────────────

describe("VALID_TRANSITIONS", () => {
  it("defines transitions for all canonical FSM states", () => {
    const expectedStates = [
      "COLD",
      "CONTACTED_WA",
      "CONTACTED_EMAIL",
      "WARM_REPLY",
      "NEGOTIATION",
      "CONVERTED",
      "DEAD",
      "PAUSED",
    ];
    for (const state of expectedStates) {
      expect(VALID_TRANSITIONS).toHaveProperty(state);
    }
  });

  it("CONVERTED is a terminal state with no outgoing transitions", () => {
    expect(VALID_TRANSITIONS["CONVERTED"]).toHaveLength(0);
  });

  it("DEAD can be resurrected to COLD", () => {
    expect(VALID_TRANSITIONS["DEAD"]).toContain("COLD");
  });

  it("COLD has at least two outgoing transitions", () => {
    expect((VALID_TRANSITIONS["COLD"] as string[]).length).toBeGreaterThanOrEqual(2);
  });
});

// ─── validateTransition ───────────────────────────────────────────────────────

describe("validateTransition", () => {
  // ── valid transitions ──

  it("COLD → CONTACTED_WA is valid", () => {
    expect(validateTransition("COLD", "CONTACTED_WA")).toBe(true);
  });

  it("COLD → CONTACTED_EMAIL is valid", () => {
    expect(validateTransition("COLD", "CONTACTED_EMAIL")).toBe(true);
  });

  it("COLD → DEAD is valid", () => {
    expect(validateTransition("COLD", "DEAD")).toBe(true);
  });

  it("CONTACTED_WA → WARM_REPLY is valid", () => {
    expect(validateTransition("CONTACTED_WA", "WARM_REPLY")).toBe(true);
  });

  it("WARM_REPLY → NEGOTIATION is valid", () => {
    expect(validateTransition("WARM_REPLY", "NEGOTIATION")).toBe(true);
  });

  it("NEGOTIATION → CONVERTED is valid", () => {
    expect(validateTransition("NEGOTIATION", "CONVERTED")).toBe(true);
  });

  it("DEAD → COLD is valid (resurrection path)", () => {
    expect(validateTransition("DEAD", "COLD")).toBe(true);
  });

  it("PAUSED → COLD is valid", () => {
    expect(validateTransition("PAUSED", "COLD")).toBe(true);
  });

  it("PAUSED → WARM_REPLY is valid", () => {
    expect(validateTransition("PAUSED", "WARM_REPLY")).toBe(true);
  });

  // ── invalid transitions ──

  it("CONVERTED → anything is invalid (terminal state)", () => {
    expect(validateTransition("CONVERTED", "COLD")).toBe(false);
    expect(validateTransition("CONVERTED", "NEGOTIATION")).toBe(false);
    expect(validateTransition("CONVERTED", "DEAD")).toBe(false);
  });

  it("COLD → CONVERTED is invalid (skip steps)", () => {
    expect(validateTransition("COLD", "CONVERTED")).toBe(false);
  });

  it("COLD → NEGOTIATION is invalid (skip steps)", () => {
    expect(validateTransition("COLD", "NEGOTIATION")).toBe(false);
  });

  it("COLD → WARM_REPLY is invalid (skip steps)", () => {
    expect(validateTransition("COLD", "WARM_REPLY")).toBe(false);
  });

  it("NEGOTIATION → COLD is invalid", () => {
    expect(validateTransition("NEGOTIATION", "COLD")).toBe(false);
  });

  // ── unknown states ──

  it("unknown fromState returns false", () => {
    expect(validateTransition("UNKNOWN_STATE", "COLD")).toBe(false);
  });

  it("known fromState but unknown toState returns false", () => {
    expect(validateTransition("COLD", "FLYING")).toBe(false);
  });

  it("empty strings return false", () => {
    expect(validateTransition("", "COLD")).toBe(false);
    expect(validateTransition("COLD", "")).toBe(false);
  });

  // ── self-transitions ──

  it("self-transitions are invalid (state cannot transition to itself)", () => {
    for (const state of Object.keys(VALID_TRANSITIONS)) {
      expect(validateTransition(state, state)).toBe(false);
    }
  });
});
