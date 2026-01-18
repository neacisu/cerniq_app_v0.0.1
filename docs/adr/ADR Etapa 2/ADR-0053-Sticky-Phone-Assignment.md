# ADR-0053: Sticky Phone Assignment

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Un lead trebuie să primească mesaje mereu de la același număr WhatsApp pentru continuitate conversațională.

**Decision:** **Sticky assignment**: La primul contact, lead-ul primește `assigned_phone_id` permanent.

```sql
assigned_phone_id UUID REFERENCES wa_phone_numbers(id)
```

**Rationale:**

- Consistență în conversație
- WhatsApp identifică chat-uri după sender
- Evită confuzie la prospect

**Consequences:**

- (+) Experiență consistentă pentru prospect
- (+) Istoricul conversației rămâne într-un singur chat
- (-) Load balancing inegal între numere
- (-) Necesită rebalancing dacă un număr e banat
- (-) Round-robin doar pentru assignment inițial
