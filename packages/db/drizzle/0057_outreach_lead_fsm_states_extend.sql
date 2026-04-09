-- Extinde current_state_enum pentru outreach.lead_journey — aliniat LEAD_JOURNEY_FSM_STATES (packages/db).
-- Valorile existente: COLD, CONTACTED_WA, CONTACTED_EMAIL, WARM_REPLY, NEGOTIATION, CONVERTED, DEAD, PAUSED

ALTER TYPE current_state_enum ADD VALUE 'CONTACTED_PHONE';
ALTER TYPE current_state_enum ADD VALUE 'ENGAGED';
ALTER TYPE current_state_enum ADD VALUE 'PROPOSAL';
ALTER TYPE current_state_enum ADD VALUE 'CLOSING';
ALTER TYPE current_state_enum ADD VALUE 'ONBOARDING';
ALTER TYPE current_state_enum ADD VALUE 'NURTURING_ACTIVE';
ALTER TYPE current_state_enum ADD VALUE 'AT_RISK';
ALTER TYPE current_state_enum ADD VALUE 'LOYAL_ADVOCATE';
ALTER TYPE current_state_enum ADD VALUE 'CHURNED';
ALTER TYPE current_state_enum ADD VALUE 'DO_NOT_CONTACT';
