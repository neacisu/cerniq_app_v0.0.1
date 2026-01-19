# ADR-0074: Stock Reservation cu TTL

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Când AI oferă un produs, trebuie garantat că stocul există. Între ofertă și acceptare pot trece ore/zile.

**Decision:** **Rezervare temporară** cu TTL (Time-To-Live):

| Stage | TTL |
|-------|-----|
| PROPOSAL | 30 min |
| NEGOTIATION | 2 ore |
| CLOSING | 24 ore |

**Implementation:**

- `reserveStock(sku, qty, negotiationId, stage)` — Creează rezervare cu TTL
- `cleanupExpiredReservations()` — Cron la fiecare 5 min
- `getAvailableStock(sku)` = inventory - active_reservations

**Consequences:**

- (+) Previne overselling
- (+) Eliberare automată stoc nefolosit
- (+) Vizibilitate rezervări în progres
