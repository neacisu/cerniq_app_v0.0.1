<!-- neuron-contract:author-complete -->

# Neuron `graph:full:metrics`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:full:metrics` (L8454–8474). **Cod:** **fără** coadă cu acest nume în `queue-registry.ts`. Metrici Prometheus pentru etapa graph există în **`workers/e5-nurturing/src/lib/e5-metrics.ts`**: `cerniq_e5_graph_build_seconds` (L107), `cerniq_e5_leiden_python_seconds` (L121), `cerniq_e5_kol_profiles_total` (L134), `cerniq_e5_etapa5_graph_build_seconds` (L404–406), plus gauge comunități (L147+). Acestea **instrumentează** worker-ii D20–D23, **nu** înlocuiesc un neuron `graph:full:metrics`. **Bootstrap:** D20–D24 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:full:metrics` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--full--metrics.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** agregat metrici pentru graf complet. **Runtime:** observabilitate parțială prin histogramme/gauge-uri E5; **fără** procesor/coadă dedicată cu numele v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8454–8474).
- `workers/e5-nurturing/src/lib/e5-metrics.ts` — L103–147, L400–406.
- `workers/shared/src/queue-registry.ts` — **fără** `graph:full:metrics`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8470).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** coadă. Există **metrici** `cerniq_e5_*` în `e5-metrics.ts`. | v2 L8468. | Metrici ≠ neuron coadă. |
| 2 | Etapă, familie, swimlane | Metrici folosite în D20–D23 (importuri în fișierele worker). | v2 `graph-community` (L8456–8457). | — |
| 3 | Rol declarat | Durată build graph, Leiden, profiluri KOL (comentarii L103–134). | v2 generic (L8465–8467). | — |
| 4 | NeuronType + SOFAI | — | v2 `KnowledgeNeuron` (L8461). | — |
| 5 | Criticitate | — | v2 `MEDIUM` (L8463). | — |
| 6 | Înveliș telemetrie | OTel span-uri pe worker-ii D*; **fără** span numit `graph.full.metrics`. | v2 `cognitive.graph.full.metrics` (L8473). | — |
| 7 | Înveliș politică | — | v2 L8471–8472. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8472. | — |
| 11 | Micro-OODA | — | v2 L8469. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8464). | — |
| 13 | Stack v2 §2.3 (subset) | Prometheus client în `e5-metrics.ts`. | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.full.metrics`.
- **Cod:** fără span cu acest nume; metrici Prometheus dedicate etapei graph în `e5-metrics.ts`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
