<!-- neuron-contract:author-complete -->

# Neuron `graph:relationship:infer`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:relationship:infer` (L8545–8565). **Cod:** **fără** acest literal în registry. **Apropiere:** **`cluster:implicit:detect`** (D24) — comunități implicite pe muchii NEIGHBOR/BEHAVIORAL_CLUSTER + Leiden rezoluție 1.5 (`d24-cluster-implicit-detect.ts` L39–40, L67–71 span `e5:cluster:implicit-detect`). **Nu** este o rutină „infer edge” izolată; este detecție cluster. **Bootstrap:** D24 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:relationship:infer` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--relationship--infer.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** inferență relații. **Runtime:** D24 deduce structuri implicite din graf existent, semantică înrudită dar **nu** echivalent 1:1.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8545–8565).
- `packages/shared/src/cognitive-node-catalog.ts` — D24 `e5:cluster:implicit-detect` (L2973–2980).
- `workers/shared/src/queue-registry.ts` — `E5_CLUSTER_IMPLICIT_DETECT` (L563).
- `workers/e5-nurturing/src/workers/d24-cluster-implicit-detect.ts` — `withCognitiveSpan("e5:cluster:implicit-detect", …)` (L71); tipuri relații L39–40.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8561).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`cluster:implicit:detect`**. **Fără** `graph:relationship:infer`. | v2 L8559. | Nume și verb diferite. |
| 2 | Etapă, familie, swimlane | `AssociativeNeuron`, **`graph-community`** (L2977–2978). | v2 L8547–8548. | — |
| 3 | Rol declarat | Clustere implicite, Leiden, filtre tip relație (antet D24). | v2 generic (L8556–8558). | — |
| 4 | NeuronType + SOFAI | `AssociativeNeuron` (L2977). | v2 `KnowledgeNeuron` (L8552). | **Divergență tip.** |
| 5 | Criticitate | `MEDIUM` (L2980). | v2 `MEDIUM` (L8554). | — |
| 6 | Înveliș telemetrie | `e5:cluster:implicit-detect` (L71). | v2 `cognitive.graph.relationship.infer` (L8564). | — |
| 7 | Înveliș politică | — | v2 L8562–8563. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Timeout subprocess D24 (antet L36–37). | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8563. | — |
| 11 | Micro-OODA | Citire fișier graf → Leiden → UPSERT clustere. | v2 L8560. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8555). | — |
| 13 | Stack v2 §2.3 (subset) | Python Leiden client (`runLeidenImplicitDetect`). | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.relationship.infer`.
- **Cod:** `e5:cluster:implicit-detect`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
