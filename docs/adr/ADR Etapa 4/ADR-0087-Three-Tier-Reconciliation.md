# ADR-0087: Three-Tier Payment Reconciliation

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Plățile primite necesită matching cu facturile emise. Matching-ul exact nu este întotdeauna posibil.

**Decision:** Implementăm reconciliere în trei trepte:

| Tier | Metodă | Criterii |
| ---- | ------ | -------- |
| Tier 1 | Exact Match | Referință factură exactă + sumă ±0.01 |
| Tier 2 | Fuzzy Match | Sumă ±5% + fuzzy name matching ≥85% |
| Tier 3 | HITL | Candidați prezentați operatorului |

**Consequences:**

- (+) Automatizare maximă pentru cazuri clare
- (+) Escalare graduală
- (+) Audit trail complet
- (-) Complexitate implementare
- (-) Posibile false positives la fuzzy
