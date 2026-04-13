<!-- neuron-contract:author-complete -->

# Neuron `graph:communities:latest`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:communities:latest` (L8366–8386). **Cod:** **fără** acest literal în `queue-registry.ts` sau în `*.ts` (căutare: zero). Comunități sunt produse de **`community:detect:leiden`** (D21) și **`cluster:implicit:detect`** (D24) — alt nume, alt flux. **Bootstrap:** D21/D24 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:communities:latest` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--communities--latest.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** „latest communities” ca endpoint logic. **Runtime:** **gap** nume; lectură „ultima versiune” ar putea fi în API/DB — **nu** demonstrată în cozi citite.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8366–8386).
- `workers/shared/src/queue-registry.ts` — `E5_COMMUNITY_DETECT_LEIDEN`, `E5_CLUSTER_IMPLICIT_DETECT` (L557, L563); **fără** `graph:communities:latest`.
- `workers/e5-nurturing/src/index.ts` — L68–91.
- `rg` `graph:communities:latest` în `*.ts`: **fără**.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8382).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** coadă. Alternative: `community:detect:leiden`, `cluster:implicit:detect`. | v2 L8380. | Nu este „read latest” dedicat în registry. |
| 2 | Etapă, familie, swimlane | D21/D24: swimlane **`graph-community`** (catalog L2951, L2978). | v2 L8368–8369. | — |
| 3 | Rol declarat | — | v2 generic (L8377–8379). | — |
| 4 | NeuronType + SOFAI | — | v2 `KnowledgeNeuron` (L8373). | — |
| 5 | Criticitate | — | v2 `MEDIUM` (L8375). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.graph.communities.latest` (L8385). | — |
| 7 | Înveliș politică | — | v2 L8383–8384. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L8384. | — |
| 11 | Micro-OODA | — | v2 L8381. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8376). | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.communities.latest`.
- **Cod:** fără span cu acest nume.

---
*Audit manual 2026-04-13; surse verificate în repo.*
