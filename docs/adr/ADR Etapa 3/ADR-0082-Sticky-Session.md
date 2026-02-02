# ADR-0082: Sticky Session pentru Negociere

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Pentru continuitate conversațională, același număr WhatsApp trebuie folosit pe toată negocierea, contextul MCP trebuie păstrat între mesaje.

**Decision:** **Sticky Session** bazat pe negotiation_id:

**Session Components:**

- `negotiationId` — ID negociere activă
- `leadId` — Lead-ul asociat
- `assignedPhoneId` — Număr WhatsApp alocat (din Etapa 2)
- `mcpSessionId` — Sesiune MCP (30 min TTL în Redis)
- `lastActivityAt` — Timestamp ultimă activitate

**Flow:** `getOrCreateSession(leadId)` — Caută negociere activă sau creează una nouă.

**Consequences:**

- (+) Continuitate conversațională garantată
- (+) Context MCP păstrat
- (+) Ușor de debug per sesiune
