import { describe, it, expect } from "vitest";
import { LEAD_JOURNEY_FSM_STATES } from "@cerniq/db/schemas/lead-journey-fsm-states";
import {
  validateTransition,
  VALID_TRANSITIONS,
  isLeadJourneyFsmStateValue,
} from "./lead-fsm-transitions.js";

describe("VALID_TRANSITIONS", () => {
  it("definește tranziții pentru toate stările din LEAD_JOURNEY_FSM_STATES", () => {
    for (const state of LEAD_JOURNEY_FSM_STATES) {
      expect(VALID_TRANSITIONS).toHaveProperty(state);
      expect(Array.isArray(VALID_TRANSITIONS[state])).toBe(true);
    }
    expect(Object.keys(VALID_TRANSITIONS)).toHaveLength(LEAD_JOURNEY_FSM_STATES.length);
  });

  it("CONVERTED permite handoff post-vânzare (ONBOARDING / NURTURING_ACTIVE)", () => {
    expect(VALID_TRANSITIONS["CONVERTED"]).toEqual(["ONBOARDING", "NURTURING_ACTIVE"]);
  });

  it("DO_NOT_CONTACT este terminal (fără ieșire)", () => {
    expect(VALID_TRANSITIONS["DO_NOT_CONTACT"]).toHaveLength(0);
  });

  it("DEAD poate reveni la COLD sau DO_NOT_CONTACT", () => {
    expect(VALID_TRANSITIONS["DEAD"]).toContain("COLD");
    expect(VALID_TRANSITIONS["DEAD"]).toContain("DO_NOT_CONTACT");
  });

  it("NURTURING_ACTIVE → CHURNED este interzis (trecere prin AT_RISK)", () => {
    expect(validateTransition("NURTURING_ACTIVE", "CHURNED")).toBe(false);
  });
});

describe("isLeadJourneyFsmStateValue", () => {
  it("acceptă fiecare stare din LEAD_JOURNEY_FSM_STATES", () => {
    for (const s of LEAD_JOURNEY_FSM_STATES) {
      expect(isLeadJourneyFsmStateValue(s)).toBe(true);
    }
  });

  it("respinge stringuri care nu sunt în enum", () => {
    expect(isLeadJourneyFsmStateValue("UNKNOWN")).toBe(false);
    expect(isLeadJourneyFsmStateValue("")).toBe(false);
  });
});

describe("validateTransition", () => {
  it("COLD → CONTACTED_PHONE valid", () => {
    expect(validateTransition("COLD", "CONTACTED_PHONE")).toBe(true);
  });

  it("WARM_REPLY → ENGAGED valid", () => {
    expect(validateTransition("WARM_REPLY", "ENGAGED")).toBe(true);
  });

  it("NEGOTIATION → PROPOSAL valid", () => {
    expect(validateTransition("NEGOTIATION", "PROPOSAL")).toBe(true);
  });

  it("PROPOSAL → CLOSING valid", () => {
    expect(validateTransition("PROPOSAL", "CLOSING")).toBe(true);
  });

  it("CONVERTED → ONBOARDING valid", () => {
    expect(validateTransition("CONVERTED", "ONBOARDING")).toBe(true);
  });

  it("ONBOARDING → NURTURING_ACTIVE valid", () => {
    expect(validateTransition("ONBOARDING", "NURTURING_ACTIVE")).toBe(true);
  });

  it("NURTURING_ACTIVE → AT_RISK valid", () => {
    expect(validateTransition("NURTURING_ACTIVE", "AT_RISK")).toBe(true);
  });

  it("AT_RISK → CHURNED valid", () => {
    expect(validateTransition("AT_RISK", "CHURNED")).toBe(true);
  });

  it("CHURNED → COLD valid (win-back)", () => {
    expect(validateTransition("CHURNED", "COLD")).toBe(true);
  });

  it("CONVERTED → COLD invalid", () => {
    expect(validateTransition("CONVERTED", "COLD")).toBe(false);
  });

  it("COLD → CONVERTED invalid (salt)", () => {
    expect(validateTransition("COLD", "CONVERTED")).toBe(false);
  });

  it("unknown fromState → false", () => {
    expect(validateTransition("UNKNOWN_STATE", "COLD")).toBe(false);
  });

  it("toState inexistent → false", () => {
    expect(validateTransition("COLD", "FLYING")).toBe(false);
  });

  it("nu există self-transition pentru stări cu ieșiri", () => {
    for (const state of LEAD_JOURNEY_FSM_STATES) {
      if ((VALID_TRANSITIONS[state] as string[]).length > 0) {
        expect(validateTransition(state, state)).toBe(false);
      }
    }
  });
});
