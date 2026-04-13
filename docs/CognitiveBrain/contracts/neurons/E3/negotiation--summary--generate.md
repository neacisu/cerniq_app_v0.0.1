<!-- neuron-contract:author-complete -->

# Neuron `negotiation:summary:generate`

> **Status:** audit manual **2026-04-11**. **Gap runtime:** cautare `negotiation:summary:generate` in `*.ts`/`*.js` → zero rezultate. **Registry** si **catalog** — fara aceasta coada / `nodeKey`. v2 L5301-5302: export graf, ne-reconciliat cu registry.

## Metadata

| Camp | Valoare |
| --- | --- |
| v2_queue | `negotiation:summary:generate` |
| etapa | E3 |
| familie (v2) | `negotiation` |
| contract_path | `contracts/neurons/E3/negotiation--summary--generate.md` |

## Scop in context real

**v2** (L5282-5302): **ProceduralNeuron** inferat, **HIGH**, Non-AI in descriere (L5298). **Repo:** implementare lipsa pentru coada exacta.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5282-5302.
- `workers/shared/src/queue-registry.ts` — fara `summary:generate`.
- `packages/shared/src/cognitive-node-catalog.ts` — fara potrivire.
- Cautare cod `negotiation:summary` — zero (2026-04-11).

## Instante v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5298); fara cod.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonica | **Gap**. | v2 (L5296). | v2 §2.4. |
| 2 | Etapa, familie, swimlane | — | E3, negotiation. | — |
| 3 | Rol declarat | — | v2 (L5293-5295). | — |
| 4 | NeuronType + SOFAI | — | v2 ProceduralNeuron inferat (L5289). | — |
| 5 | Criticitate | — | v2 HIGH inferat (L5291). | — |
| 6 | Invelis telemetrie | — | v2 `cognitive.negotiation.summary.generate` (L5301). | Fara worker. |
| 7 | Invelis politica | — | v2 (L5299). | — |
| 8 | Rutare model (daca AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | — | v2 (L5299). | — |
| 10 | Escaladare HITL | — | v2 (L5299). | — |
| 11 | Micro-OODA | — | v2 (L5297). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 3 (L5292). | — |
| 13 | Stack (subset) | — | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.negotiation.summary.generate`.
- **Cod:** **neimplementat** — fara `cognitive.nodeKey`.

---
*Generator initial:* inlocuit prin audit manual.
