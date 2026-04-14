# Observabilitate — A1 CSV ingest

## Cerințe produs (mapare)

| Cerință | Implementare în repo | Complet / parțial |
| --- | --- | --- |
| Trace OTel per job | `withCognitiveSpan("e1:ingest:csv", …)` în `a1-csv-parser.ts` | **Complet** pentru span; atribute `cognitive.*` din catalog |
| Metrici procesare job | `jobsProcessed`, `jobDuration`, `jobErrors` (`worker-metrics.ts`) | **Complet** la nivel procesor A1 |
| Evenimente cognitive (Redis / DB) | `emitCognitiveEvent` din `withCognitiveSpan` (`cognitive-helpers.ts`) | **Complet** mecanism; **G1**: context fără `batchId` pe A1 poate limita filtrul SSE |
| Metrici semconv `messaging.*` (OTel) | Nu există `messaging.client.*` în worker enrichment la audit; se folosesc contoare `worker.jobs.*` | **Parțial** — vezi tabel ADR-0003 telemetry-backbone |
| Cardinalitate / recording rules | Direcție v2; config Prometheus nu în scope runtime doc | **Backlog** infrastructură |

## Note- Nume span cod: `cognitive:e1:ingest:csv` vs notație punctată v2 `cognitive.bronze.ingest.csv-parser` — reconciliere opțională în ADR/catalog.
