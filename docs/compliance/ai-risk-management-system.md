# Sistem de management al riscurilor AI (EU AI Act — Art. 9)

**Status:** document operațional — **nu** înlocuiește audit legal extern.  
**Deadline reglementare:** 2 august 2026 (conform planului intern).

## Domenii de risc (inventar tehnic)

| Domeniu | Componentă | Clasificare indicativă | Măsuri în produs |
| --- | --- | --- | --- |
| Scorare credit | E4 workers, Termene, modele euristice | Ridicat (Anexa III 5(b)) | HITL, audit, politici credit, documentație separată DPIA |
| Agent negociere | E3 reasoning/fast, guardrails | Limitat | Transparență UI, `audit_llm_calls`, LLM Guard |
| Sentiment / nurturing | E2, E5 | Limitat / minimal | Retenție, izolare tenant (RLS) |
| Embeddings | infraq qwen3-embedding, `halfvec(3072)` | Limitat (date procesate) | Fără fallback dimensiune incompatibilă (ADR-0109) |

## Proces

1. Identificare schimbări: PR + checklist risc în `docs/developer-guide/pr-adr-traceability.md`.  
2. Înregistrare incidente: `docs/compliance/ai-act-incident-reporting.md`.  
3. Revizuire periodică: trimestrială (owner produs + securitate).

## Legături

- [Matrice trasabilitate Art. 9–13](./ai-act-traceability-matrix.md)  
- [Documentație tehnică modele](./ai-technical-documentation-models.md)
