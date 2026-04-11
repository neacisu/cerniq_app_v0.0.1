<!-- neuron-contract:author-complete -->

# Neuron `enrich:onrc:registration`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:onrc:registration` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--onrc--registration.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește coada canonică `enrich:onrc:registration` (ToolNeuron, Non-AI). **La audit în repo (2026-04-11)** nu există coadă BullMQ, procesor sau `nodeKey` de catalog pentru **`enrich:onrc:registration`**. **În schimb**, workerul **`enrich:onrc:data`** (`onrcDataProcessor`, `f1-onrc-data.ts`) extrage din răspunsul ONRC **numărul de înregistrare la registrul comerțului** (`extractOnrcNrRegCom`), actualizează `silverCompanies.nrRegCom`, `nrRegComOriginal`, `nrRegComCanonical` (doar dacă ONRC furnizează direct format canonic fără «/») și face `upsertCompanyIdentityKey` cu `keyType: "nr_reg_com"` (`sourceAuthority: "onrc"`). Deci **o parte semantică** din «înregistrare ONRC» este acoperită de **același** job ca «date generale firmă», nu de o coadă separată conform v2. **ADR familie** listează doar `enrich:onrc:data`, `administratori`, `sedii` — fără `registration`/`capital` ca nume de coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:onrc:registration\`` (~L2281–2300).
- `docs/CognitiveBrain/adr/families/e1/enrichment.md` — enumerare ONRC (~L26).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:onrc-data` (~L562–570); **fără** `enrich:onrc:registration`.
- `workers/shared/src/queue-registry.ts` — `ENRICH_ONRC_DATA` etc. (~L48–50); **fără** `registration`.
- `workers/enrichment/src/workers/f1-onrc-data.ts` — `extractOnrcNrRegCom` (~L27–41); update `nrRegCom*` (~L104–107); `upsertCompanyIdentityKey` nr_reg_com (~L127–137); `withCognitiveSpan("e1:enrich:onrc-data", …)` (~L59–61).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — `enrich:onrc:data` în lista CUI (~L115).
- `rg` repo: `enrich:onrc:registration` — doar docs v2 + matrice + acest contract.

## Instanțe v2

### Instanță 1 — `enrichment` (linia v2 ~2281)

- **Stage:** E1
- **Family:** enrichment
- **Inferred neuron type:** ToolNeuron
- **Inferred criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **OTel span name (v2):** `cognitive.enrich.onrc.registration`
- **Contract evidence status:** graph-export-grounded; reconciliere registry nefinalizată (v2).

### Extras câmpuri v2 (prima instanță)

- **OODA / Non-AI / HITL:** ca în blocul v2 (enrichment generic).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `enrich:onrc:registration`. Runtime: `e1:enrich:onrc-data` / `enrich:onrc:data` pentru **porțiunea** nr. reg. com. | v2 `enrich:onrc:registration`. | Fără mapare 1:1 coadă v2 ↔ `nodeKey` dedicat. |
| 2 | Etapă, familie, swimlane | v2: E1 enrichment. Cod înrudit: swimlane catalog `enrichment-external` la `enrich:onrc:data`. | v2. | — |
| 3 | Rol declarat | v2: enrichment extern (generic). Cod F1: «date firmă ONRC» + identitate nr. reg. com. | v2. | Alte câmpuri «registration» în sens larg pot fi doar în JSON brut (`metadata.onrcData`). |
| 4 | NeuronType + SOFAI | v2: `ToolNeuron`. Catalog pentru `enrich:onrc:data`: `ToolNeuron`. | v2 §2.1. | — |
| 5 | Criticitate | v2: `MEDIUM`. Catalog (`enrich:onrc:data`): `HIGH`. | v2. | Divergență criticitate vs catalog pentru coada runtime. |
| 6 | Înveliș telemetrie | Span operațional: `e1:enrich:onrc-data` (F1), **nu** `cognitive.enrich.onrc.registration` din v2. | ADR-0003. | Nealinat nume span v2 vs `nodeKey`. |
| 7 | Înveliș politică | F1: fără HITL în handler; logging + `silverEnrichmentLog`. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Reguli deterministe pe nr. reg. com. (sanitizare, canonical doar dacă ONRC dă format nou). | ADR-0007. | — |
| 10 | Escaladare HITL | F1: fără cozi `human:*` în fișierul citat. | ADR-0008. | — |
| 11 | Micro-OODA | Flux apel ONRC + scriere DB + log; fără etichetă OODA în cod. | v2 OODA. | — |
| 12 | Tier + de-escaladare | F1: fără praguri încredere explicite. | v2 §2.2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Postgres, HTTP ONRC (`onrc-api-client.ts`). | v2. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.onrc.registration`.
- **Cod (împărțit cu date generale ONRC):** `e1:enrich:onrc-data`.
- **Stare:** **nealinat** — o singură coadă runtime acoperă mai multe intenții v2 (inclusiv «registration» parțial).

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
