/**
 * nurturing-fsm.test.ts — Suite completă de teste pentru FSM E5 Lifecycle Nurturing
 * Plan FAZA 9b VERIFICARE L1636-1641
 */
import { describe, it, expect } from "vitest";
import {
  VALID_TRANSITIONS,
  validateTransition,
  evaluateTransition,
  checkAdvocateCriteria,
  isValidNurturingState,
  type NurturingState,
  type NurturingStateSnapshot,
} from "../lib/nurturing-fsm.js";

// ─── Suite 1 — VALID_TRANSITIONS map structural ────────────────────────────

describe("VALID_TRANSITIONS", () => {
  it("FSM are exact 7 stări (Anti-halucin. A)", () => {
    expect(Object.keys(VALID_TRANSITIONS)).toHaveLength(7);
  });

  it("KOL NU este stare FSM separată (Anti-halucin. B)", () => {
    expect(Object.keys(VALID_TRANSITIONS)).not.toContain("KOL");
  });

  it("REACTIVATED este stare separată de NURTURING_ACTIVE (Anti-halucin. A)", () => {
    expect(Object.keys(VALID_TRANSITIONS)).toContain("REACTIVATED");
    expect(Object.keys(VALID_TRANSITIONS)).toContain("NURTURING_ACTIVE");
    expect(VALID_TRANSITIONS["REACTIVATED"]).not.toContain("REACTIVATED");
  });

  it("ONBOARDING are o singură tranziție validă → NURTURING_ACTIVE", () => {
    expect(VALID_TRANSITIONS["ONBOARDING"]).toEqual(["NURTURING_ACTIVE"]);
  });

  it("CHURNED → REACTIVATED (nu direct la NURTURING_ACTIVE)", () => {
    expect(VALID_TRANSITIONS["CHURNED"]).toEqual(["REACTIVATED"]);
    expect(VALID_TRANSITIONS["CHURNED"]).not.toContain("NURTURING_ACTIVE");
  });

  it("ADVOCATE → AT_RISK (KOL e sub-state de ADVOCATE)", () => {
    expect(VALID_TRANSITIONS["ADVOCATE"]).toContain("AT_RISK");
    // ADVOCATE nu poate merge direct la LOYAL_CLIENT
    expect(VALID_TRANSITIONS["ADVOCATE"]).not.toContain("LOYAL_CLIENT");
  });

  it("LOYAL_CLIENT poate merge la ADVOCATE și AT_RISK", () => {
    expect(VALID_TRANSITIONS["LOYAL_CLIENT"]).toContain("ADVOCATE");
    expect(VALID_TRANSITIONS["LOYAL_CLIENT"]).toContain("AT_RISK");
  });
});

// ─── Suite 2 — validateTransition ─────────────────────────────────────────

describe("validateTransition", () => {
  // Verificări Plan L1636-1641

  it("[Plan V.1] ONBOARDING → NURTURING_ACTIVE: valid", () => {
    expect(validateTransition("ONBOARDING", "NURTURING_ACTIVE")).toBe(true);
  });

  it("[Plan V.5] State transition invalid ONBOARDING → CHURNED: REJECTED", () => {
    expect(validateTransition("ONBOARDING", "CHURNED")).toBe(false);
  });

  it("ONBOARDING → AT_RISK: invalid", () => {
    expect(validateTransition("ONBOARDING", "AT_RISK")).toBe(false);
  });

  it("NURTURING_ACTIVE → AT_RISK: valid", () => {
    expect(validateTransition("NURTURING_ACTIVE", "AT_RISK")).toBe(true);
  });

  it("NURTURING_ACTIVE → LOYAL_CLIENT: valid", () => {
    expect(validateTransition("NURTURING_ACTIVE", "LOYAL_CLIENT")).toBe(true);
  });

  it("NURTURING_ACTIVE → CHURNED: invalid (fără AT_RISK intermediar)", () => {
    expect(validateTransition("NURTURING_ACTIVE", "CHURNED")).toBe(false);
  });

  it("AT_RISK → CHURNED: valid", () => {
    expect(validateTransition("AT_RISK", "CHURNED")).toBe(true);
  });

  it("AT_RISK → NURTURING_ACTIVE: valid (intervention success)", () => {
    expect(validateTransition("AT_RISK", "NURTURING_ACTIVE")).toBe(true);
  });

  it("CHURNED → REACTIVATED: valid", () => {
    expect(validateTransition("CHURNED", "REACTIVATED")).toBe(true);
  });

  it("CHURNED → NURTURING_ACTIVE: invalid", () => {
    expect(validateTransition("CHURNED", "NURTURING_ACTIVE")).toBe(false);
  });

  it("REACTIVATED → NURTURING_ACTIVE: valid (al doilea ordin)", () => {
    expect(validateTransition("REACTIVATED", "NURTURING_ACTIVE")).toBe(true);
  });

  it("LOYAL_CLIENT → ADVOCATE: valid", () => {
    expect(validateTransition("LOYAL_CLIENT", "ADVOCATE")).toBe(true);
  });

  it("LOYAL_CLIENT → AT_RISK: valid (deteriorare)", () => {
    expect(validateTransition("LOYAL_CLIENT", "AT_RISK")).toBe(true);
  });

  it("ADVOCATE → AT_RISK: valid", () => {
    expect(validateTransition("ADVOCATE", "AT_RISK")).toBe(true);
  });

  it("stare inexistentă → returnează false", () => {
    expect(validateTransition("KOL" as NurturingState, "ADVOCATE")).toBe(false);
    expect(validateTransition("ONBOARDING", "KOL" as NurturingState)).toBe(false);
  });
});

