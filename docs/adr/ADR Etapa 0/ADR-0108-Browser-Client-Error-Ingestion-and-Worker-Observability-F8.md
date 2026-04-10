# ADR-0108 — Ingestie erori browser, idempotență și observabilitate workeri (F8–F10)

**Status:** Accepted  
**Data:** 2026-04-10  
**Context:** Plan audit F8–F10 — trasabilitate end-to-end (browser → API → `observability.error_log`), corelare sesiune, workeri BullMQ.

## Decizie

- **1. Endpoint public:** `POST /api/v1/errors/client` (fără JWT obligatoriu): validare Zod, limite câmpuri, rate limit **10/min/IP**, răspuns **202** generic fără detalii interne. `tenantId` din JWT opțional dacă cookie-ul de sesiune e prezent. Aliniere **CORS** cu [ADR-0019](./ADR-0019-CORS-Policy.md). **CSRF:** ruta e apelată din SPA cu `credentials: include`; riscul rămâne limitat la site-uri permise de CORS + SameSite cookies (documentat pentru review securitate).

- **2. Corelare:** Browser trimite `x-correlation-id` sesiune (poate fi non-UUID). Coloana `correlation_id` în `error_log` acceptă doar UUID — valori invalide merg în `context.sessionCorrelationId` ([`parseOptionalUuid`](../../../apps/api/src/errors/error-log-persist.ts) în API).

- **3. Idempotență (anti-flood DB):** Header **`Idempotency-Key`** (8–256 caractere). După **INSERT reușit**, aceeași cheie + același IP în **10 minute** → **202** fără INSERT repetat. Eșec **503** nu marchează idempotența (retry permis). Clientul web calculează fingerprint stabil (`xfe:<fnv1a>`) din mesaj/stack/sursă UI.

- **4. W3C `traceparent`:** **N/A** în faza curentă din browser; propagare doar **`x-correlation-id`** sesiune. Join complet cu OTEL la gateway / API rămâne backlog (impact: span-uri frontend separate de trace server până la instrumentare gateway).

- **5. SSE (`EventSource`):** headere custom lipsă; sesiunea se propagă prin query **`correlationId`** pe `/api/v1/dashboard/kpi-stream` și `/api/v1/brain/events/stream`. Handler-ul API rescrie `x-correlation-id` + `enterCorrelationContext` când parametrul e prezent.

- **6. GDPR / `error_log` sursă frontend:** Minimizare prin truncare stack în Zod + `enrichError` server. **Retenție / ștergere:** aliniere la politica globală de retenție date (ex. [ADR-0051](../ADR%20Etapa%201/ADR-0051-Data-Retention-Policy.md)) + proceduri DPA: rândurile cu `context.sourceType: "frontend"` intră în același ciclu de viață ca celelalte înregistrări tehnice observability; ștergere la cerere subiect — filtrare tenant + interval + fingerprint unde e aplicabil.

- **7. ePrivacy / bază legală:** Trimiterea raportului de eroare e **telemetrie tehnică** (stabilitate); produsul trebuie să o alinieze la **CookieConsentBanner** / politica cookies dacă se cere consimțământ strict pentru astfel de POST (decizie produs + juridic).

- **8. CSP / Reporting API:** `connect-src` trebuie să includă originea API folosită de `reportClientError`. Raportarea cross-origin „Script error.” poate avea stack gol — compensare prin POST JSON agreat.

- **9. WebSocket:** În `apps/web` nu există `new WebSocket`. În `web-admin`, `useWebSocket` folosește **polling HTTP**, nu socket nativ — **N/A** pentru header `x-correlation-id` pe WSS.

- **10. Service Worker / Workbox:** **N/A** — fără `navigator.serviceWorker` / workbox în `apps/web` și `apps/web-admin` (verificat 2026-04).

- **11. Abuse / amenințări:** Rate limit + body max; opțional WAF / rate global la edge; alertă ops pe volum `error_log` cu `sourceType: frontend` (fără label-uri high-cardinality ex. `userId` brut în metrici Prometheus/OTLP).

- **12. Scope în afara monorepo:** Aplicații mobile native, edge propriu, SaaS observabilitate terți — **N/A** pentru acest ADR dacă nu sunt în repo.

- **13. Unhandled rejection / uncaught (workeri):** Log **`error`** + `enrichError` (nu **`fatal`**) pentru `unhandledRejection` și `uncaughtException`, aliniat la enrichment — evită semantică de „oprire proces” unde nu urmează `process.exit`.

- **14. `WORKER_AUTO_OBSERVABILITY`:** Dacă `true` / `1` / `yes`, `createWorker` în `@cerniq/worker-shared` înfășoară procesorul: `CorrelationContext.run` din `correlationId` / `httpCorrelationId` din job data, `withSpan('bullmq:…')`, log structurat la eroare în procesor. Sandbox / procesor `string|URL` **nu** sunt înfășurate.

- **15. Redis worker-shared:** Conexiuni IORedis emit evenimente `connect` / `ready` / `error` / `close` / `reconnecting` la nivel **debug** / **warn** (structurat).

- **16. Ordine plugin-uri Fastify (`apps/api/src/plugins/index.ts`):** Swagger/Swagger UI → **CORS** (allowlist + `credentials: true` + `exposedHeaders` pentru `x-correlation-id`) → Helmet (CSP în producție) → JWT → cookie → multipart → rate-limit global Redis → **`tenantContext`** → request-logging → metrics → audit-trail. Ruta `POST /api/v1/errors/client` este în **`PUBLIC_PREFIXES`** din `tenant-context.ts`, deci **nu** cere JWT înainte de handler; rate limit dedicat rămâne în `client-errors.ts` (10/min/IP).

