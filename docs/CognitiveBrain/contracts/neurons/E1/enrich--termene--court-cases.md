<!-- neuron-contract:author-complete -->

# Neuron `enrich:termene:court-cases`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:termene:court-cases` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--termene--court-cases.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** folosește `enrich:termene:court-cases` (span `cognitive.enrich.termene.court-cases`). **Runtime:** coada **`enrich:termene:dosare`** cu `nodeKey` **`e1:enrich:termene-dosare`**; fișier procesor `e3-termene-dosare.ts` (nume istoric «E3», `etapa` job logger `e1`). Apelează `getTermeneDosare` → `/firme/{cui}/dosare`, filtrează dosare active, derivă `inInsolventa` / `areExecutariSilite`, persistă `metadata.termeneDosare` și actualizează `statusFirma` la `INSOLVENTA` când tipul dosarului indică insolvență/faliment. **Concluzie:** «court-cases» v2 = **dosare judiciare Termene**, mapate la **`enrich:termene:dosare`**, nu la literalul v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:termene:court-cases\`` (~L2457–2476).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:termene-dosare` (~L543–550).
- `workers/shared/src/queue-registry.ts` — `ENRICH_TERMENE_DOSARE` (~L46).
- `workers/enrichment/src/main.ts` — `"enrich:termene:dosare"` (~L131).
- `workers/enrichment/src/workers/p1-orchestrate.ts` (~L113).
- `workers/enrichment/src/lib/termene-api-client.ts` — `getTermeneDosare` (~L167–169).
- `workers/enrichment/src/workers/e3-termene-dosare.ts` — `withCognitiveSpan("e1:enrich:termene-dosare", …)` (~L20–23); logică dosare (~L55–90).
- `workers/enrichment/src/lib/termene-api-client.test.ts` — dosare (~L84–91).

## Instanțe v2

- **OTel v2:** `cognitive.enrich.termene.court-cases`.
- **OTel cod:** `e1:enrich:termene-dosare`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** literal `enrich:termene:court-cases`. Runtime: `e1:enrich:termene-dosare` ↔ `enrich:termene:dosare`. | v2 court-cases. | Nume v2 ≠ registry. |
| 2 | Etapă, familie, swimlane | Catalog: E1, `enrichment-external`. | v2 E1 enrichment. | — |
| 3 | Rol declarat | «Extragere dosare instanță de la Termene.ro». | v2. | — |
| 4 | NeuronType + SOFAI | `ToolNeuron`. | v2 ToolNeuron. | — |
| 5 | Criticitate | Catalog `HIGH`; v2 `MEDIUM`. | v2. | Divergență. |
| 6 | Înveliș telemetrie | Span `e1:enrich:termene-dosare` vs v2 `cognitive.enrich.termene.court-cases`. | ADR-0003. | Nealinat literal. |
| 7 | Înveliș politică | API Termene + logging; fără HITL în handler. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare CUI, erori logate. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără în handler. | ADR-0008. | — |
| 11 | Micro-OODA | Fetch dosare → filtrare → JSON metadata + status firmă. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 §2.2. | — |
| 13 | Stack | BullMQ, HTTP Termene, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.termene.court-cases`.
- **Cod:** `e1:enrich:termene-dosare`.
- **Stare:** **nealinat** (nume span/queue vs v2).

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