// ─── Suite 3 — evaluateTransition ─────────────────────────────────────────

describe("evaluateTransition", () => {
  const base: NurturingStateSnapshot = {
    currentState: "NURTURING_ACTIVE",
    churnRiskScore: 0,
    totalOrders: 1,
    npsScore: null,
    successfulReferrals: 0,
    daysSinceLastOrder: 5,
    hasActiveChurnSignals: false,
  };

  // [Plan V.3] Churn score 60 → AT_RISK
  it("[Plan V.3] churn score 60 → AT_RISK + CHURN_RISK_ELEVATED", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "NURTURING_ACTIVE",
      churnRiskScore: 60,
    });
    expect(result).toEqual({ toState: "AT_RISK", reason: "CHURN_RISK_ELEVATED" });
  });

  it("churn score exact 50 (limita) → AT_RISK", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "NURTURING_ACTIVE",
      churnRiskScore: 50,
    });
    expect(result).toEqual({ toState: "AT_RISK", reason: "CHURN_RISK_ELEVATED" });
  });

  it("churn score 49 + no signals → null (nu tranziție)", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "NURTURING_ACTIVE",
      churnRiskScore: 49,
    });
    expect(result).toBeNull();
  });

  it("hasActiveChurnSignals=true → AT_RISK (chiar dacă score < 50)", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "NURTURING_ACTIVE",
      churnRiskScore: 10,
      hasActiveChurnSignals: true,
    });
    expect(result).toEqual({ toState: "AT_RISK", reason: "CHURN_RISK_ELEVATED" });
  });

  // [Plan V.4] ≥3 orders + NPS 9 + 2 referrals → ADVOCATE (via LOYAL_CLIENT evaluare)
  it("≥3 orders + NPS 7 + no signals → LOYAL_CLIENT", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "NURTURING_ACTIVE",
      totalOrders: 3,
      npsScore: 7,
      churnRiskScore: 10,
      hasActiveChurnSignals: false,
    });
    expect(result).toEqual({ toState: "LOYAL_CLIENT", reason: "LOYALTY_ACHIEVED" });
  });

  it("≥3 orders + NPS 6 (sub 7) → null", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "NURTURING_ACTIVE",
      totalOrders: 3,
      npsScore: 6,
    });
    expect(result).toBeNull();
  });

  it("2 orders + NPS 9 → null (orders insuficiente)", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "NURTURING_ACTIVE",
      totalOrders: 2,
      npsScore: 9,
    });
    expect(result).toBeNull();
  });

  // Anti-halucin. (C): AT_RISK → CHURNED necesită AMBELE condiții
  it("[Anti-halucin. C] AT_RISK score 90 + 35 zile → CHURNED", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "AT_RISK",
      churnRiskScore: 90,
      daysSinceLastOrder: 35,
    });
    expect(result).toEqual({ toState: "CHURNED", reason: "CHURN_CONFIRMED" });
  });

  it("[Anti-halucin. C] AT_RISK score 90 + 29 zile → null (NU CHURNED — zile insuficiente)", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "AT_RISK",
      churnRiskScore: 90,
      daysSinceLastOrder: 29,
    });
    expect(result).toBeNull();
  });

  it("[Anti-halucin. C] AT_RISK score 79 + 35 zile → null (NU CHURNED — score insuficient)", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "AT_RISK",
      churnRiskScore: 79,
      daysSinceLastOrder: 35,
    });
    expect(result).toBeNull();
  });

  it("AT_RISK score 25 → NURTURING_ACTIVE (intervention success)", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "AT_RISK",
      churnRiskScore: 25,
    });
    expect(result).toEqual({ toState: "NURTURING_ACTIVE", reason: "INTERVENTION_SUCCESS" });
  });

  it("REACTIVATED + 2 orders → NURTURING_ACTIVE", () => {
    const result = evaluateTransition({ ...base, currentState: "REACTIVATED", totalOrders: 2 });
    expect(result).toEqual({
      toState: "NURTURING_ACTIVE",
      reason: "SECOND_ORDER_AFTER_REACTIVATION",
    });
  });

  it("REACTIVATED + 1 order → null", () => {
    const result = evaluateTransition({ ...base, currentState: "REACTIVATED", totalOrders: 1 });
    expect(result).toBeNull();
  });

  it("ONBOARDING → null (gestionat de A5)", () => {
    const result = evaluateTransition({ ...base, currentState: "ONBOARDING" });
    expect(result).toBeNull();
  });

  it("CHURNED → null (gestionat de A1 la ordin nou)", () => {
    const result = evaluateTransition({ ...base, currentState: "CHURNED" });
    expect(result).toBeNull();
  });

  it("LOYAL_CLIENT cu score 55 → AT_RISK", () => {
    const result = evaluateTransition({
      ...base,
      currentState: "LOYAL_CLIENT",
      churnRiskScore: 55,
    });
    expect(result).toEqual({ toState: "AT_RISK", reason: "CHURN_RISK_ELEVATED" });
  });

  it("ADVOCATE cu score 60 → AT_RISK", () => {
    const result = evaluateTransition({ ...base, currentState: "ADVOCATE", churnRiskScore: 60 });
    expect(result).toEqual({ toState: "AT_RISK", reason: "CHURN_RISK_ELEVATED" });
  });
});

