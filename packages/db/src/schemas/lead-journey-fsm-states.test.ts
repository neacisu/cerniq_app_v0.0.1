import { describe, it, expect } from "vitest";
import { currentStateEnum } from "./outreach-enums.js";
import { LEAD_JOURNEY_FSM_STATES } from "./lead-journey-fsm-states.js";

describe("LEAD_JOURNEY_FSM_STATES ↔ currentStateEnum", () => {
  it("pgEnum are aceleași valori ca lista canon", () => {
    expect(currentStateEnum.enumValues).toEqual([...LEAD_JOURNEY_FSM_STATES]);
  });

  it("are exact 18 stări (contract E2–E5 / API Etapa 1)", () => {
    expect(LEAD_JOURNEY_FSM_STATES.length).toBe(18);
  });
});
