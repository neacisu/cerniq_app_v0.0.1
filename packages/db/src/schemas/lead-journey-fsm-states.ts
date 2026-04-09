/**
 * Stări canonice pentru `outreach.lead_journey.current_state` / `previous_state`.
 * Sursă: contract API `apps/web/src/lib/etapa1-api.ts` (`transitionGoldCompany.toState`)
 * + plan cognitiv FSM E2–E5; aliniat ADR-0062 (extins).
 *
 * Ordinea este păstrată stabilă; migrațiile PG adaugă valori în aceeași ordine logică.
 */
export const LEAD_JOURNEY_FSM_STATES = [
  "COLD",
  "CONTACTED_WA",
  "CONTACTED_EMAIL",
  "CONTACTED_PHONE",
  "WARM_REPLY",
  "ENGAGED",
  "NEGOTIATION",
  "PROPOSAL",
  "CLOSING",
  "CONVERTED",
  "ONBOARDING",
  "NURTURING_ACTIVE",
  "AT_RISK",
  "LOYAL_ADVOCATE",
  "CHURNED",
  "DEAD",
  "DO_NOT_CONTACT",
  "PAUSED",
] as const;

export type LeadJourneyFsmStateValue = (typeof LEAD_JOURNEY_FSM_STATES)[number];
