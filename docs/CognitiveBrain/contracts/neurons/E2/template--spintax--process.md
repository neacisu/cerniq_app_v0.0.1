<!-- neuron-contract:author-complete -->

# Neuron `template:spintax:process`

> **Status:** audit manual **2026-04-11**. Apelează `processSpintax` pe corp + variabile; tenant sistem pentru logging.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `template:spintax:process` |
| etapa | E2 |
| familie (v2) | `templates` |
| contract_path | `contracts/neurons/E2/template--spintax--process.md` |
| ADR familie (indicativ) | [templates](../../adr/families/e2/templates.md) |

## Scop în context real

**v2:** variație text spintax. **Repo:** `createSpintaxProcessWorker` (`workers/outreach/src/workers/templates.ts`, L47–65): `processSpintax(templateBody, variables)`, return `{ processed }`. Logger cu `OUTREACH_SYSTEM_TENANT` (fără `tenantId` pe job). **Limită:** `validateSpintaxBalance` există în fișier dar **nu** e apelat în acest worker (L32–45 vs L58).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — antet `### NEURON` pentru `template:spintax:process` (L4033–4056).
- `packages/shared/src/cognitive-node-catalog.ts` — L1178–1186.
- `workers/outreach/src/workers/templates.ts`.
- `workers/outreach/src/utils/spintax.js` / `.ts` — `processSpintax` (apel indirect).

## Instanțe v2

- **Catalog nodeKey:** `e2:template:spintax`
- **OTel (v2):** `cognitive.e2.template.spintax`

## N/A pe criterii

- **Rând 8:** **N/A**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:template:spintax`; coadă `template:spintax:process`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `normalization`. | v2. | — |
| 3 | Rol declarat | Transformare deterministă șablon. | v2. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron`. | v2. | — |
| 5 | Criticitate | `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + job logger; fără `withCognitiveSpan` explicit. | Span v2. | — |
| 7 | Înveliș politică | Concurrency 100. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Validare brace **ne**folosită în acest worker. | v2. | **Limită:** alt worker `template:validate` acoperă parte din verificări. |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE: string; ORIENT: spintax; ACT: return. | v2. | — |
| 12 | Tier + de-escaladare | Eșec în `processSpintax` → excepție propagată. | v2. | — |
| 13 | Stack | BullMQ, utilitar spintax. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.template.spintax`.
- **Cod:** span fabrică din coadă; fără nume explicit `e2:template:spintax` în procesor — **parțial** față de v2 dacă instrumentarea globală folosește alt `nodeKey`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
