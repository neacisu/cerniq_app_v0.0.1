# Trasabilitate instrumentare F6–F7 (I1)

Matrice: cerință plan cognitiv / audit → probă în repo → status.

## Rezolvare TS2307 `@cerniq/observability` în IDE

1. Deschideți **rădăcina monorepo** (`CerniqAPP`), nu foldere izolate (`packages/…`, `workers/…` fără părinte) — altfel `extends` din `tsconfig.json` nu indică spre același `tsconfig` și lipsesc symlink-urile din `node_modules`.
2. Rulați `pnpm install` la rădăcină; `packages/observability` expune tipuri din **`src/index.ts`** (nu doar din `dist`).
3. În `integrations` și `worker-shared` există **`references`** către `packages/observability` (proiect `composite`) pentru rezolvare stabilă în tsserver.
4. În Cursor/VS Code: „TypeScript: Restart TS Server” după modificări la `package.json` / `tsconfig`.

## Comenzi de reverificare

```bash
rg 'console\.(log|error|warn|info|debug)' workers/enrichment/src workers/outreach/src workers/shared/src \
  --glob '!**/*.test.ts'
rg 'console\.' apps/api/src apps/monitoring-api/src packages/db/src --glob '!**/*.test.ts'
pnpm --filter worker-enrichment test -- --run
pnpm --filter @cerniq/integrations test -- --run
pnpm --filter @cerniq/worker-shared test -- --run
pnpm --filter @cerniq/db test -- --run
pnpm --filter @cerniq/api typecheck
```

## f6-1 … f6-7 (clienți enrichment)

| Id | Probă |
| ---- | -------- |
| f6-1 | `workers/enrichment/src/lib/anaf-api-client.ts` + `anaf-api-client.test.ts` |
| f6-2 | `hunter-api-client.ts` + teste |
| f6-3 | `termene-api-client.ts` + teste |
| f6-4 | `onrc-api-client.ts` + teste |
| f6-5 | `zerobounce-api-client.ts` + teste |
| f6-6 | `hlr-api-client.ts` + teste |
| f6-7 | `xai-client.ts` + teste |

## f6-8 … f6-10 (integrations)

| Id | Probă |
| ---- | -------- |
| f6-8 | `packages/integrations/src/timelinesai/client.ts` + `__tests__/timelinesai.test.ts` |
| f6-9 | `packages/integrations/src/instantly/client.ts` + teste |
| f6-10 | `packages/integrations/src/resend/client.ts` + teste |
| I15 | `providers/twilio-sms.ts`, `providers/smsadvert-sms.ts` — `createServiceLogger`, fără token în log |

**I12:** `@cerniq/integrations` declară `"@cerniq/observability": "workspace:*"` în `package.json` (fără ciclu spre `db` în sens invers).

## f6-11 … f6-14 (workers enrichment util)

| Id | Probă |
| ---- | -------- |
| f6-11 | `ingest-utils.ts` — zero `console`; I10: `ingest_row_identity_resolution_failed` cu `batchId`, `fileName`, `rowNumber`, `errorDetail` |
| f6-12 | `normalization-utils.ts` + comentariu I11 (mapare YAML → câmpuri reale) |
| f6-13 | `pipeline-utils.ts` — `logEnrichmentAudit` + comentariu I9 |
| f6-14 | `company-enrichment-utils.ts` |

## f6-15 … f6-16 (DB fără observability în pachet)

| Id | Probă |
| ---- | -------- |
| f6-15 | `approval-service.ts` — `logAction` → `approval_audit_log`. API: `auditWriter` în `apps/api/src/routes/enrichment.ts` pentru acțiuni HTTP. **I2:** workerii E1/E3/E4 care apelează `approvalService` se bazează pe același `logAction` (sursă de adevăr SQL); fără `auditWriter` în procese fără context HTTP — acceptat, documentat. |
| f6-16 | `ingest-utils.ts` / `promotion-bronze-silver.ts` — eveniment `bronze_identity_resolution` |

## f6-17 … f6-19

| Id | Probă |
| ---- | -------- |
| f6-17 | `error-classification.ts` — `classifyAndRethrow(..., { workerName })` |
| f6-18 | `workers/shared/src/circuit-breaker.ts` — fără `console` |
| f6-19 | `packages/db/src/client.ts` — bootstrap stderr JSON; `traced-postgres.ts` — `slow_query`, eveniment `db_client_first_query` cu `connectLatencyMs` (I6: de la primul `createDbClient` până la primul query reușit, pool lazy) |

## f7-1 … f7-7

| Id | Probă |
| ---- | -------- |
| f7-1–f7-2 | `rg` zero `console` în `workers/enrichment/src`, `workers/outreach/src` (excl. teste) |
| f7-3 | **I7 — scope B:** zero `console` în tot `workers/shared/src` (excl. teste) |
| f7-4 | `config.ts` — 3× `console.error` pre-logger (I13); `monitoring-api/src/index.ts` — logger |
| f7-5 | `migrate-cli-log.ts` + `migrate-cli-log.test.ts`; `migrate-runner.ts` — `createServiceLogger` |
| f7-6 | `glob **/circuit-breaker*.ts` — nu există sub `apps/api`; skip |
| f7-7 | `apps/api/src/index.ts` — `createServiceLogger('api-server')` |

## I14 (callExternalApi în afara f6-1–7)

| Fișier | Status |
| -------- | -------- |
| `k1-nominatim-geocoding.ts` | `createServiceLogger` + `callExternalApi` |
| `i1-daj-scraper.ts`, `i2-anif-scraper.ts` | `createServiceLogger` + scraping |
| `infraq-structured-json.ts` | `createServiceLogger` + `callExternalApi("infraq-reasoning")` |

## I16 (ANAF dublu)

- `anaf-api-client.ts` — batch HTTP standard.
- `c2-cui-anaf-validator.ts` — validare CUI + breaker dedicat; comentarii I16 în cod.

## I17 — Inventar `console` sub `apps/api/src`

- `config.ts`: 3 apeluri (fatal pre-logger).
- Altele: zero (verificat cu `rg 'console\.' apps/api/src`).

## I8 — CLI migrate

- `@cerniq/db` nu importă `@cerniq/observability`; `migrateCliLog` scrie JSON pe stderr.

## I5 — Breaker vs wrapper

- `external-api-wrapper.ts` — comentariu I5 (metrici + logging în `createCircuitBreaker`, nu triplare în `getProviderBreaker`).

---

**Status global:** implementat; reverificare = comenzile din secțiunea de sus.
