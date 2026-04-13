<!-- neuron-contract:author-complete -->

# Neuron `graph:community:detect`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:community:detect` (L8388–8408). **Runtime:** **`community:detect:leiden`** (D21), `e5:community:detect-leiden` — subprocess Python Leiden, timeout 600s (catalog L2947–2949). Span `e5:community:detect-leiden` (d21 L67). **Bootstrap:** D21 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:community:detect` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--community--detect.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** detectare comunități generic. **Cod:** algoritm **Leiden** explicit, nu denumirea scurtă `community:detect`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8388–8408).
- `packages/shared/src/cognitive-node-catalog.ts` — D21 (L2946–2954).
- `workers/shared/src/queue-registry.ts` — `E5_COMMUNITY_DETECT_LEIDEN` (L557).
- `workers/e5-nurturing/src/workers/d21-community-detect-leiden.ts` — `withCognitiveSpan("e5:community:detect-leiden", …)` (L67).
- `workers/e5-nurturing/src/lib/e5-metrics.ts` — `cerniq_e5_leiden_python_seconds`, `e5CommunitiesDetected` (L116–121, L147).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8404).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`community:detect:leiden`** (L557). **Fără** `graph:community:detect`. | v2 L8402. | Algoritm în numele cozii. |
| 2 | Etapă, familie, swimlane | `KnowledgeNeuron`, **`graph-community`** (L2950–2951). | v2 L8390–8391. | — |
| 3 | Rol declarat | Leiden Python, timeout 600s (catalog L2949). | v2 generic (L8399–8401). | — |
| 4 | NeuronType + SOFAI | `KnowledgeNeuron` (L2950). | v2 `KnowledgeNeuron` (L8395). | — |
| 5 | Criticitate | Catalog **`HIGH`** (L2953). | v2 **`MEDIUM`** (L8397). | Divergență. |
| 6 | Înveliș telemetrie | `e5:community:detect-leiden` (L67). | v2 `cognitive.graph.community.detect` (L8407). | — |
| 7 | Înveliș politică | — | v2 L8405–8406. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Timeout/subprocess în antet D21 (Plan §X în fișier). | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L8406. | — |
| 11 | Micro-OODA | Graph JSON → Leiden → persistență comunități. | v2 L8403. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8398). | — |
| 13 | Stack v2 §2.3 (subset) | Python subprocess + metrici `e5_leiden_python_seconds`. | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.community.detect`.
- **Cod:** `e5:community:detect-leiden`.

---
*Audit manual 2026-04-13; surse verificate în repo.*
