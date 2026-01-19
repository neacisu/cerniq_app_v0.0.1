# ADR-0094: Real-Time Dashboard via WebSocket

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Dashboard-ul necesită actualizări în timp real pentru KPIs și alerte.

**Decision:** **WebSocket + Redis Pub/Sub** pentru real-time updates:

- Socket.io pentru WebSocket management
- Redis channels pentru event distribution
- Optimistic updates în UI
- Fallback polling la 30s pentru reliability

**Consequences:**

- (+) UX responsive
- (+) Reduce server load vs polling
- (+) Instant alerts
- (-) Complexitate infrastructure
- (-) Connection management
