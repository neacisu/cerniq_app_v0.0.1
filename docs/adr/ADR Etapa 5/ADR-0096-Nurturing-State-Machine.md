# ADR-0096: Nurturing State Machine Design

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Clienții post-conversie necesită tracking al ciclului de viață cu tranziții automate și manuale.

**Decision:** Adoptăm **finite state machine** cu 7 stări:

```text
ONBOARDING → NURTURING_ACTIVE ↔ AT_RISK → CHURNED → REACTIVATED
                   ↓
            LOYAL_CLIENT → ADVOCATE
```

**Transitions:** Bazate pe reguli și AI scoring.

**Consequences:**

- (+) Tranziții clare și auditabile
- (+) Permite atât automation cât și HITL override
- (-) Complexity în edge cases
