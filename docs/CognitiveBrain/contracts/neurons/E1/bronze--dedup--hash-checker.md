<!-- neuron-contract:author-complete -->

# Neuron `bronze:dedup:hash-checker`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `bronze:dedup:hash-checker` |
| etapa | E1 |
| familie (v2, prima instanță) | `bronze-dedup` |
| contract_path | `contracts/neurons/E1/bronze--dedup--hash-checker.md` |
| ADR familie (indicativ) | [bronze-dedup](../../adr/families/e1/bronze-dedup.md) |

## Scop în context real

**v2** definește un neuron asociativ pentru deduplicare la nivel bronze-dedup, cu coadă `bronze:dedup:hash-checker`, procesare deterministă și Tier 4. În **cod**, echivalentul funcțional este **deduplicarea exactă** pe silver: coada BullMQ **`dedup:exact`**, procesată de `dedupExactHashProcessor` în `workers/enrichment/src/workers/m1-dedup-exact-hash.ts`, înregistrată în `workers/enrichment/src/main.ts` și în `workers/shared/src/queue-registry.ts` (`DEDUP_EXACT`). Potrivirea se face pe identificatori exacți (CUI, nr. reg. com., email, telefon) și poate conduce la `auto_merged` sau stare **`hitl_pending`** când nu se auto-merge-uiește (`m1-dedup-exact-hash.ts` L155–191, L253–294). Numele v2 „hash-checker” nu apare ca string de coadă în codul citit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`bronze:dedup:hash-checker\`` (L1807–1827).
- `workers/shared/src/queue-registry.ts` — `DEDUP_EXACT: "dedup:exact"`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:dedup:exact` / `dedup:exact` (L828–836).
- `workers/enrichment/src/main.ts` — `"dedup:exact": dedupExactHashProcessor` (L161).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — enqueue `dedup:exact` (L172).
- `workers/enrichment/src/workers/m1-dedup-exact-hash.ts` — logica de potrivire, merge, HITL pending, `withCognitiveSpan` (L317–321).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`.

## Instanțe v2

### Instanță 1 — `bronze-dedup` (v2 ~L1807)

- **Stage:** E1
- **Family:** bronze-dedup
- **Inferred neuron type:** AssociativeNeuron
- **Inferred criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **Contract evidence status (v2):** graph-export-grounded + architecture-enhanced; coadă ne-reconciliată cu registry în v2.

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: read multi-source data. ORIENT: correlate patterns. DECIDE: match confidence. ACT: emit association + update graph.
- **Model routing:** Non-AI neuron — deterministic processing.
- **Guardrail/HITL policy:** No mandatory HITL. Audit log 90 days.
- **Prometheus metrics (v2):** `cerniq_neuron_fires_total{neuron_type="AssociativeNeuron",stage="E1",swimlane="bronze-dedup"}`
- **OTel span name (v2):** `cognitive.bronze.dedup.hash-checker`

## N/A pe criterii

- **Rând 8 (Rutare model):** **N/A** — neuron fără LLM; v2 confirmă „Non-AI”; implementarea M1 este deterministă/SQL (`m1-dedup-exact-hash.ts`).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog:** `nodeKey` **`e1:dedup:exact`**, coadă **`dedup:exact`**. **v2_queue** `bronze:dedup:hash-checker` **lipsește** literal din registry. | v2: `bronze:dedup:hash-checker`. | Necesită mapare documentată v2 ↔ runtime. |
| 2 | Etapă, familie, swimlane | **E1** (`registerCognitiveWorkerEtapa(1)` în `main.ts`). **Swimlane catalog:** `dedup-scoring` (`cognitive-node-catalog.ts` L833–835). **Familie v2:** `bronze-dedup` (etichetă graf). | v2: swimlane metrică `bronze-dedup`. | Etichete familie vs swimlane catalog diferite. |
| 3 | Rol declarat | Catalog: „Deduplicare prin potrivire exactă (CUI, email)”. Cod: potrivire CUI, nrRegCom, email, telefon (`m1-dedup-exact-hash.ts` L29–140, L218–219). | v2: neuron asociativ dedup bronze. | „Hash-checker” v2 nu e numele cozii din cod. |
| 4 | NeuronType + SOFAI | `NeuronType.AssociativeNeuron` în catalog. **SOFAI:** procesare asociativă deterministă — **System 1** (reflexiv-asociativ) în lectura operațională, nu deliberativ. | v2: `AssociativeNeuron`. | Clasificarea SOFAI granulară nu e enumerată în v2 pentru acest neuron. |
| 5 | Criticitate | Catalog: **MEDIUM** pentru `e1:dedup:exact`. | v2: **MEDIUM**. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:dedup:exact", …)` (`m1-dedup-exact-hash.ts` L317–320) → span **`cognitive:e1:dedup:exact`** (`cognitive-helpers.ts` L226). **Nu** `cognitive.bronze.dedup.hash-checker` din v2. Atribute: `getNodeByKey("e1:dedup:exact")` **reușește** — catalog atașat pe span. | v2 naming + ADR-0003. | Redenumire span spre v2 opțională. |
| 7 | Înveliș politică | Fără Cedar/OPA în M1 citit. **HITL:** stări `hitl_pending` + încredere duplicat 0.7/0.8 (`m1-dedup-exact-hash.ts` L187–189) — **nu** „fără HITL obligatoriu” absolut din v2, ci control uman pentru cazuri non-auto. | v2: fără HITL obligatoriu; audit 90 zile. | v2 subestimează căile HITL din implementare. |
| 8 | Rutare model (dacă AI) | **N/A** (fără LLM; vezi secțiunea N/A). | v2 Non-AI. | — |
| 9 | Guardrails | Logică deterministă + praguri duplicate; fără NeMo. | v2 audit log 90 zile; ADR-0007. | NeMo **N/A** pentru flux determinist. |
| 10 | Escaladare HITL | `dedupStatus: "hitl_pending"` pentru cazuri fără auto-merge (`m1-dedup-exact-hash.ts` L184–191). Nu enumeră cozi `human:*` în acest fișier. | ADR-0008; v2 „no mandatory HITL”. | Lanțul complet HITL (cozi) nu e trasat din M1 singur. |
| 11 | Micro-OODA | **Observe:** citire `silverCompanies` + identificatori. **Orient:** căutare potriviri în DB. **Decide:** auto-merge vs pending. **Act:** update înregistrări + log (`m1-dedup-exact-hash.ts` L212–285). **Neo4j GraphRAG:** lipsă. | v2 OODA + țintă GraphRAG. | — |
| 12 | Tier + de-escaladare | Tier operațional: auto-merge când condițiile sunt îndeplinite; altfel oprire la `hitl_pending`. Fără prag „încredere model <0.80” (nu e model). | v2 Tier 4. | „Tier 4” v2 vs HITL efectiv: tensiune documentată. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Postgres/`@cerniq/db`, OpenTelemetry span helper. | v2 subset (BullMQ, …). | Kafka/Neo4j neaudit pentru M1. |

### Mapare OTel

- **v2:** `cognitive.bronze.dedup.hash-checker`.
- **Cod:** `cognitive:e1:dedup:exact`; atribute catalog aliniate (cheie existentă).
- **Stare 2026-04-11:** nume span diferă de v2; metadata catalog **OK**.
