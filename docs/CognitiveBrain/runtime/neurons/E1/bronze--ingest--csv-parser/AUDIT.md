# Audit — A1 CSV ingest

## Evenimente cognitive

Evenimentele emise prin `emitCognitiveEvent` includ `tenantId`, `nodeKey`, tip eveniment și payload structurat (`data`). Corelare:

- **`correlationId`** — pe job `CsvParserJobData`; trebuie propagat în contextul span/eveniment (vezi G1 / `execution-correlation.ts`).
- **`batchId`** — pe job; necesar pentru filtru SSE per batch când UI trimite `?batchId=`.

## Log structurat

`createJobLogger` în A1 (`job-logger.ts`) — pași `start`, erori parsare, integritate fișier.

## PII

Datele de contact din CSV trec prin strat bronze; logurile trebuie să respecte politica de redactare (`redactPII` unde aplicabil în pipeline-ul API/worker). Nu duplica payload complet în loguri de debug în producție.
