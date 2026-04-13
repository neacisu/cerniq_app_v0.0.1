<!-- neuron-contract:author-complete -->

# Neuron `graph:full:built_at`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:full:built_at` (L8410–8430). **Cod:** **fără** acest literal în `queue-registry.ts` sau în `*.ts` (căutare: zero). Timestamp-uri de build pot exista ca date în DB sau loguri — **nu** sunt expuse ca neuron/coadă în evidențele citite. **Bootstrap:** D20–D24 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:full:built_at` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--full--built_at.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** metadată temporală pentru graf complet. **Runtime:** **gap** coadă/span dedicat.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8410–8430).
- `workers/shared/src/queue-registry.ts` — cozi graph D20–D24 (L555–563); **fără** `graph:full:built_at`.
- `rg` `graph:full:built_at` / `built_at` în cozi E5: **fără** în TS.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8426).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** coadă. | v2 L8424. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5 / `graph-community` (L8412–8413). | — |
| 3 | Rol declarat | — | v2 generic (L8421–8423). | — |
| 4 | NeuronType + SOFAI | — | v2 `KnowledgeNeuron` (L8417). | — |
| 5 | Criticitate | — | v2 `MEDIUM` (L8419). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.graph.full.built_at` (L8429). | — |
| 7 | Înveliș politică | — | v2 L8427–8428. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L8428. | — |
| 11 | Micro-OODA | — | v2 L8425. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8420). | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.full.built_at`.
- **Cod:** fără span verificat.

---
*Audit manual 2026-04-13; surse verificate în repo.*
