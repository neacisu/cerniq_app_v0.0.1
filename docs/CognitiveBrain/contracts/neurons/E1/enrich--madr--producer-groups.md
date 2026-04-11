<!-- neuron-contract:author-complete -->

# Neuron `enrich:madr:producer-groups`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:madr:producer-groups` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--madr--producer-groups.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește coada canonică `enrich:madr:producer-groups` (ToolNeuron, Non-AI). **La audit (2026-04-11)** nu există coadă BullMQ, `nodeKey` în catalog sau procesor E1 **dedicat** acestui `v2_queue`. **Semantica «grup de producători» în silver:** apare ca **pattern în același fișier** ca și cooperativele — `l3-cooperative-membership.ts` include regex `\bgrup de producatori\b` în `directCoopSignals`; rezultatul merge tot în `metadata.cooperativeMembership` (câmp unic de inferență), **fără** câmp separat «producerGroups» și **fără** coadă separată. **Registru MADR la nivel de masă de date:** worker **E5** `g38-association-madr-scrape.ts` descarcă PDF «cooperative/grupuri producători», extrage prin `pdf_scrape` și alimentează fluxul `goldAssociations` / normalizare G39 — **altă granulație** (catalog asociații vs companie silver). Concluzie: neuronul v2 este **neinstanțiat 1:1**; cel mai apropiat comportament E1 este **partajat** cu `agri:cooperative`; date ministeriale structurate pe grupuri producători = traseu E5, nu acest queue v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:madr:producer-groups\`` (~L2237–2257).
- `packages/shared/src/cognitive-node-catalog.ts` — căutare `producer-groups` / `enrich:madr:producer-groups`: **fără potrivire** dedicată.
- `workers/shared/src/queue-registry.ts` — literal `enrich:madr:producer-groups`: **lipsă**.
- `workers/enrichment/src/workers/l3-cooperative-membership.ts` — `grup de producatori` în `directCoopSignals` (~L57–63), `cooperativeMembership` (~L73–83).
- `workers/e5-nurturing/src/workers/g38-association-madr-scrape.ts` — PDF MADR cooperative + grupuri producători (~L7–8), span `e5:association:madr-scrape` (~L134–136).
- `workers/enrichment/src/workers/agri-workers.integration.test.ts` — doar export cooperative processor (fără test dedicat «producer-groups»).

## Instanțe v2

- **Coadă / nodeKey dedicat v2:** **gap** la audit.
- **OTel span name (v2 plan):** `cognitive.enrich.madr.producer-groups`
- **Trimitere încrucișată:** vezi contract `enrich--madr--cooperative.md` (`agri:cooperative`).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; fără handler dedicat (și fără LLM pentru acest queue).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2_queue** `enrich:madr:producer-groups`; **fără** intrare catalog/registry pentru acest string. Semnale «grup producători» în **`e1:agri:cooperative`** (același job). | v2 canonic. | Neuron v2 fără implementare izolată. |
| 2 | Etapă, familie, swimlane | v2: E1 enrichment. Cod E1: doar prin **agri:cooperative**; cod E5: `association:madr:scrape` (alt stage). | v2. | — |
| 3 | Rol declarat | v2: enrichment extern. Cod: inferență îmbinată în L3 + registru MADR în G38 (E5). | v2 text generic. | — |
| 4 | NeuronType + SOFAI | v2: `ToolNeuron`. Cod dedicat: **lipsă**; procesor partajat catalogat altfel (vezi contract cooperative). | v2. | — |
| 5 | Criticitate | v2: `MEDIUM`. Cod: neaplicabil ca unitate separată. | v2. | — |
| 6 | Înveliș telemetrie | **Fără** span pentru `enrich:madr:producer-groups`. Semnale: acoperite indirect de `e1:agri:cooperative` sau `e5:association:madr-scrape`. | ADR-0003. | — |
| 7 | Înveliș politică | Neuron dedicat: lipsă. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Neuron dedicat: lipsă; L3 are reguli proprii (vezi contract cooperative). | ADR-0007. | — |
| 10 | Escaladare HITL | Neuron dedicat: lipsă. | ADR-0008. | — |
| 11 | Micro-OODA | Neuron dedicat: lipsă; OODA v2 nu e mapată pe un singur handler. | v2. | — |
| 12 | Tier + de-escaladare | Neuron dedicat: lipsă. | v2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E1/E5, Postgres, subprocess Python pentru G38. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.madr.producer-groups`.
- **Cod:** **lipsă** pentru queue v2; telemetrie apropiată: **`e1:agri:cooperative`** (L3) și **`e5:association:madr-scrape`** (G38).
- **Stare:** **gap + trimiteri încrucișate** documentate.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
