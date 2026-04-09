/**
 * Contract integrare workeri agri (L1–L5) — procesori BullMQ exportați.
 */
import { describe, it, expect } from "vitest";
import { apiaDataProcessor } from "./l1-apia-data.js";
import { ouaiMembershipProcessor } from "./l2-ouai-membership.js";
import { cooperativeMembershipProcessor } from "./l3-cooperative-membership.js";
import { culturiClassifierProcessor } from "./l4-culturi-classifier.js";
import { animaleClassifierProcessor } from "./l5-animale-classifier.js";

describe("Agri workers integration (L1–L5 processors)", () => {
  it("exportă apiaDataProcessor", () => {
    expect(typeof apiaDataProcessor).toBe("function");
  });

  it("exportă ouaiMembershipProcessor", () => {
    expect(typeof ouaiMembershipProcessor).toBe("function");
  });

  it("exportă cooperativeMembershipProcessor", () => {
    expect(typeof cooperativeMembershipProcessor).toBe("function");
  });

  it("exportă culturiClassifierProcessor", () => {
    expect(typeof culturiClassifierProcessor).toBe("function");
  });

  it("exportă animaleClassifierProcessor", () => {
    expect(typeof animaleClassifierProcessor).toBe("function");
  });
});
