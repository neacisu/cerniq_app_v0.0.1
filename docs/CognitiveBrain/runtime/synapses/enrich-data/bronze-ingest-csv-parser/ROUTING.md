# ROUTING — sinapse `bronze-ingest-csv-parser`

Mapare **muchie contractuală** → **runtime** (coadă / handler / fișier). Idempotency: doar unde există dovadă în cod.

## Nod sursă (ingest CSV)

| v2 / contract | Coadă BullMQ | Procesor | Fișier |
| --- | --- | --- | --- |
| `bronze:ingest:csv-parser` | `ingest:csv` (`QUEUES.INGEST_CSV`) | `csvParserProcessor` → `executeCsvParserJob` | `workers/enrichment/src/workers/a1-csv-parser.ts` + `packages/cognitive-brain-neurons/.../bronze-ingest-csv-parser-handler.ts` |
| Catalog `nodeKey` | `e1:ingest:csv` | — | `packages/shared/src/cognitive-node-catalog.ts` |

## Muchii downstream (canonic: `@cerniq/e1-ingest-core`)

`ingest-utils.ts` re-exportă `triggerNormalizationForContacts` și `triggerAnafBronzeEnrichment` din pachet; mapările B1–B4 sunt în `NORMALIZATION_WORKER_BY_QUEUE`.

| Contract sinapsă | Coadă | Worker label (telemetry) | Idempotency key (dovadă cod) | Fișier / funcție |
| --- | --- | --- | --- | --- |
| `bronze-ingest-csv-parser-silver-norm-company-name` | `normalize:name` (`QUEUES.NORMALIZE_NAME`) | `B1:name-normalizer` | `jobId`: `` `${queueName}-${bronzeContactId}` `` | [`triggers.ts`](../../../../../../packages/e1-ingest-core/src/triggers.ts) — `triggerNormalizationForContacts` + `enqueueImportJobBulk` (bucla cozi + `jobId` în `items[].opts`) |
| `bronze-ingest-csv-parser-silver-norm-email` | `normalize:email` | `B2:email-normalizer` | idem | idem |
| `bronze-ingest-csv-parser-silver-norm-phone-e164` | `normalize:phone` | `B3:phone-normalizer` | idem | idem |
| `bronze-ingest-csv-parser-silver-norm-address` | `normalize:address` | `B4:address-normalizer` | idem | idem |
| `bronze-ingest-csv-parser-bronze-anaf-enrichment` | `enrich:bronze:anaf` (`QUEUES.ENRICH_BRONZE_ANAF`) | `B5:anaf-bronze-enricher` | `jobId`: `` `anaf-bronze-${batchId}-${i}` `` | [`triggers.ts`](../../../../../../packages/e1-ingest-core/src/triggers.ts) — `triggerAnafBronzeEnrichment` + `enqueueImportJob` |

**Retry (dovadă):** normalizare bulk: `attempts: 2`, `backoff: { type: "fixed", delay: 500 }`. ANAF bronze: `attempts: 5`, `backoff: { type: "exponential", delay: 1000 }`.

## Muchie upstream (dedup → ingest)

| Contract | Runtime | Notă |
| --- | --- | --- |
| [`bronze-dedup-hash-checker-bronze-ingest-csv-parser`](../../../../contracts/synapses/enrich-data/bronze-dedup-hash-checker/bronze-dedup-hash-checker-bronze-ingest-csv-parser.md) | Enqueue `ingest:csv` | Handler dedup în alt worker; **nu** mutat în pachetul CSV fără aprobare explicită. |

## Familie agregată

| Contract | Rol |
| --- | --- |
| [`bronze-ingest-csv-parser-family`](../../../../contracts/synapses/enrich-data/bronze-ingest-csv-parser/bronze-ingest-csv-parser-family.md) | Agregare planificare; detaliu runtime în tabelul de mai sus. |

## Backlog / gap-uri documentare

| ID | Observație |
| --- | --- |
| G3 | Contractele sinapse silver-norm marchează uneori „Retry policy: lipsă” în export; ROUTING leagă comportamentul real din `enqueueImportJobBulk`. |
| G1 (SSE) | Context worker A1: `buildCognitiveWorkerEventContext` + propagare `batchId` (UUID din `correlationId` conform `COGNITIVE_SSE_BATCH_ID_RE`, altfel `batchId` top-level pe `job.data` când nu există `importExecution`) — `workers/enrichment/src/lib/execution-correlation.ts`. |
