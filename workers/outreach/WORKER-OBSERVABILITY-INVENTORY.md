# Inventar `src/workers/*.ts` (fără `*.test.ts`) vs F4 + f4-16 + f4-17

## Fișiere (22)

| Fișier | Mapare plan | Observabilitate |
| --- | --- | --- |
| `quota-guardian.ts` | F4.1 | `createServiceLogger` + `createOutreachJobLogger` (check / increment / reset); `svcLog` la erori reset |
| `orchestration.ts` | F4.2 | `createServiceLogger` |
| `whatsapp.ts` | F4.3 | `createServiceLogger` |
| `webhooks.ts` | F4.4 | `createServiceLogger` |
| `sequences.ts` | F4.5 | `createServiceLogger` |
| `resilience.ts` | F4.6 | `createServiceLogger` + `createOutreachJobLogger` (retry, scheduler, priority-route via `executePriorityRouteJob`) |
| `phone-monitoring.ts` | F4.7 | `createServiceLogger` |
| `monitoring.ts` | F4.8 | `createServiceLogger` |
| `hitl.ts` | F4.9 | `createServiceLogger` + `createOutreachJobLogger` pe toți worker-ii HITL |
| `email.ts` | F4.10 | `createServiceLogger` |
| `ai-sentiment.ts` | F4.11 | `createOutreachJobLogger` (sentiment + response) |
| `lead-fsm.ts` | F4.12 | `createServiceLogger` |
| `templates.ts` | F4.13 | `createServiceLogger` + `createOutreachJobLogger` (spintax / personalize / validate) |
| `extra-dispatch.ts` | F4.14 | `createServiceLogger` |
| `sms-send.ts` | f4-16 | `createServiceLogger` + `createOutreachJobLogger`; `correlationId` generat dacă lipsește; eșec → `logSmsJobFailureAndThrow` (`enrichError` + context) |
| `sms-delivery-status.ts` | f4-16 | Idem; `correlationId` fallback UUID |
| `sms-receive-reply.ts` | f4-16 | Idem; `correlationId` propagat la coada sentiment |
| `sms-template-render.ts` | f4-16 | Idem; `correlationId` fallback UUID |
| `sms-quota-check.ts` | f4-16 | Idem; `entityType`/`entityId` = cotă pe tenant |
| `lead-assign-user.ts` | f4-17 | `createServiceLogger` + `createOutreachJobLogger`; `correlationId?` / `traceId` pe `JobData`; `enrichError` la `journey_not_found` |
| `lead-fsm-transitions.ts` | — | **Utilitar, fără processor**: fără logging obligatoriu; log la apelant (`lead-fsm.ts`) |
| `wa-phone-skip-locked-pick.ts` | — | **Utilitar**: fără logging obligatoriu; log la apelant |

**F4.15** — `src/index.ts` (bootstrap): `createServiceLogger("outreach-index")`.

## SMS (f4-16) — înregistrare `index.ts`

În [`src/index.ts`](src/index.ts) sunt încărcați exact acești 5 factory (fără alte `createSms*`):

1. `createSmsSendWorker(redis)` → `sms-send.ts`
2. `createSmsDeliveryStatusWorker()` → `sms-delivery-status.ts`
3. `createSmsReceiveReplyWorker()` → `sms-receive-reply.ts`
4. `createSmsTemplateRenderWorker()` → `sms-template-render.ts`
5. `createSmsQuotaCheckWorker(redis)` → `sms-quota-check.ts`

**Notă plan F4.1–F4.15:** nu enumeră explicit cozile SMS; extinderea **f4-16** acoperă acești worker-i. Observabilitate: `createServiceLogger` + `createOutreachJobLogger`; erori neașteptate: [`src/lib/sms-job-failure-log.ts`](src/lib/sms-job-failure-log.ts) (`enrichError` cu context job, mesaj sumar trunchiat pentru `job_logs`, rethrow).

## Bootstrap (cross-telemetry-shutdown)

- [`src/index.ts`](src/index.ts): `initTelemetry({ serviceName: "cerniq-worker-outreach" })` după `loadSecretsFromFile` — **no-op** dacă lipsește `OTEL_EXPORTER_OTLP_ENDPOINT` sau `OTEL_SDK_DISABLED=true` (vezi pachetul observability). La shutdown: `flushJobLogBuffer` → `flushAuditBuffer` → `shutdownTelemetry` înainte de `redis.quit`.
- Enrichment: [`workers/enrichment/src/main.ts`](../../enrichment/src/main.ts) — același pattern la `SIGTERM`/`SIGINT` (flush înainte de `closeDbConnection`).

## Helper comun

- `src/lib/outreach-job-logger.ts` — `createOutreachJobLogger`, `tenantIdFromUnknownPayload`, `_outreach_system`, extragere UUID pentru `correlationId` / `traceId`.
- `src/lib/sms-job-failure-log.ts` — `logSmsJobFailureAndThrow` pentru catch-uri SMS (`enrichError` cu `baseContext`, fără corp SMS / răspuns provider în clar; mesaj îmbogățit trunchiat la 500 caractere în log).
- `src/lib/job-logger.ts` — re-export `createJobLogger` → `job_logs` (circuit breaker, fără throw din calea de log).

## Contracte corelație (enqueue)

Recomandat: `ensureJobDataCorrelationId` / câmp explicit `correlationId` pe job-uri noi. Worker-ii SMS generează UUID defensiv dacă lipsește la procesare (delivery, template, quota, send, receive). Lead assign: `traceId` UUID este folosit ca `correlationId` în logger când `correlationId` lipsește (vezi `outreach-job-logger.ts`).

## Verificări

- Coverage v8 100% pe `src/lib/ensure-job-data-correlation.ts`, `phone-last4.ts`, `outreach-job-logger.ts` — vezi `vitest.config.ts`.
- `rg 'console\.(log|info|warn|error|debug)' src/workers/*.ts` — 0 în procesoare (folosiți loggerii de mai sus).
