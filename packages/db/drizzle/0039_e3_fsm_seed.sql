-- =============================================================================
-- 0039_e3_fsm_seed.sql — Faza 7a (E3): Date seed FSM negociere
-- Depinde de: 0035_e3_tables.sql (tabele fsm_valid_transitions, fsm_state_allowed_tools)
--
-- FSM Negociere: 7 stări + 17 tranziții valide
-- Stări: DISCOVERY, PROPOSAL, NEGOTIATION, CLOSING, PROFORMA_SENT, INVOICED, PAID, DEAD
--
-- Structura celor 17 tranziții:
--   Forward (6):      DISCOVERY→PROPOSAL, PROPOSAL→NEGOTIATION, NEGOTIATION→CLOSING,
--                     CLOSING→PROFORMA_SENT, PROFORMA_SENT→INVOICED, INVOICED→PAID
--   Backtrack (3):    NEGOTIATION→PROPOSAL, CLOSING→NEGOTIATION, PROPOSAL→DISCOVERY
--   DEAD din orice(7): DISCOVERY→DEAD, PROPOSAL→DEAD, NEGOTIATION→DEAD,
--                      CLOSING→DEAD, PROFORMA_SENT→DEAD, INVOICED→DEAD, PAID→DEAD
--   Reopen (1):       DEAD→DISCOVERY (cu HITL approval — requires_role=manager)
-- =============================================================================

DO $$
DECLARE
  -- FSM type
  c_fsm   CONSTANT TEXT := 'negotiation';

  -- Stări FSM
  c_disc  CONSTANT TEXT := 'DISCOVERY';
  c_prop  CONSTANT TEXT := 'PROPOSAL';
  c_neg   CONSTANT TEXT := 'NEGOTIATION';
  c_clos  CONSTANT TEXT := 'CLOSING';
  c_pfrs  CONSTANT TEXT := 'PROFORMA_SENT';
  c_inv   CONSTANT TEXT := 'INVOICED';
  c_paid  CONSTANT TEXT := 'PAID';
  c_dead  CONSTANT TEXT := 'DEAD';

  -- Roluri
  c_mgr   CONSTANT TEXT := 'manager';

  -- MCP Tools
  c_t_srch CONSTANT TEXT := 'search_products';
  c_t_stck CONSTANT TEXT := 'check_realtime_stock';
  c_t_disc CONSTANT TEXT := 'calculate_discount';
  c_t_pfra CONSTANT TEXT := 'create_proforma';
  c_t_cinv CONSTANT TEXT := 'convert_to_invoice';
  c_t_einv CONSTANT TEXT := 'send_einvoice';

BEGIN

  -- =========================================================================
  -- fsm_valid_transitions — 17 rânduri (negociere B2B)
  -- =========================================================================
  INSERT INTO gold.fsm_valid_transitions (fsm_type, from_state, to_state, requires_role)
  VALUES

    -- FLUX FORWARD (6 tranziții)

    -- DISCOVERY → PROPOSAL: AI sau agent deschide o propunere
    (c_fsm, c_disc, c_prop, NULL),

    -- PROPOSAL → NEGOTIATION: clientul acceptă propunerea
    (c_fsm, c_prop, c_neg,  NULL),

    -- NEGOTIATION → CLOSING: termenii sunt agreați
    (c_fsm, c_neg,  c_clos, NULL),

    -- CLOSING → PROFORMA_SENT: manager emite proforma via Oblio (G39)
    (c_fsm, c_clos, c_pfrs, c_mgr),

    -- PROFORMA_SENT → INVOICED: manager convertește proforma în factură (G41)
    (c_fsm, c_pfrs, c_inv,  c_mgr),

    -- INVOICED → PAID: manager confirmă plata
    (c_fsm, c_inv,  c_paid, c_mgr),

    -- BACKTRACK (3 tranziții) — renegociere sau informații suplimentare

    -- NEGOTIATION → PROPOSAL: clientul vrea revizia propunerii
    (c_fsm, c_neg,  c_prop, NULL),

    -- CLOSING → NEGOTIATION: termenii nu sunt finalizați
    (c_fsm, c_clos, c_neg,  NULL),

    -- PROPOSAL → DISCOVERY: clientul are nevoie de mai multe informații
    (c_fsm, c_prop, c_disc, NULL),

    -- TERMINARE FORȚATĂ → DEAD (7 tranziții, orice → DEAD)

    -- DISCOVERY → DEAD: lead dezinteresat sau timeout 7d
    (c_fsm, c_disc, c_dead, NULL),

    -- PROPOSAL → DEAD: propunere respinsă sau timeout 7d
    (c_fsm, c_prop, c_dead, NULL),

    -- NEGOTIATION → DEAD: negociere eșuată sau timeout 30d
    (c_fsm, c_neg,  c_dead, NULL),

    -- CLOSING → DEAD: tranzacție anulată sau timeout 14d
    (c_fsm, c_clos, c_dead, NULL),

    -- PROFORMA_SENT → DEAD: proformă expirată sau anulată (timeout 30d)
    (c_fsm, c_pfrs, c_dead, NULL),

    -- INVOICED → DEAD: factură anulată (necesită HITL în G42)
    (c_fsm, c_inv,  c_dead, NULL),

    -- PAID → DEAD: rambursare / dispută post-plată
    (c_fsm, c_paid, c_dead, NULL),

    -- REACTIVARE (1 tranziție)

    -- DEAD → DISCOVERY: reactivare cu HITL manager approval (D25, max 90 zile)
    (c_fsm, c_dead, c_disc, c_mgr)

  ON CONFLICT (fsm_type, from_state, to_state) DO NOTHING;

  -- =========================================================================
  -- fsm_state_allowed_tools — MCP tools permise per stare
  -- Tools: search_products, check_realtime_stock, calculate_discount,
  --        create_proforma, convert_to_invoice, send_einvoice
  -- =========================================================================
  INSERT INTO gold.fsm_state_allowed_tools (fsm_type, state, tool_name)
  VALUES

    -- DISCOVERY: cercetare produse + verificare disponibilitate inițială
    (c_fsm, c_disc, c_t_srch),
    (c_fsm, c_disc, c_t_stck),

    -- PROPOSAL: creare propunere completă cu prețuri și disponibilitate
    (c_fsm, c_prop, c_t_srch),
    (c_fsm, c_prop, c_t_stck),
    (c_fsm, c_prop, c_t_disc),
    (c_fsm, c_prop, c_t_pfra),

    -- NEGOTIATION: negociere activă — toate tool-urile disponibile
    (c_fsm, c_neg,  c_t_srch),
    (c_fsm, c_neg,  c_t_stck),
    (c_fsm, c_neg,  c_t_disc),
    (c_fsm, c_neg,  c_t_pfra),

    -- CLOSING: finalizare termeni — discount final și proforma finală
    (c_fsm, c_clos, c_t_disc),
    (c_fsm, c_clos, c_t_pfra),

    -- PROFORMA_SENT: conversie proformă → factură
    (c_fsm, c_pfrs, c_t_cinv),

    -- INVOICED: trimitere eFactura SPV ANAF
    (c_fsm, c_inv,  c_t_einv)

    -- PAID: stare terminală pozitivă — niciun tool activ
    -- DEAD: stare terminală negativă — niciun tool activ

  ON CONFLICT (fsm_type, state, tool_name) DO NOTHING;

END;
$$;
