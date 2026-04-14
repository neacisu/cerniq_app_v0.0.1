# Runtime — neuron `bronze:ingest:csv-parser`

Index operațional pentru pilotul ingest CSV (E1). **Autoritate contract:** [`contracts/neurons/E1/bronze--ingest--csv-parser.md`](../../../../contracts/neurons/E1/bronze--ingest--csv-parser.md).

## Legături

| Artefact | Cale |
| --- | --- |
| ADR paradigmă livrare / pachete | [`adr/global/ADR-0009-neuron-delivery-packages.md`](../../../../adr/global/ADR-0009-neuron-delivery-packages.md) |
| ADR telemetrie + messaging | [`adr/global/ADR-0003-telemetry-backbone.md`](../../../../adr/global/ADR-0003-telemetry-backbone.md) |
| ROUTING sinapse | [`runtime/synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md`](../../../synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md) |
| Cod worker A1 (wiring BullMQ + deps) | `workers/enrichment/src/workers/a1-csv-parser.ts` |
| Logică CSV (handler) | `packages/cognitive-brain-neurons/src/neurons/e1/bronze-ingest-csv-parser/bronze-ingest-csv-parser-handler.ts` |
| Nucleu ingest (triggere G7 + normalize/ANAF) | `packages/e1-ingest-core` |
| Inserare bronze (migrare PR-P3) | `workers/enrichment/src/workers/ingest-utils.ts` — `insertBronzeRows` |

## Livrat vs backlog (pilot)

| Zonă | Stare |
| --- | --- |
| G1 SSE (`buildCognitiveWorkerEventContext`) | Livrat în worker |
| Triggere downstream în `e1-ingest-core` | Livrat |
| Handler CSV în pachet neuron | Livrat |
| `insertBronzeRows` în `e1-ingest-core` | Backlog (PR-P3, după G7 — vezi ADR-0009) |
| SSE latență E2E măsurată | Backlog documentar |
| Metrici granulare per tip eroare CSV | Parțial (vezi OBSERVABILITY.md) |

## Fișiere în acest folder

- [`OBSERVABILITY.md`](OBSERVABILITY.md) — metrici, trace, backlog vs produs
- [`PROGRESS-SSE.md`](PROGRESS-SSE.md) — progres UI, Redis, batchId
- [`AUDIT.md`](AUDIT.md) — audit, PII, correlation
- [`SCENARIOS.md`](SCENARIOS.md) — matrice scenarii nominale / excepții
