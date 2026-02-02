# ADR-0067: Phone Health Monitoring

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Numerele WhatsApp pot deveni offline sau banned fără notificare.

**Decision:** **Health check periodic** (every 10 min):

- Ping TimelinesAI pentru status
- Verificare last_activity
- Alert dacă offline > 30 min

**Rationale:**

- Detectare rapidă a problemelor
- Realocare automată posibilă
- Dashboard status în timp real

**Consequences:**

- (+) Detectare rapidă probleme numere
- (+) Dashboard real-time status
- (-) API calls suplimentare
- (-) Posibile false alarms
- (-) Necesită escalation path
