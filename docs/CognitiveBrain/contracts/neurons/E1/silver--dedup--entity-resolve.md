<!-- neuron-contract:author-complete -->

# Neuron `silver:dedup:entity-resolve`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:dedup:entity-resolve` |
| etapa | E1 |
| familie (v2, prima instanță) | `dedup` |
| contract_path | `contracts/neurons/E1/silver--dedup--entity-resolve.md` |
| ADR familie (indicativ) | [dedup](../../adr/families/e1/dedup.md) |

## Scop în context real

**v2** descrie un neuron asociativ pentru „rezoluție entitate și deduplicare” pe silver, cu coadă `silver:dedup:entity-resolve`. În **cod**, **nu** există o coadă BullMQ cu acest nume (`queue-registry.ts` conține doar `dedup:exact` și `dedup:fuzzy` pentru dedup E1). Cea mai bună **echivalență funcțională** documentată: **`dedup:exact`** / `dedupExactHashProcessor` (`m1-dedup-exact-hash.ts`), care leagă înregistrări duplicate pe identificatori exacți (CUI, nr. reg. com., email, telefon) și actualizează starea silver — comportament de „rezolvare entitate” în sens CRM. Afirmația este **nuanțată**: v2 separă conceptual `entity-resolve` de `fuzzy-match`, dar runtime folosește o singură coadă pentru potrivire exactă, nu eticheta `silver:dedup:entity-resolve`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`silver:dedup:entity-resolve\`` (L1829–1849).
- `workers/shared/src/queue-registry.ts` — `DEDUP_EXACT`, `DEDUP_FUZZY` (fără `silver:dedup:entity-resolve`).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:dedup:exact` / `dedup:exact`.
- `workers/enrichment/src/main.ts` — procesor `dedup:exact`.
- `workers/enrichment/src/workers/m1-dedup-exact-hash.ts` — logica de potrivire și merge.
- `workers/enrichment/src/workers/m2-dedup-fuzzy-match.ts` — contrast (fuzzy separat de exact).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`.

## Instanțe v2

### Instanță 1 — `dedup` (v2 ~L1829)

- **Stage:** E1
- **Family:** dedup
- **Inferred neuron type:** AssociativeNeuron
- **Inferred criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **Contract evidence status (v2):** graph-export-grounded + architecture-enhanced; coadă ne-reconciliată cu registry în v2.

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: read multi-source data. ORIENT: correlate patterns. DECIDE: match confidence. ACT: emit association + update graph.
- **Model routing:** Non-AI neuron — deterministic processing.
- **Guardrail/HITL policy:** No mandatory HITL. Audit log 90 days.
- **Prometheus metrics (v2):** `cerniq_neuron_fires_total{neuron_type="AssociativeNeuron",stage="E1",swimlane="dedup"}`
- **OTel span name (v2):** `cognitive.silver.dedup.entity-resolve`

## N/A pe criterii

- **Rând 8 (Rutare model):** **N/A** — fără LLM; v2 „Non-AI”; implementare `dedup:exact` deterministă.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** `silver:dedup:entity-resolve` absent din registry/catalog. **Runtime:** `e1:dedup:exact` / `dedup:exact` (`cognitive-node-catalog.ts` L828–836). | v2 coadă canonică. | Mapare v2→`dedup:exact` este inferențială, nu ADR 1:1 în repo la data auditului. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog **`dedup-scoring`** pentru `e1:dedup:exact`; familie v2 `dedup`. | v2: swimlane metrică `dedup`. | Aliniere bună pe swimlane metrică vs catalog. |
| 3 | Rol declarat | Catalog: deduplicare exactă (CUI, email). Cod: rezolvare duplicate pe chei forte (`m1-dedup-exact-hash.ts`). | v2: rezoluție entitate + dedup. | „Entity-resolve” ca nume separat de `dedup:exact` în cod. |
| 4 | NeuronType + SOFAI | `AssociativeNeuron`; procesare **System 1** (asociativ-determinist). | v2 `AssociativeNeuron`. | — |
| 5 | Criticitate | **MEDIUM** (catalog). | v2 **MEDIUM**. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e1:dedup:exact` (`withCognitiveSpan` în `m1-dedup-exact-hash.ts` L317–320). Nu `cognitive.silver.dedup.entity-resolve` din v2. | v2 naming. | Redenumire span opțională. |
| 7 | Înveliș politică | Fără OPA. `hitl_pending` când nu e auto-merge (`m1-dedup-exact-hash.ts` L184–191). | v2 fără HITL obligatoriu. | Implementarea prevede HITL în unele ramuri. |
| 8 | Rutare model (dacă AI) | **N/A** (vezi N/A). | v2 Non-AI. | — |
| 9 | Guardrails | Reguli SQL + praguri duplicate; fără NeMo. | v2 audit 90 zile. | NeMo N/A. |
| 10 | Escaladare HITL | Stare `hitl_pending` + încredere 0.7/0.8 (`m1-dedup-exact-hash.ts` L187–189). | ADR-0008. | Lanț cozi `human:*` neextras din M1. |
| 11 | Micro-OODA | Citire companie → căutare potriviri → decizie merge/pending → persistență (M1). Neo4j GraphRAG: lipsă. | v2 OODA + destinație GraphRAG. | — |
| 12 | Tier + de-escaladare | Auto-merge vs `hitl_pending` după reguli cod. | v2 Tier 4. | Tensiune Tier 4 vs HITL (ca la `bronze:dedup:hash-checker`). |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Postgres, OTel helper. | v2 subset. | Kafka/Neo4j neaudit. |

### Mapare OTel

- **v2:** `cognitive.silver.dedup.entity-resolve`.
- **Cod:** `cognitive:e1:dedup:exact`; atribute catalog disponibile (cheie validă).
- **Stare 2026-04-11:** nume span diferă de v2.
