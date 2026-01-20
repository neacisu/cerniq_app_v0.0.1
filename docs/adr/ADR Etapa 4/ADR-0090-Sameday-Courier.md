# ADR-0090: Sameday Courier Integration

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Logistica livrărilor necesită integrare cu servicii de curierat pentru AWB, tracking și COD.

**Decision:** Integrare **Sameday Courier** ca carrier principal:

- API pentru generare AWB
- Webhook pentru status updates
- COD collection tracking
- Return shipment support

**Consequences:**

- (+) Acoperire națională bună
- (+) API modern și documentat
- (+) Support pentru locker și pickup points
- (-) Single carrier dependency
- (-) Costuri variabile
