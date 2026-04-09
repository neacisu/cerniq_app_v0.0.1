/**
 * Tranziții FSM `outreach.lead_journey` — sursă unică de adevăr pentru validare worker/API.
 * Stările trebuie să coincidă 1:1 cu `LEAD_JOURNEY_FSM_STATES` (@cerniq/db/schemas/lead-journey-fsm-states).
 */
import {
  LEAD_JOURNEY_FSM_STATES,
  type LeadJourneyFsmStateValue,
} from "@cerniq/db/schemas/lead-journey-fsm-states";

export type { LeadJourneyFsmStateValue } from "@cerniq/db/schemas/lead-journey-fsm-states";

/**
 * Hartă tranziții permise. Fiecare cheie ∈ LEAD_JOURNEY_FSM_STATES; fiecare țintă ∈ aceeași listă.
 * Reguli: fără salturi arbitrare (ex. COLD→CONVERTED); CONVERTED→post-vânzare; CHURNED→revival controlat;
 * NURTURING_ACTIVE→CHURNED interzis (trecere prin AT_RISK, ca în nurturing-fsm E5).
 */
export const VALID_TRANSITIONS: Readonly<
  Record<LeadJourneyFsmStateValue, readonly LeadJourneyFsmStateValue[]>
> = {
  COLD: ["CONTACTED_WA", "CONTACTED_EMAIL", "CONTACTED_PHONE", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  CONTACTED_WA: [
    "WARM_REPLY",
    "ENGAGED",
    "CONTACTED_EMAIL",
    "CONTACTED_PHONE",
    "DEAD",
    "DO_NOT_CONTACT",
    "PAUSED",
  ],
  CONTACTED_EMAIL: [
    "WARM_REPLY",
    "ENGAGED",
    "CONTACTED_WA",
    "CONTACTED_PHONE",
    "DEAD",
    "DO_NOT_CONTACT",
    "PAUSED",
  ],
  CONTACTED_PHONE: [
    "WARM_REPLY",
    "ENGAGED",
    "CONTACTED_WA",
    "CONTACTED_EMAIL",
    "DEAD",
    "DO_NOT_CONTACT",
    "PAUSED",
  ],
  WARM_REPLY: ["NEGOTIATION", "ENGAGED", "PROPOSAL", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  ENGAGED: ["NEGOTIATION", "PROPOSAL", "WARM_REPLY", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  NEGOTIATION: [
    "PROPOSAL",
    "CLOSING",
    "CONVERTED",
    "WARM_REPLY",
    "DEAD",
    "DO_NOT_CONTACT",
    "PAUSED",
  ],
  PROPOSAL: ["NEGOTIATION", "CLOSING", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  CLOSING: ["CONVERTED", "NEGOTIATION", "PROPOSAL", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  CONVERTED: ["ONBOARDING", "NURTURING_ACTIVE"],
  ONBOARDING: ["NURTURING_ACTIVE", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  NURTURING_ACTIVE: ["AT_RISK", "LOYAL_ADVOCATE", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  AT_RISK: ["CHURNED", "NURTURING_ACTIVE", "LOYAL_ADVOCATE", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  LOYAL_ADVOCATE: ["AT_RISK", "NURTURING_ACTIVE", "CHURNED", "DEAD", "DO_NOT_CONTACT", "PAUSED"],
  CHURNED: ["COLD", "ONBOARDING"],
  DEAD: ["COLD", "DO_NOT_CONTACT"],
  DO_NOT_CONTACT: [],
  PAUSED: ["COLD", "WARM_REPLY", "NEGOTIATION", "ENGAGED", "NURTURING_ACTIVE", "CONTACTED_WA"],
};

/** Verificare la load: fiecare stare din enum are intrare în hartă și țintele sunt valide. */
function assertTransitionMapComplete(): void {
  for (const s of LEAD_JOURNEY_FSM_STATES) {
    const row = VALID_TRANSITIONS[s];
    if (!row) throw new Error(`[lead-fsm] Missing VALID_TRANSITIONS entry for state ${s}`);
    const allowed = LEAD_JOURNEY_FSM_STATES as readonly string[];
    for (const t of row) {
      if (!allowed.includes(t)) {
        throw new Error(`[lead-fsm] Invalid target state ${t} from ${s}`);
      }
    }
  }
}

assertTransitionMapComplete();

/** Verificare că `s` este o stare canonică FSM (înainte de persistare DB / după validare tranziție). */
export function isLeadJourneyFsmStateValue(s: string): s is LeadJourneyFsmStateValue {
  return (LEAD_JOURNEY_FSM_STATES as readonly string[]).includes(s);
}

export function validateTransition(fromState: string, toState: string): boolean {
  const validNext = VALID_TRANSITIONS[fromState as LeadJourneyFsmStateValue];
  if (!validNext) return false;
  return (validNext as readonly string[]).includes(toState);
}

/** Tranziții permise din `fromState` (gol dacă starea nu e în FSM). */
export function listValidNextStates(fromState: string): readonly string[] {
  const row = VALID_TRANSITIONS[fromState as LeadJourneyFsmStateValue];
  return row ?? [];
}
