# ADR-0058: Head-of-Line Blocking Prevention

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** O coadă unică pentru 20 numere WhatsApp ar permite unui job blocat să oprească toate celelalte.

**Decision:** **20 cozi separate**, una per număr WhatsApp:

```text
q:wa:phone_01
q:wa:phone_02
...
q:wa:phone_20
```

Fiecare coadă are concurrency=1.

**Rationale:**

- Un număr blocat nu afectează celelalte
- Izolare completă per number
- Debugging mai ușor

**Consequences:**

- (+) Izolare perfectă între numere
- (+) Debugging și monitoring granular
- (-) 20 workers separați de monitorizat
- (-) Routing logic necesară
- (-) Mai multe conexiuni Redis
