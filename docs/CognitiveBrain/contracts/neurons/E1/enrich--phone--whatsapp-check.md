<!-- neuron-contract:author-complete -->

# Neuron `enrich:phone:whatsapp-check`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:phone:whatsapp-check` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--phone--whatsapp-check.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:phone:whatsapp-check` (ToolNeuron, Non-AI) în familia enrichment E1. **La audit în repo (2026-04-11)** nu există coadă **`enrich:phone:whatsapp-check`** în `workers/shared/src/queue-registry.ts`, nici procesor în `workers/enrichment/src/main.ts`, nici `nodeKey` în `cognitive-node-catalog.ts` pentru acest nume. Fluxurile **WhatsApp** găsite sunt în **E2 outreach** (ex. `workers/outreach/src/workers/whatsapp.ts` — trimitere mesaje, alocare telefoane WA) și cozi E3 pentru `channel:whatsapp:send`, care **nu** echivalentează un job E1 de «verificare dacă numărul are WhatsApp» în sensul neuronului v2. Concluzie: **neuronul v2 nu are implementare E1 dedicată** la data auditului.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:phone:whatsapp-check\`` (~L2369–2389).
- `packages/shared/src/cognitive-node-catalog.ts` — căutare `whatsapp-check` / `enrich:phone:whatsapp`: **lipsă** (cozi WA per-telefon sunt pattern dinamic documentat în comentarii catalog, nu acest v2_queue).
- `workers/shared/src/queue-registry.ts` — **fără** `enrich:phone:whatsapp-check`.
- `workers/enrichment/src/main.ts` — **fără** procesor pentru acest nume.
- `rg` — `enrich:phone:whatsapp-check`: doar docs v2 + matrice + acest contract.
- `workers/outreach/src/workers/whatsapp.ts` — context E2 WA (trimise mesaje), **nu** enrichment «check» E1.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.phone.whatsapp-check`.
- **Implementare E1:** lipsă.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără `nodeKey` / coadă pentru `enrich:phone:whatsapp-check`. | v2 canonic. | — |
| 2 | Etapă, familie, swimlane | v2: E1 enrichment. Cod: **fără** worker E1; WA în alte etape. | v2. | — |
| 3 | Rol declarat | v2: enrichment extern (generic). Cod: **lipsă** serviciu dedicat «whatsapp-check». | v2. | — |
| 4 | NeuronType + SOFAI | v2: `ToolNeuron`. Cod: neinstanțiat. | v2. | — |
| 5 | Criticitate | v2: `MEDIUM`. Cod: neaplicabil. | v2. | — |
| 6 | Înveliș telemetrie | Fără `withCognitiveSpan` pentru acest `v2_queue`. | v2 span dedicat. | Doar destinație documentată / gap. |
| 7 | Înveliș politică | N/A neuron dedicat. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | N/A neuron dedicat. | ADR-0007. | — |
| 10 | Escaladare HITL | N/A neuron dedicat. | ADR-0008. | — |
| 11 | Micro-OODA | N/A neuron dedicat. | v2 OODA. | — |
| 12 | Tier + de-escaladare | N/A neuron dedicat. | v2 §2.2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ folosit în alte neuroni; **fără** coadă v2 aici. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.phone.whatsapp-check`.
- **Cod:** **lipsă** handler E1 → fără `cognitive.nodeKey` operațional pentru acest neuron.
- **Stare:** **doar destinație documentată** până la implementare sau rescriere v2.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
