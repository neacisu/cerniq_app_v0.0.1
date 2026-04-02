/**
 * nurturing-fsm.ts — FSM Engine E5 Lifecycle Nurturing (Plan §X ADR-0098, FAZA 9b)
 *
 * FSM 7 stări (Anti-halucin. A):
 *   ONBOARDING → NURTURING_ACTIVE ↔ AT_RISK → CHURNED → REACTIVATED
 *                      ↓
 *               LOYAL_CLIENT → ADVOCATE
 *
 * Anti-halucin. (B): KOL NU este stare FSM separată — este sub-state de ADVOCATE,
 *   verificat prin metrici de centralitate (degree ≥5, betweenness ≥0.1, eigenvector ≥0.2).
 *
 * Anti-halucin. (C): AT_RISK → CHURNED necesită ATÂT churnRiskScore ≥ 80
 *   CÂT ȘI daysSinceLastOrder ≥ 30. Nu ajunge o singură condiție.
 *
 * DO NOT modify VALID_TRANSITIONS without updating ADR-0098.
 */

export type NurturingState =
  | "ONBOARDING"
  | "NURTURING_ACTIVE"
  | "AT_RISK"
  | "CHURNED"
  | "REACTIVATED"
  | "LOYAL_CLIENT"
  | "ADVOCATE";

/**
 * VALID_TRANSITIONS — EXACT din Plan §X L2237-2240 + ADR-0098
 * Cheie = stare curentă, Valoare = stări valide de destinație.
 */
export const VALID_TRANSITIONS: Readonly<Record<NurturingState, readonly NurturingState[]>> = {
  ONBOARDING: ["NURTURING_ACTIVE"],
  NURTURING_ACTIVE: ["AT_RISK", "LOYAL_CLIENT"],
  AT_RISK: ["CHURNED", "NURTURING_ACTIVE"],
  CHURNED: ["REACTIVATED"],
  REACTIVATED: ["NURTURING_ACTIVE"],
  LOYAL_CLIENT: ["ADVOCATE", "AT_RISK"],
  ADVOCATE: ["AT_RISK"], // KOL e sub-state de ADVOCATE — verificat prin centrality scores
} as const;

/**
 * Condiții de tranziție FSM — evaluate de A2 (lifecycle:state:evaluate)
 * Returnează starea de destinație dacă condiția e îndeplinită, sau null.
 */
export interface NurturingStateSnapshot {
  currentState: NurturingState;
  churnRiskScore: number;
  totalOrders: number;
  npsScore: number | null;
  successfulReferrals: number;
  daysSinceLastOrder: number | null;
  hasActiveChurnSignals: boolean;
}

export type TransitionReason =
  | "ONBOARDING_COMPLETE"
  | "CHURN_RISK_ELEVATED"
  | "INTERVENTION_SUCCESS"
  | "LOYALTY_ACHIEVED"
  | "CHURN_CONFIRMED"
  | "ORDER_REACTIVATION"
  | "SECOND_ORDER_AFTER_REACTIVATION"
  | "ADVOCATE_CRITERIA_MET";

export interface TransitionDecision {
  toState: NurturingState;
  reason: TransitionReason;
}

/**
 * validateTransition — validează o tranziție FSM.
 * Pure function, utilizată și de A6 pentru verificare la execuție.
 */
export function validateTransition(fromState: NurturingState, toState: NurturingState): boolean {
  const validNext = VALID_TRANSITIONS[fromState];
  if (!validNext) return false;
  return validNext.includes(toState);
}

/**
 * evaluateTransition — calculează tranziția de efectuat pe baza snapshot-ului.
 * Apelată de A2 (lifecycle:state:evaluate).
 * Returnează null dacă nu e nevoie de nicio tranziție.
 *
 * Anti-halucin. (C): AT_RISK → CHURNED necesită ATÂT score ≥ 80 CÂT ȘI zile ≥ 30.
 */
export function evaluateTransition(snapshot: NurturingStateSnapshot): TransitionDecision | null {
  const {
    currentState,
    churnRiskScore,
    totalOrders,
    npsScore,
    // successfulReferrals — used by checkAdvocateCriteria (A8), not here
    daysSinceLastOrder,
    hasActiveChurnSignals,
  } = snapshot;

  const isChurnRiskElevated = churnRiskScore >= 50 || hasActiveChurnSignals;

  switch (currentState) {
    case "NURTURING_ACTIVE":
      if (isChurnRiskElevated) {
        return { toState: "AT_RISK", reason: "CHURN_RISK_ELEVATED" };
      }
      if (totalOrders >= 3 && npsScore !== null && npsScore >= 7 && !hasActiveChurnSignals) {
        return { toState: "LOYAL_CLIENT", reason: "LOYALTY_ACHIEVED" };
      }
      return null;

    case "AT_RISK":
      // Anti-halucin. (C): AMBELE condiții necesare pentru → CHURNED
      if (churnRiskScore >= 80 && daysSinceLastOrder !== null && daysSinceLastOrder >= 30) {
        return { toState: "CHURNED", reason: "CHURN_CONFIRMED" };
      }
      if (churnRiskScore < 30) {
        return { toState: "NURTURING_ACTIVE", reason: "INTERVENTION_SUCCESS" };
      }
      return null;

    case "REACTIVATED":
      if (totalOrders >= 2) {
        return { toState: "NURTURING_ACTIVE", reason: "SECOND_ORDER_AFTER_REACTIVATION" };
      }
      return null;

    case "LOYAL_CLIENT":
    case "ADVOCATE":
      // → AT_RISK dacă score deteriorat (LOYAL_CLIENT și ADVOCATE au același comportament)
      if (isChurnRiskElevated) {
        return { toState: "AT_RISK", reason: "CHURN_RISK_ELEVATED" };
      }
      return null;

    // ONBOARDING → NURTURING_ACTIVE gestionat exclusiv de A5 (onboarding:complete:check)
    // CHURNED → REACTIVATED gestionat de A1 (lifecycle:order:completed) la primul ordin nou
    default:
      return null;
  }
}

/**
 * checkAdvocateCriteria — verifică dacă clientul îndeplinește criteriile de ADVOCATE.
 * Apelată de A8 (state:advocate:promote).
 * Plan: ≥3 orders AND npsScore ≥ 8 AND successfulReferrals ≥ 2
 */
export function checkAdvocateCriteria(
  snapshot: Pick<NurturingStateSnapshot, "totalOrders" | "npsScore" | "successfulReferrals">,
): boolean {
  const { totalOrders, npsScore, successfulReferrals } = snapshot;
  return totalOrders >= 3 && npsScore !== null && npsScore >= 8 && successfulReferrals >= 2;
}

/**
 * isValidNurturingState — type guard pentru NurturingState.
 */
export function isValidNurturingState(state: string): state is NurturingState {
  return Object.keys(VALID_TRANSITIONS).includes(state);
}
