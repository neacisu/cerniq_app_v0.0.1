<!-- neuron-contract:author-complete -->

# Neuron `enrich:geo:siruta-lookup`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:geo:siruta-lookup` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--geo--siruta-lookup.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează coada canonică `enrich:geo:siruta-lookup` (ToolNeuron, Non-AI, «not yet reconciled with runtime registry»). **La audit în repo (2026-04-11)** nu există coadă BullMQ, procesor în `workers/enrichment`, nici intrare în `cognitive-node-catalog.ts` pentru acest `v2_queue`. **Date SIRUTA în sistem:** (1) schema Postgres `nomenclator_siruta` / `nomenclatorSiruta` (referință); (2) câmpul `silverCompanies.codSiruta` poate fi populat din fluxul **promovare bronze→silver** din răspuns ANAF (`scod_Localitate` → `codSiruta`) în `promotion-bronze-silver.ts` — **nu** echivalent semantic cu un «lookup» dedicat în nomenclator; (3) worker **E5** `g39-association-normalize.ts` menționează normalizare «SIRUTA» la nivel de județ prin mapă statică `COUNTY_NAME_MAP`, **fără** query la `nomenclator_siruta`. Concluzie: **neuronul v2 nu are implementare E1 dedicată**; există doar piese adiacente (ANAF, schemă DB, G39).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:geo:siruta-lookup\`` (~L2193–2213).
- `packages/shared/src/cognitive-node-catalog.ts` — căutare `siruta` / `enrich:geo:siruta`: **fără potrivire** la audit.
- `workers/shared/src/queue-registry.ts` — căutare literal `enrich:geo:siruta-lookup`: **lipsă**.
- `workers/enrichment/` — căutare `siruta`: **fără potrivire** în workeri E1.
- `packages/db/src/schemas/nomenclator-siruta.ts` — tabel referință `nomenclator_siruta` (~L16–31).
- `packages/db/src/schemas/silver.ts` — `codSiruta` pe silver (~L146).
- `workers/enrichment/src/workers/promotion-bronze-silver.ts` — `codSiruta` din `anafAddr.scod_Localitate` (~L1882–1885, ~L1962).
- `workers/e5-nurturing/src/workers/g39-association-normalize.ts` — comentariu SIRUTA + `COUNTY_NAME_MAP` (~L1–70); **fără** import `nomenclatorSiruta`.
- `packages/db/__tests__/f15-audit-llm-job-payloads-siruta.test.ts` — test schemă nomenclator (~L7–28).

## Instanțe v2

- **Runtime E1 dedicat:** **lipsă** (coadă / `nodeKey` pentru `enrich:geo:siruta-lookup`).
- **OTel span name (v2 plan):** `cognitive.enrich.geo.siruta-lookup`
- **Evidence status (v2):** graph-export-grounded; reconciliere registry anunțată ca nefinalizată.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; fără apel LLM pentru acest neuron (și fără handler dedicat).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2_queue** `enrich:geo:siruta-lookup`; **gap** în catalog și registry la audit. Nu există `nodeKey` mapat. | v2 canonic. | Implementare E1 dedicată lipsă. |
| 2 | Etapă, familie, swimlane | v2: E1 enrichment. Cod: **fără** worker E1; G39 este **E5** (`association:normalize`, span `e5:association:normalize` — verificare separată). | v2. | — |
| 3 | Rol declarat | v2: enrichment extern geo. Cod: nomenclator + `codSiruta` silver din ANAF; **fără** serviciu «lookup» SIRUTA izolat. | v2 operational text (generic). | — |
| 4 | NeuronType + SOFAI | v2: `ToolNeuron`. Cod: **neinstanțiat** ca neuron. | v2. | — |
| 5 | Criticitate | v2: `MEDIUM`. Cod: neaplicabil ca unitate runtime. | v2. | — |
| 6 | Înveliș telemetrie | **Fără** `withCognitiveSpan` pentru acest `v2_queue`. Span v2: `cognitive.enrich.geo.siruta-lookup`. | ADR-0003. | OTel doar destinație documentată până la implementare. |
| 7 | Înveliș politică | N/A neuron dedicat; ANAF promotion folosește reguli proprii (în afara scope-ului acestui contract). | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Neuron dedicat: lipsă. | ADR-0007. | — |
| 10 | Escaladare HITL | Neuron dedicat: lipsă. | ADR-0008. | — |
| 11 | Micro-OODA | Neuron dedicat: lipsă; piese adiacente (ANAF → `codSiruta`) nu reconstituie OODA v2 pentru acest queue. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Neuron dedicat: lipsă. | v2. | — |
| 13 | Stack v2 §2.3 (subset) | Postgres (nomenclator, silver); BullMQ în alte fluxuri; **fără** coadă v2. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.geo.siruta-lookup`.
- **Cod:** **lipsă** handler → fără `cognitive.nodeKey` operațional pentru acest `v2_queue`.
- **Stare:** **doar destinație documentată** (sau gap documentat) până la implementare / migrare registry.

### Semnale înrudite (nu înlocuiesc neuronul v2)

- **`codSiruta` din ANAF** la promovare: `promotion-bronze-silver.ts` (~L1882–1885).
- **Nomenclator** ca date de referință: `nomenclator-siruta.ts`; **fără** consumator BullMQ găsit la audit în `workers/`.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
