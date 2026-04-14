# Sinapsă `bronze-ingest-csv-parser-bronze-anaf-enrichment`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-csv-parser-bronze-anaf-enrichment` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-csv-parser/bronze-ingest-csv-parser-bronze-anaf-enrichment.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-csv-parser` |

## Capete

| Rol | Nod | Mapare runtime |
| --- | --- | --- |
| Sursă | `bronze:ingest:csv-parser` (contract neuron v2) | Worker A1 pe `ingest:csv` — [`bronze--ingest--csv-parser.md`](../../../neurons/E1/bronze--ingest--csv-parser.md). |
| Destinație | Îmbogățire ANAF la nivel bronze (batch) | Coadă **`enrich:bronze:anaf`** (`QUEUES.ENRICH_BRONZE_ANAF`), job `anaf-bronze-enrich`. |

## Tip muchie

- **dependency** (planificare): după inserare contacte bronze cu CUI / nr. reg. com., orchestratorul ingest declanșează joburi ANAF bronze.

## Runtime (dovadă cod)

- **Funcție canonică:** `triggerAnafBronzeEnrichment` în [`packages/e1-ingest-core/src/triggers.ts`](../../../../../../packages/e1-ingest-core/src/triggers.ts) (`export` din `@cerniq/e1-ingest-core`; `ingest-utils.ts` re-export pentru a2–a5).
- **Enqueue:** `enqueueImportJob` cu `queueName: QUEUES.ENRICH_BRONZE_ANAF`, `workerName: "B5:anaf-bronze-enricher"`, `stageKey: "anaf_bronze"`.
- **Idempotency:** `jobId: anaf-bronze-${batchId}-${i}`, `idempotencyScope` același șir.
- **Retry:** `attempts: 5`, `backoff: { type: "exponential", delay: 1000 }`.
- **Delay între batch-uri CUI:** `ANAF_BATCH_DELAY_MS = 1100` între sub-job-uri.

## Payload (rezumat)

Payload job: `tenantId`, `batchId`, `cuiList`, `bronzeContactIds`, `correlationId`, `batchIndex`, `totalBatches` — vezi apelul `enqueueImportJob` în `triggers.ts`.

## Telemetrie

Aliniat la `worker.jobs.*` / span-uri cognitive pe worker-ul consumator al cozii `enrich:bronze:anaf` (în afara scope-ului contractului A1).

## Legături

- ROUTING: [`runtime/synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md`](../../../../runtime/synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md).