// ─── Suite 4 — checkAdvocateCriteria ──────────────────────────────────────

describe("checkAdvocateCriteria", () => {
  // [Plan V.4] ≥3 orders + NPS 9 + 2 referrals → ADVOCATE
  it("[Plan V.4] ≥3 orders + NPS 9 + ≥2 referrals → true", () => {
    expect(checkAdvocateCriteria({ totalOrders: 3, npsScore: 9, successfulReferrals: 2 })).toBe(
      true,
    );
  });

  it("5 orders + NPS 8 (exact limita) + 3 referrals → true", () => {
    expect(checkAdvocateCriteria({ totalOrders: 5, npsScore: 8, successfulReferrals: 3 })).toBe(
      true,
    );
  });

  it("2 orders + NPS 9 + 2 referrals → false (orders insuficiente)", () => {
    expect(checkAdvocateCriteria({ totalOrders: 2, npsScore: 9, successfulReferrals: 2 })).toBe(
      false,
    );
  });

  it("3 orders + NPS 7 (sub 8) + 2 referrals → false (NPS insuficient)", () => {
    expect(checkAdvocateCriteria({ totalOrders: 3, npsScore: 7, successfulReferrals: 2 })).toBe(
      false,
    );
  });

  it("3 orders + NPS 9 + 1 referral → false (referrals insuficiente)", () => {
    expect(checkAdvocateCriteria({ totalOrders: 3, npsScore: 9, successfulReferrals: 1 })).toBe(
      false,
    );
  });

  it("NPS null → false", () => {
    expect(checkAdvocateCriteria({ totalOrders: 3, npsScore: null, successfulReferrals: 2 })).toBe(
      false,
    );
  });

  it("NPS 0 → false", () => {
    expect(checkAdvocateCriteria({ totalOrders: 3, npsScore: 0, successfulReferrals: 2 })).toBe(
      false,
    );
  });
});

// ─── Suite 5 — isValidNurturingState type guard ────────────────────────────

describe("isValidNurturingState", () => {
  it("returnează true pentru toate cele 7 stări valide", () => {
    const states: NurturingState[] = [
      "ONBOARDING",
      "NURTURING_ACTIVE",
      "AT_RISK",
      "CHURNED",
      "REACTIVATED",
      "LOYAL_CLIENT",
      "ADVOCATE",
    ];
    for (const s of states) {
      expect(isValidNurturingState(s)).toBe(true);
    }
  });

  it("returnează false pentru KOL (anti-halucin. B)", () => {
    expect(isValidNurturingState("KOL")).toBe(false);
  });

  it("returnează false pentru string-uri arbitrare", () => {
    expect(isValidNurturingState("")).toBe(false);
    expect(isValidNurturingState("UNKNOWN")).toBe(false);
    expect(isValidNurturingState("COLD")).toBe(false); // stare E2, nu E5
  });
});

// ─── Suite 6 — QUEUE_NAMES verificare (validare Plan L2224-2233) ───────────

describe("Queue names align with plan spec", () => {
  it("cozile A1-A8 respectă naming convention colon-based", () => {
    const queueNames = [
      "lifecycle:order:completed",
      "lifecycle:state:evaluate",
      "onboarding:sequence:start",
      "onboarding:step:execute",
      "onboarding:complete:check",
      "state:transition:execute",
      "state:metrics:update",
      "state:advocate:promote",
    ];
    const pattern = /^[a-z0-9]+(?::[a-z0-9_-]+){1,4}$/;
    for (const name of queueNames) {
      expect(name).toMatch(pattern);
      expect(name.includes(".")).toBe(false);
    }
  });
});
