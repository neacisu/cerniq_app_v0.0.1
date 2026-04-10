# Pattern: logging în workeri BullMQ

## Rezumat

- Logger: `createServiceLogger` din `@cerniq/observability` (Pino, redactare PII).
- Erori: `enrichError` înainte de log structurat; re-throw cu `{ cause }` când există sursă.
- Job: la nevoie, context corelare din `job.data` (`correlationId`, `httpCorrelationId`, `requestId`).
- Auto-observabilitate opțională: variabila **`WORKER_AUTO_OBSERVABILITY`** (`true` / `1` / `yes`) activează înfășurarea procesorului în `createWorker` — vezi [ADR-0108](../../adr/ADR%20Etapa%200/ADR-0108-Browser-Client-Error-Ingestion-and-Worker-Observability-F8.md).

## Proces global

- `unhandledRejection` / `uncaughtException`: `error` + `enrichError`, nu `fatal`, dacă nu urmează oprire explicită a procesului.

## Legături

- Trasabilitate F6–F7 + F8: [`f6-f7-instrumentation-traceability.md`](../f6-f7-instrumentation-traceability.md)
