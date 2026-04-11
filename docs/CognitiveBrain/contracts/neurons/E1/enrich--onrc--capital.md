<!-- neuron-contract:author-complete -->

# Neuron `enrich:onrc:capital`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:onrc:capital` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--onrc--capital.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește coada canonică `enrich:onrc:capital` (ToolNeuron, Non-AI, «not yet reconciled with runtime registry»). **La audit în repo (2026-04-11)** nu există `enrich:onrc:capital` în `queue-registry.ts`, în maparea `workers/enrichment/src/main.ts`, nici intrare în `cognitive-node-catalog.ts` pentru acest `v2_queue`. **Cea mai apropiată implementare:** coada **`enrich:onrc:data`** / `onrcDataProcessor` în `f1-onrc-data.ts` — apelează `getOnrcData` (`onrc-api-client.ts`), persistă **întregul** răspuns JSON în `silverCompanies.metadata.onrcData` și actualizează câmpuri precum denumire, adresă, forma juridică, nr. reg. com.; **nu** scrie coloana `silverCompanies.capitalSocial` din acest worker. **`capitalSocial` în silver** apare din fluxul **bronze→silver** (`promotion-bronze-silver.ts`, mapare câmpuri din payload ingest), **nu** din ONRC F1 la audit. Nu s-a găsit consumator TypeScript pentru `metadata.onrcData` în afara scrierii din F1. Concluzie: **neuronul v2 nu are coadă dedicată**; date despre capital din ONRC, dacă există în JSON-ul API, rămân cel mult în blob-ul `onrcData`, fără extracție dedicată către `capitalSocial`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:onrc:capital\`` (~L2259–2278).
- `packages/shared/src/cognitive-node-catalog.ts` — intrări ONRC: `e1:enrich:onrc-data` / `enrich:onrc:data` (~L562–570); **fără** `enrich:onrc:capital`.
- `workers/shared/src/queue-registry.ts` — `ENRICH_ONRC_*` (~L48–50): `data`, `administratori`, `sedii` — **fără** `capital`.
- `workers/enrichment/src/main.ts` — procesoare ONRC (~L133–135).
- `workers/enrichment/src/workers/f1-onrc-data.ts` — `withCognitiveSpan("e1:enrich:onrc-data", …)` (~L59–61); `.set()` pe `silverCompanies` (~L97–111); **fără** `capitalSocial`.
- `workers/enrichment/src/lib/onrc-api-client.ts` — `getOnrcData` → `/companies/${cui}` (~L161–162).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — enfilează `enrich:onrc:data` (nu `capital`) (~L115–117).
- `workers/enrichment/src/workers/promotion-bronze-silver.ts` — `capitalSocial` din mapare ingest (~L2203–2204).
- `packages/db/src/schemas/silver.ts` — coloană `capitalSocial` (~L205).
- `rg` repo: `enrich:onrc:capital` — doar docs v2 + matrice + acest contract.

## Instanțe v2

### Instanță 1 — `enrichment` (linia v2 ~2259)

- **Stage:** E1
- **Family:** enrichment
- **Inferred neuron type:** ToolNeuron
- **Inferred criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **Contract evidence status:** graph-export-grounded + architecture-enhanced; reconciliere registry anunțată ca nefinalizată în v2.
- **OTel span name (v2):** `cognitive.enrich.onrc.capital`

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE → ORIENT → DECIDE → ACT (enrichment request / rate limits / cache / merge).
- **Model routing:** Non-AI — procesare deterministă.
- **Guardrail/HITL policy:** No mandatory HITL; audit log 90 days (text v2).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; fără rutare LLM pentru acest neuron.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `enrich:onrc:capital`. Catalog/registry: doar `enrich:onrc:data` → `e1:enrich:onrc-data`. | v2 canonic `enrich:onrc:capital`. | Fără `nodeKey` pentru coada v2. |
| 2 | Etapă, familie, swimlane | v2: E1, enrichment. Cod pentru piesa înrudită: catalog `enrichment-external` la `e1:enrich:onrc-data` (~L567–568). Neuron v2: fără swimlane în runtime. | v2 familie enrichment. | — |
| 3 | Rol declarat | v2: enrichment extern (text generic). Cod: F1 = «date firmă ONRC» agregate; nu extracție «capital» izolată. | Cortex premotor (v2). | Structura exactă a JSON ONRC (chei capital) ne-citată în cod. |
| 4 | NeuronType + SOFAI | v2: `ToolNeuron`. Catalog (pentru `enrich:onrc:data`): `ToolNeuron`. | v2 §2.1. | Neuron v2 neinstanțiat. |
| 5 | Criticitate | v2: `MEDIUM`. Catalog (`enrich:onrc:data`): `HIGH` — **divergență** față de piesa runtime ce ar putea purta date de capital în blob. | v2. | — |
| 6 | Înveliș telemetrie | **Fără** span pentru `enrich:onrc:capital`. F1 folosește `withCognitiveSpan("e1:enrich:onrc-data", …)` — alt `nodeKey` decât span v2 `cognitive.enrich.onrc.capital`. | ADR-0003; `withCognitiveSpan` în `workers/shared/src/cognitive-helpers.ts`. | OTel v2 pentru coada `capital` rămâne țintă / gap. |
| 7 | Înveliș politică | F1: fără Cedar/OPA în handler; erori propagate; `callExternalApi` + circuit breaker `onrc` în shared. | v2 tier 4; ADR-0007 țintă. | Politică fină per-neuron: doar ce reiese din cod citat. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | F1: validare CUI (`sanitizeCui`), sanitizare nr. reg. com.; fără NeMo în acest fișier. | ADR-0007. | — |
| 10 | Escaladare HITL | F1: fără enqueue `human:*` / `hitl:*`. | ADR-0008. | — |
| 11 | Micro-OODA | F1 implementează flux Observe–Act (apel API, update DB, log); nu este etichetat OODA în cod. | v2 OODA. | — |
| 12 | Tier + de-escaladare | F1: fără prag de încredere / de-escaladare explicită în codul citat. | v2 §2.2. | Invarianți doar dacă apar în cod — aici absenți. |
| 13 | Stack v2 §2.3 (subset) | BullMQ (`enrich:onrc:data`), `fetch` către portal ONRC, Postgres (`silver_companies`, `silver_enrichment_log`). | v2 stack. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.onrc.capital` (plan).
- **Cod (înrudit):** `cognitive.nodeKey` = `e1:enrich:onrc-data` în F1 (`f1-onrc-data.ts`).
- **Stare:** **nealinat** între numele span v2 pentru `enrich:onrc:capital` și implementarea existentă ONRC agregată; migrare/canonic v2 §6 = fază 2 (plan).

### Semnale înrudite (nu înlocuiesc neuronul v2)

- **Blob complet ONRC:** `metadata.onrcData` din `f1-onrc-data.ts` (~L108).
- **Capital social coloană silver:** `promotion-bronze-silver.ts` (~L2203+), sursă ingest, nu ONRC F1.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
