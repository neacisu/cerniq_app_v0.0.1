# ADR-0070: Negotiation Finite State Machine

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Negocierile trebuie să urmeze un flux logic. AI nu trebuie să sară peste etape, să ofere discount în discovery, sau să emită factură fără proforma.

**Decision:** **FSM (Finite State Machine)** cu stări și tranziții validate:

| State | Allowed Tools | Next States |
|-------|---------------|-------------|
| DISCOVERY | search_products, get_catalog | PROPOSAL, DEAD |
| PROPOSAL | get_product_details, check_stock | NEGOTIATION, DEAD |
| NEGOTIATION | calculate_discount, check_stock | CLOSING, DEAD |
| CLOSING | validate_client, create_proforma | PROFORMA_SENT, NEGOTIATION, DEAD |
| PROFORMA_SENT | track_proforma, resend | INVOICED, NEGOTIATION, DEAD |
| INVOICED | convert_to_invoice, send_einvoice | PAID, DEAD |
| PAID | — (final) | — |
| DEAD | — (resurrect) | DISCOVERY |

**Enforcement:** `validateToolCall()` verifică că tool-ul e permis în starea curentă.

**Consequences:**

- (+) Previne erori de flux
- (+) Audit trail complet al tranzițiilor
- (+) Ușor de extins cu noi stări
