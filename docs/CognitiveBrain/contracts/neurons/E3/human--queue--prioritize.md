<!-- neuron-contract:author-complete -->

# Neuron `human:queue:prioritize`

> **Status:** audit manual **2026-04-11**. **Gap runtime:** `grep` pe `human:queue:prioritize` în `*.ts`/`*.js` → **zero** rezultate. **Registry** E3 listează `human:escalate`, `human:takeover`, `human:approve` — **fără** `human:queue:prioritize` (`queue-registry.ts` L342–345). **Catalog:** fără intrare pentru această coadă. v2 indică export graf ne-reconciliat (L5203–5204).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `human:queue:prioritize` |
| etapa | E3 |
| familie (v2) | `human` |
| contract_path | `contracts/neurons/E3/human--queue--prioritize.md` |
| ADR familie (indicativ) | [human](../../adr/families/e3/human.md) (dacă există) |

## Scop în context real

**v2** (L5185–5204): **HumanNeuron** inferat, **MEDIUM**, Tier 4, OODA cu LangGraph, **Non-AI**. **Comportament în repo:** **lipsă** procesor și coadă canonică. Prioritizarea cozilor HITL poate fi implicată în `n76-human-escalate.ts` (câmpuri `priority`) — **nu** echivalentă demonstrată cu `human:queue:prioritize` fără analiză suplimentară încrucișată; la audit strict pe **numele cozii**, neuronul lipsește.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5185–5204.
- `workers/shared/src/queue-registry.ts` — L342–345.
- `packages/shared/src/cognitive-node-catalog.ts` — fără `queue:prioritize`.
- Căutare `human:queue:prioritize` în cod — zero (2026-04-11).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5201).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără `nodeKey` / coadă în registry. | v2 (L5199). | v2 §2.4. |
| 2 | Etapă, familie, swimlane | — | E3, human (L5188–5189). | — |
| 3 | Rol declarat | — | v2 (L5196–5198). | — |
| 4 | NeuronType + SOFAI | — | v2 HumanNeuron inferat (L5192). | — |
| 5 | Criticitate | — | v2 MEDIUM inferat (L5194). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.human.queue.prioritize` (L5204). | Fără worker. |
| 7 | Înveliș politică | — | v2 (L5202). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | — | v2 audit (L5202). | — |
| 10 | Escaladare HITL | Cozi `human:*` existente — **alte nume**. | v2 OODA (L5200). | Mapare semantică N76 = limită evidență. |
| 11 | Micro-OODA | — | v2 (L5200). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4 (L5195). | — |
| 13 | Stack (subset) | — | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.human.queue.prioritize` (L5204).
- **Cod:** **neimplementat** pentru coada canonică.

---
*Generator inițial:* înlocuit prin audit manual.
