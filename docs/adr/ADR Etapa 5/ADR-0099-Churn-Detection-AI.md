# ADR-0099: Churn Detection via Multi-Signal AI

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Detectarea timpurie a riscului de churn necesită analiză multi-dimensională.

**Decision:** **Multi-signal weighted scoring** cu:

- LLM sentiment analysis pe conversații
- Rule-based signals (payment delays, order frequency)
- Behavioral decay patterns

**Formula:** `ChurnScore = Σ(signal_strength × weight × confidence)`

**Consequences:**

- (+) Detectare proactivă înainte de churn efectiv
- (-) Cost LLM pentru sentiment analysis
- (-) Necesită calibrare periodică a weights
