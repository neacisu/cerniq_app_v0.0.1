<!-- neuron-contract:author-complete -->

# Neuron `graph:path:find`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:path:find` (L8501–8521). **Cod:** **fără** acest literal în `queue-registry.ts` sau în `*.ts` (căutare `graph:path` / `path:find`: zero). **Bootstrap E5:** `workers/e5-nurturing/src/index.ts` pornește doar A1–A8, B9–B14, C15–C19 (L68–L91); D20–D24, G37–G42, J52+ **nu** sunt în `push()` la data auditului.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:path:find` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--path--find.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** căutare drum în graf. **Runtime:** **gap** — niciun worker E5 înregistrat cu acest contract în cozi citite.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8501–8521).
- `workers/shared/src/queue-registry.ts` — D20–D24 (L555–563); **fără** `graph:path:find`.
- `rg` `graph:path:find` în `*.ts`: **fără**.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8517).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** coadă. | v2 L8515. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5 / `graph-community` (L8503–8504). | — |
| 3 | Rol declarat | — | v2 generic (L8512–8514). | — |
| 4 | NeuronType + SOFAI | — | v2 `KnowledgeNeuron` (L8508). | — |
| 5 | Criticitate | — | v2 `MEDIUM` (L8510). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.graph.path.find` (L8520). | — |
| 7 | Înveliș politică | — | v2 L8518–8519. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8519. | — |
| 11 | Micro-OODA | — | v2 L8516. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8511). | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.path.find`.
- **Cod:** fără span verificat.

---
*Audit manual 2026-04-13; surse verificate în repo.*
