# ADR-0061: Sentiment-Based Routing

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Răspunsurile negative sau ambigue necesită intervenție umană.

**Decision:** AI Sentiment Analysis cu routing:

- **Score ≥ 50**: Auto-reply cu AI
- **Score 0-49**: Human review queue
- **Score < 0**: Immediate human takeover

**Rationale:**

- AI poate gestiona răspunsuri pozitive
- Negativ necesită touch uman
- Reducere workload pentru operatori

**Consequences:**

- (+) Automatizare pentru răspunsuri pozitive
- (+) Reducere workload operatori
- (-) Cost LLM per mesaj (~$0.01)
- (-) Latență adăugată pentru analiză
- (-) False positives posibile
