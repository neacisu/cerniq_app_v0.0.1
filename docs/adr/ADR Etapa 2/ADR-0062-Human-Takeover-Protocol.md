# ADR-0062: Human Takeover Protocol

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Operatorii trebuie să poată prelua conversații de la AI.

**Decision:** **Takeover flags în gold_lead_journey**:

```sql
requires_human_review BOOLEAN DEFAULT FALSE
human_review_reason TEXT
assigned_to_user UUID REFERENCES users(id)
is_human_controlled BOOLEAN DEFAULT FALSE
```

**Rationale:**

- Tranziție clară AI → Human
- Atribuire explicită
- Return to AI posibil

**Consequences:**

- (+) Tranziție clară între AI și Human
- (+) Atribuire și tracking explicit
- (-) UI pentru review queue
- (-) Notification system
- (-) SLA pentru response time