- **17. E2E Playwright:** există suite în `e2e/` și `apps/web/e2e/`; **fără** scenariu dedicat doar pentru `POST /errors/client` în această iterație — contractul e acoperit de `apps/api/__tests__/client-errors-route.test.ts` și `tests/plans/audit-trail-e2e.test.ts`.

- **18. F8.22 — `queue.add` în `apps/api`:** La audit 2026-04, apelurile `queue.add` din `apps/api/src/routes` (`imports-bronze`, `enrichment`, `outreach`, `negotiation`, `silver-gold`) includ `...buildApiJobPayloadContext(request|req)`. `addBulk` / `FlowProducer` / `flow.add` apar în workeri (`workers/shared/import-execution`, `e4-postsale`, `e5-nurturing`, `outreach`); propagarea `correlationId` / `httpCorrelationId` / `causationJobId` urmează `mergeJobTracingIntoPayload` / `ensureJobDataCorrelationId` și flow-urile e4/e5 actualizate.

- **19. E3 / E4 / E5 — `console.*`:** În cod producție pentru `workers/e3-ai-sales`, `workers/e4-postsale`, `workers/e5-nurturing` există în continuare apeluri `console.info|warn|error` (înlocuire progresivă cu `createServiceLogger` + `enrichError` la erori). **Backlog explicit** — nu blochează livrarea F8–F10 atâta timp cît trasabilitatea job și handlerii globali de proces sunt aliniați.

- **20. 503 DB / migrații:** Răspunsurile `DB_UNAVAILABLE` și `DB_MIGRATION_PENDING` includ **`details.errorId`** (UUID) pentru corelare suport / toast client, **fără** `scheduleApiErrorLogPersist` (insert în `error_log` ar eșua sau nu e util când Postgres e indisponibil).

- **21. Build monorepo:** `pnpm build` (Turbo) include pachetele care declară script `build` în workspace; după modificări în e3/e4/e5, CI trebuie să ruleze `typecheck`/`build` pe aceste filtre sau `validate` agregat — vezi `package.json` (`validate`: lint + typecheck + test).

- **22. Frontend `.catch(() => undefined)`** (ex. `invalidateQueries` fire-and-forget): lăsat fără `reportClientError` pentru a evita zgomot; erorile semnificative rămân în `apiFetch` / `QueryCache`/`MutationCache` `onError`.

- **23. ErrorBoundary:** strat unic în `apps/web/src/App.tsx` înconjoară rutele; boundary dedicat per pagină = backlog produs dacă e nevoie de fallback UI diferit.

- **24. `throw new Error` fără `{ cause }`:** remediere incrementală în workeri și pachete partajate — backlog (inventar `rg` în PR).

- **25. Stub `workers/*/worker.js`:** nu există `worker.js` în `workers/ai`; workerii TS folosesc `main.ts` / `index.ts`. **Python:** servicii invocate din workeri în `workers/e5-nurturing/python/` (`leiden_service.py`, `pdf_scraper.py`); modul comun structurat: [`infra/scripts/json_log.py`](../../../infra/scripts/json_log.py) (`log_json` / `log_info|warn|error`). Verificare sintaxă: `python3 -m py_compile` pe fișierele atinse.

## Consecințe

- Operațiuni: runbook on-call pentru spike-uri de ingestie = aceeași escaladare ca pentru `error_log` API, cu filtru `context.sourceType = frontend`.
- SLO ingestie: aliniat la disponibilitatea API + Postgres; fără SLA separat dacă nu e agreat contractual.

## Matrice trasabilitate (f8-1 … f10-3)

Tabelul canonic rând ↔ todo este în planul F8–F10 (secțiunea „Matrice trasabilitate completă”); la închidere PR verificați că fiecare id `f8-*` / `f9-*` / `f10-*` are implementare sau **N/A** motivat aici sau în PR.

## F10.2 — Coverage

Pragurile actuale `@cerniq/observability` rămân cele din `packages/observability/vitest.config.ts` până la creștere explicită; codul nou F8 (`client-errors`, `report-client-error`, `worker-auto-obs-env`, `QUEUE_METADATA`) are teste dedicate în pachetele respective sau `tests/plans`. Creștere la 100% lines/functions pe tot pachetul observability = backlog separat (inițializare OTEL etc.).

## packages/db — `traced-postgres`

**N/A** pentru propagare suplimentară `correlation_id` în SQL în faza F8–F10: contextul HTTP este deja în stratul API / `error_log`; extindere SQL dedicată = backlog dacă apare cerință de audit row-level.

## Referințe în cod

- `apps/api/src/routes/client-errors.ts`, `apps/api/src/errors/handler.ts` (503 + `errorId`)
- `apps/web/src/lib/report-client-error.ts`, `apps/web/src/lib/api.ts`
- `workers/shared/src/factory.ts`, `workers/shared/src/redis.ts`, `workers/shared/src/import-execution.ts`
- `workers/outreach/src/lib/ensure-job-data-correlation.ts`, `workers/outreach/src/workers/resilience.ts`
- `workers/e4-postsale/src/workers/c13-credit-profile-create.ts`, `workers/e4-postsale/src/workers/credit-refresh-all.ts`
- `workers/e5-nurturing/src/workers/c15-geo-proximity-calculate.ts`
