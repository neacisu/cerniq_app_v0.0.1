# ADR-0062: Lead State Machine

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Un lead trece prin multiple stări în procesul de outreach.

**Decision:** **Finite State Machine** cu tranziții valide:

```text
COLD → CONTACTED_WA | CONTACTED_EMAIL
CONTACTED_* → WARM_REPLY | DEAD
WARM_REPLY → NEGOTIATION | DEAD
NEGOTIATION → CONVERTED | DEAD
```

**Rationale:**

- Tranziții predictibile
- Audit trail complet
- Previne stări invalide

**Consequences:**

- (+) Tranziții clare și predictibile
- (+) Audit trail complet al journey-ului
- (-) Validare la fiecare tranziție
- (-) Rollback imposibil (design decision)
- (-) Necesită handlers pentru edge cases
