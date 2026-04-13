<!-- neuron-contract:author-complete -->

# Neuron `geo:cluster:analyze`

> **Status:** audit manual **2026-04-13**. **v2** (L8099–L8119): coadă `geo:cluster:analyze`, familia `geo`, `AssociativeNeuron`. **Repo:** coada canonică este **`cluster:implicit:detect`** — `E5_CLUSTER_IMPLICIT_DETECT` (`queue-registry.ts` L563), catalog `e5:cluster:implicit-detect` (`cognitive-node-catalog.ts` L2973–L2980), worker **D24** `d24-cluster-implicit-detect.ts`, `withCognitiveSpan("e5:cluster:implicit-detect", …)` (L71). **ADR** [graph-community](../../adr/families/e5/graph-community.md) mapează explicit `e5:cluster:implicit-detect` ↔ `cluster:implicit:detect`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `geo:cluster:analyze` |
| coadă runtime | `cluster:implicit:detect` |
| etapa | E5 |
| familie (v2) | `geo` |
| contract_path | `contracts/neurons/E5/geo--cluster--analyze.md` |
| ADR familie (indicativ) | [geo](../../adr/families/e5/geo.md); implementare: [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

Detectare clustere implicite (Jaccard / affinity) pe comunități — vezi antet D24 și `d24-cluster-implicit-detect.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L8099–L8119.
- `workers/shared/src/queue-registry.ts` — `E5_CLUSTER_IMPLICIT_DETECT` (L563).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:cluster:implicit-detect` (L2973–L2980).
- `workers/e5-nurturing/src/workers/d24-cluster-implicit-detect.ts` — procesor (L4–5, L71).
- `workers/e5-nurturing/src/__tests__/graph-leiden.test.ts` — constantă coadă (L309).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L8099–L8119:** span `cognitive.geo.cluster.analyze` (L8118); v2 plasează neuronul în subgraph `geo` (L8112).

## N/A pe criterii

- **8 — Rutare model:** N/A — non-AI în v2 (L8115).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`cluster:implicit:detect`** + `e5:cluster:implicit-detect`; **fără** `geo:cluster:analyze` literal. | v2: `geo:cluster:analyze` (L8113). | Familie v2 `geo` vs cozi `graph-community`. |
| 2 | Etapă, familie, swimlane | Catalog D24: swimlane `graph-community`, etapă 5 (L2978–L2979). | v2: familie `geo` (L8102). | — |
| 3 | Rol declarat | „Detectare clustere implicite D24…” (catalog L2976). | v2: geo proximitate/teritorii (L8110–L8112). | Scop v2 mai larg decât D24. |
| 4 | NeuronType + SOFAI | `AssociativeNeuron` (catalog L2977). | v2: `AssociativeNeuron` (L8106). | — |
| 5 | Criticitate | Catalog: `MEDIUM` (L2980). | v2: `MEDIUM` (L8108). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:cluster:implicit-detect", …)` (`d24` L71). | v2 span `cognitive.geo.cluster.analyze` (L8118). | — |
| 7 | Înveliș politică | Concurrency din registry (metadata D24). | v2 Tier 4 (L8109), fără HITL obligatoriu (L8116). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 non-AI (L8115). | — |
| 9 | Guardrails | Logică deterministă scoring (`d24`). | v2 L8116. | — |
| 10 | Escaladare HITL | — | v2 L8116. | — |
| 11 | Micro-OODA | Date comunități → scor afinitate → persistență. | v2 OODA (L8114). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, NetworkX/Leiden în alte D-workers; D24 implicit clusters. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.geo.cluster.analyze`.
- **Cod:** `cognitive:e5:cluster:implicit-detect`.

---
*Audit manual 2026-04-13.*
