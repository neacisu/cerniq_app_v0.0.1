<!-- neuron-contract:author-complete -->

# Neuron `bronze:ingest:csv-parser`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `bronze:ingest:csv-parser` |
| etapa | E1 |
| familie (v2, prima instanță) | `ingest` |
| contract_path | `contracts/neurons/E1/bronze--ingest--csv-parser.md` |
| ADR familie (indicativ) | [ingest](../../adr/families/e1/ingest.md) |

## Scop în context real

**v2** înregistrează coada canonică `bronze:ingest:csv-parser` (SensoryNeuron, ingest Bronze, «not yet reconciled with runtime registry»). **În runtime**, același rol operațional este acoperit de coada BullMQ **`ingest:csv`**: worker **A1** parsează CSV (Papa), validează opțional hash fișier față de `bronze_import_batches.metadata.fileHash`, inserează rânduri bronze și poate declanșa pași downstream (normalizare / ANAF bronze) prin utilitare din `ingest-utils.ts`. API-ul de import încarcă job-uri pe `ingest:csv` (nu pe literalul v2). **Concluzie:** denumirea v2 ≠ `queueName` runtime; mapare semantică documentată: **v2 `bronze:ingest:csv-parser` ↔ `ingest:csv` / `e1:ingest:csv`**.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`bronze:ingest:csv-parser\`` (~L2699–2719).
- `packages/shared/src/cognitive-node-catalog.ts` — intrare `e1:ingest:csv` / `ingest:csv` (~L351–358).
- `workers/shared/src/queue-registry.ts` — `INGEST_CSV: "ingest:csv"` (~L21), înregistrare worker (~L688).
- `workers/enrichment/src/main.ts` — procesor `"ingest:csv": csvParserProcessor` (~L116).
- `workers/enrichment/src/workers/a1-csv-parser.ts` — `CsvParserJobData`, `ensureFileIntegrity`, `csvParserProcessor` + `withCognitiveSpan("e1:ingest:csv", …)` (~L30–51, ~L65–90, ~L603–626).
- `apps/api/src/routes/imports-bronze.ts` — `queueName = isCsv ? "ingest:csv" : "ingest:excel"` + `enqueueImportJob` (~L5568–5592).
- `workers/enrichment/src/workers/sprint2.integration.test.ts` — import `a1-csv-parser` (~L73).

## Instanțe v2

- **Evidence status (v2):** graph-export-grounded; reconciliere registry anunțată nefinalizată în v2.
- **OTel span name (v2 plan):** `cognitive.bronze.ingest.csv-parser`
- **OTel cod:** span activ `cognitive:e1:ingest:csv` (vezi Mapare OTel).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; fără rutare LLM în A1.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | ��intă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2_queue** `bronze:ingest:csv-parser`. **Catalog:** `nodeKey` `e1:ingest:csv`, `queueName` `ingest:csv`. **Registry:** `QUEUES.INGEST_CSV`. Literal `bronze:ingest:csv-parser` **lipsă** în TS la audit. | v2 canonic §6. | Migrare denumiri opțională (cutover). |
| 2 | Etapă, familie, swimlane | E1; procesor în `workers/enrichment`. **Catalog swimlane:** `data-ingest` (nu «ingest» din metrica v2). | v2 E1, familie `ingest`, swimlane ingest în exemplu metrică. | — |
| 3 | Rol declarat | Catalog: «Parsare fișiere CSV și extragere date structurate». Implementare: `a1-csv-parser.ts` + `ingest-utils` (inserare bronze). | v2: ingest Bronze generic. | — |
| 4 | NeuronType + SOFAI | Catalog: `SensoryNeuron`. v2: `SensoryNeuron`. Clasificare SOFAI: raportată ca în v2 §2.1 (Non-AI / senzorial). | v2. | — |
| 5 | Criticitate | Catalog: `MEDIUM`. v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:ingest:csv", …)` → span `cognitive:e1:ingest:csv` + atribute din catalog (`a1-csv-parser.ts` ~L603–626; `cognitive-helpers.ts` ~L215–234). | v2: `cognitive.bronze.ingest.csv-parser`. | Nume span diferit de string-ul v2; **migrare planificată** dacă se unifică convenția. |
| 7 | Înveliș politică | Tier/încredere: v2 Tier 4; **fără** Cedar/OPA în A1 la audit. Integritate: `ensureFileIntegrity` când există `fileHash` în metadata (~L65–90). | v2 §2.2; audit log 90 zile (țintă operațională). | Politici fine: parțial în cod (hash), restțintă. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Parsare deterministă (Papa); verificare SHA-256 opțională; metrici `jobErrors` / `jobDuration` în procesor. NeMo: **țintă** ADR-0007. | v2 fără HITL obligatoriu. | — |
| 10 | Escaladare HITL | A1 **nu** enfilează direct cozi `human:*`/`hitl:*` în fișierul citit; escaladare transversală posibilă în alte straturi (ADR-0008). | v2 fără HITL obligatoriu pentru ingest. | — |
| 11 | Micro-OODA | OBSERVE: job + fișier/conținut. ORIENT: encoding, mapping coloane. DECIDE: accept/reject rânduri. ACT: `insertBronzeRows` + trigger downstream în `ingest-utils`. | v2 OODA generic ingest. | — |
| 12 | Tier + de-escaladare | **Fără** prag explicit «încredere < 0.80» sau «2σ» în `a1-csv-parser.ts` la audit; retry/stalled = comportament BullMQ implicit. | v2 §2.2 trigger-e ca țintă arhitecturală. | Invarianți de încredere: **fără** dovadă în A1. |
| 13 | Stack v2 §2.3 (subset) | BullMQ (`ingest:csv`), Redis, Postgres (`bronze_import_batches`, inserții bronze), PapaParse, API Fastify (`imports-bronze.ts`). | v2 §2.3 + ADR-uri. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.bronze.ingest.csv-parser` (notație punctată în documentul v2).
- **Cod:** `withCognitiveSpan` apelează `tracer.startActiveSpan` cu nume `cognitive:` + `nodeKey`; pentru A1 `nodeKey = e1:ingest:csv` → **`cognitive:e1:ingest:csv`**; atribute `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` din catalog (`cognitive-helpers.ts` ~L226–234).
- **Stare:** **implementat** pe convenția catalog; **nealinat** literal cu șirul span din tabelul v2 până la decizie de migrare.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
