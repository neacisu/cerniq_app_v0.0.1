# ADR-0095: Oblio Stock Sync Strategy

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Stocul trebuie sincronizat bidirecțional între Cerniq și Oblio (sistemul de facturare).

**Decision:** **Periodic sync** cu reservation system:

- Sync from Oblio: */15min cron
- Reserve on order create
- Deduct on delivery confirmation
- Release on cancel

**Consequences:**

- (+) Eventual consistency acceptabilă
- (+) Low API usage
- (+) Clear reservation model
- (-) 15min delay în stock visibility
- (-) Potential oversell în peak
