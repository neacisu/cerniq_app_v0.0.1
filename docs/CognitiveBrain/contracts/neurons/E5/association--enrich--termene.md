<!-- neuron-contract:author-complete -->

# Neuron `association:enrich:termene`

> **Status:** audit manual **2026-04-13**. **v2** coadă `association:enrich:termene` (L8209–8229), familie `graph-community`. **Cod:** **fără** literal `association:enrich:termene` în `queue-registry.ts` sau în fișiere `.ts` (căutare `association:enrich:termene` / `members:link` în TS: zero). Cozi **Termene** în registry sunt prefix **`enrich:termene:*`** (ex. `enrich:termene:balance` — `workers/shared/src/queue-registry.ts` L44–47), servicii **E1 enrichment**, nu E5 `association:*`. **Bootstrap E5:** `workers/e5-nurturing/src/index.ts` pornește A1–A8, B9–B14, C15–C19 (L68–L91); G37–G42 **nu** sunt în `push()`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `association:enrich:termene` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/association--enrich--termene.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md); Termene E1: [association-ingest](../../adr/families/e5/association-ingest.md) (context ingest, nu coadă v2) |

## Scop în context real

**v2:** neuron `KnowledgeNeuron`, Non-AI, OTel `cognitive.association.enrich.termene`. **Runtime E5:** **gap** — niciun worker E5 cu acest nume; integrarea Termene pentru etapele 1+ este în alte pachete (`workers/enrichment` etc.), cu cozi `enrich:termene:*`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`association:enrich:termene\`` (L8209–8229).
- `workers/shared/src/queue-registry.ts` — constante `ENRICH_TERMENE_*` (L44–47); **fără** `association:enrich:termene`.
- `workers/e5-nurturing/src/index.ts` — bootstrap L68–L91 (fără G37–G42).
- `rg` `association:enrich:termene` în `*.ts` / `*.tsx`: **fără** rezultate (doar documentație).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8225).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** coadă sau `nodeKey` E5 cu acest nume. Existență separată: `enrich:termene:*` în registry (L44–47). | v2 **Confirmed queue field** (L8223). | Prefix `association:` v2 ≠ `enrich:termene:*` runtime. |
| 2 | Etapă, familie, swimlane | Cozi Termene mapate în alte etaje (enrichment), nu în worker E5 citit. | v2 E5, `graph-community` (L8211–8212). | Familie v2 E5 vs implementare E1. |
| 3 | Rol declarat | — | v2 descriere generică graph (L8220–8222). | Fără handler E5. |
| 4 | NeuronType + SOFAI | — | v2 `KnowledgeNeuron` (L8216). | Fără catalog entry pentru acest `nodeKey`. |
| 5 | Criticitate | — | v2 `MEDIUM` (L8218). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.association.enrich.termene` (L8228). | Fără `withCognitiveSpan` pentru acest nume în TS. |
| 7 | Înveliș politică | — | v2 L8226–8227. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo țintă ADR-0007. | — |
| 10 | Escaladare HITL | — | v2 L8227. | — |
| 11 | Micro-OODA | — | v2 L8224. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8219). | — |
| 13 | Stack v2 §2.3 (subset) | — | v2 §2.3 țintă platformă. | — |

### Mapare OTel

- **v2:** `cognitive.association.enrich.termene`.
- **Cod:** fără span verificat cu acest nume în repo (E5).

---
*Audit manual 2026-04-13; surse verificate în repo.*
