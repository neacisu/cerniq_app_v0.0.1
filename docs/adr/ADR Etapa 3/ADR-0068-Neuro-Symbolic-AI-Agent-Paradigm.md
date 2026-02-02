# ADR-0068: Paradigmă Neuro-Simbolică pentru AI Agent

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Etapa 3 introduce un agent AI capabil să negocieze și să emită documente fiscale. Riscul principal: halucinațiile LLM pot genera prețuri incorecte, stocuri fantomă sau date fiscale eronate.

**Decision:** Adoptăm paradigma **Neuro-Simbolică** care combină:

1. **Componenta Neurală (LLM):** Înțelegere limbaj natural, generare răspunsuri, extracție intenții
2. **Componenta Simbolică (Guardrails):** Validare deterministă preț vs database, verificare stoc în timp real, constrângeri discount pe bază de reguli, validare date fiscale

**Rationale:**

- LLM-only cu prompt engineering nu garantează acuratețe 100%
- Rule-based chatbot lipsește flexibilitatea conversațională
- Paradigma neuro-simbolică oferă cel mai bun echilibru

**Consequences:**

- (+) Zero halucinații pentru date critice (preț, stoc, fiscal)
- (+) Trasabilitate completă a deciziilor
- (+) Compliance cu reglementările fiscale românești
- (-) Complexitate arhitecturală crescută
- (-) Latență adițională (~50-100ms per guardrail)
- (-) Cost development mai mare
