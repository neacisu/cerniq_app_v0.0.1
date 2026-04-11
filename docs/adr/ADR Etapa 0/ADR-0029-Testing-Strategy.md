# ADR-0029: Testing Strategy (enterprise, tier-uri, aprilie 2026)

**Status:** Accepted  
**Data:** 2026-04-11 (revizuire majoră)  
**Deciders:** Echipa platformă (1-Person-Team + review)

## Context

Cerniq.app necesită o strategie de testare **enterprise-grade** care:

- nu confundă **acoperirea metrică** cu **absența defectelor**;
- combină **praguri Vitest (v8)** pe suprafețe explicite, **integrare reală** (DB, HTTP, cozi), **contracte** (OpenAPI, Zod), **E2E** (Playwright), **SQL** (pgTAP) și **mutation testing** pe module critice;
- evită „100% linii pe tot monorepo-ul într-un singur job Vitest” pentru cod de bootstrap/migrații/glue, fără a renunța la **100% pe zonele Tier A/B** declarate în registru.

Contradicția istorică (rezolvată): versiuni anterioare ale acestui ADR fixau praguri 75–95% pe componente, în timp ce `infra/scripts/verify-vitest-coverage-policy.mjs` impunea **100** pe dimensiunile declarate în registru. **Sursa de adevăr operațională** este acum **registrul tier** + scriptul de verificare care citește pragurile așteptate per pachet.

## Decizie

### 1. Ce înseamnă „100%” în producție

- **100% statements/branches/functions/lines** pe **suprafața măsurată** din `vitest.config.ts` (de obicei prin `coverage.include` pentru pachete cu bootstrap), conform **`docs/developer-guide/testing-coverage-tiers.json`**.
- **100% cu testare reală** = fiecare ramură importantă este exercitată cu **aserțiuni pe comportament**, nu doar atingere de linie. Coverage-ul este **consecință**, nu scop în sine.
- **Tier C / bootstrap** (ex. `client.ts`, `migrate.ts` în `@cerniq/db`): nu sunt obligatoriu în același prag unitar; sunt acoperite prin **`test:integration`**, migrații în CI, și documentație în registru (`coverageEnforcement`: `vitest+integration`).

### 2. Piramidă și straturi

| Strat | Rol principal | Legătura cu coverage / gate |
| ------------ | ------------------------------------- | --------------------------- |
| Unit (Vitest) | Logică pură, mapări, politici | Tier A: ușor 100% izolat |
| Contract | Formă API, scheme, inventar rute | OpenAPI + Zod + audit parity |
| Integrare | DB real (Testcontainers), Redis/BullMQ | `test:integration`, smoke |
| E2E | Fluxuri critice business | Invariante produs, nu **100%** linii Vitest |
| pgTAP | Constrângeri SQL / RLS unde aplicabil | `pnpm test:pgtap` condiționat |

### 3. Politică pe pachet (monorepo)

- Fișier canonic: **[`docs/developer-guide/testing-coverage-tiers.json`](../../developer-guide/testing-coverage-tiers.json)** — `tier`, `vitestThresholds`, `vitestConfigPath`, `coverageIncludeGlobs` (unde e cazul), `integrationTestScript`, `kafkaPolicy`, etc.
- Orice **exclude** de coverage trebuie **justificat** în registru / acest ADR (fără exclude masiv nedocumentat).

### 4. Instrumentare și CI (Vitest + v8)

- Praguri pe **statements, branches, functions, lines**; provider **v8**.
- **Sursă unică TypeScript** în `src/`: artefacte `*.js` / `*.d.ts` / `*.map` parazite în `src/` sunt interzise (gate `pnpm verify:src-artifacts` unde este activ).
- **CI (job `test`):** `pnpm verify:coverage-policy` → `pnpm test:coverage` → `pnpm test:integration` → rezumat coverage → `pnpm test:ci`; artefacte `coverage-summary.json` și `test-results/vitest/*.json` păstrate pentru audit. **Cardinalitate** în rapoarte: evitarea exploziei de etichete în summary-uri (vezi ghidul developer).
- **`pnpm validate`** = `turbo run lint typecheck test` — **nu** include în mod implicit rularea separată cu `--coverage`; gate-ul de coverage rămâne **`test:coverage`** + `verify:coverage-policy`.

### 5. Testare reală (DB, cozi, HTTP)

- **DB:** Testcontainers / `DATABASE_URL` în integrare; migrații dry-run/rollback unde e cazul (`packages/db`); aserțiuni pe constrângeri și RLS în suite dedicate.
- **Cozi:** Redis/BullMQ — idempotență, retry, ordine; legătură `smoke:bullmq-prefix` unde există.
- **HTTP:** `buildApp()` + supertest (sau echivalent **Fastify `inject`**) în `apps/api` și `apps/monitoring-api` — complementar gate-ului OpenAPI, nu înlocuitor.
- **Kafka:** **N/A** la data auditului (fără cod Kafka în repo); politica în registrul JSON; re-evaluare la introducerea consumatorilor.

### 6. Anti-pattern-uri (interzise)

- Mock-uri care înlocuiesc tot I/O-ul **fără verdicte** pe comportament.
- Exclude masiv din coverage **fără** `rationale` în registru.
- Un singur tip de test pentru tot codul (doar unit pe I/O greu).
- **Eliminarea funcționalității** doar pentru a trece praguri este interzisă; calea permisă: **enhancement cod** sau **enhancement teste** (vezi `.cursor/rules/anti-hallucination-global.mdc`).

### 7. Mutation testing

- Pilot **Stryker** (sau echivalent) pe module critice (RBAC, HITL, pricing, deduplicare); extindere după stabilizarea tier A/B; semnal în CI (PR sau main programat) — vezi `packages/config` script `test:mutation`.

### 8. Hartă strategie → livrabile (rezumat)

| Punct strategic | Livrabil |
| --------------- | -------- |
| Clarificare 100% | ADR + registru tier |
| Piramidă | Vitest + OpenAPI + Testcontainers + Playwright + pgTAP |
| Politică pachet | `testing-coverage-tiers.json` |
| CI | verify + test:coverage + summary extins |
| Testare reală | DB + HTTP + cozi + Kafka N/A documentat |
| Anti-pattern | Reguli Cursor + acest ADR |
| Governance | ADR ↔ registru ↔ scripturi ↔ review |

## Consecințe

### Comenzi (ancorate în `package.json` root)

| Comandă | Scop |
| ------- | ---- |
| `pnpm test` | Turbo: test în toate pachetele |
| `pnpm test:coverage` | Turbo test cu `--coverage` |
| `pnpm test:ci` | `infra/scripts/run-vitest-ci.mjs` — rapoarte JSON Vitest |
| `pnpm verify:coverage-policy` | Validează `vitest.config.ts` vs registru tier |
| `pnpm test:integration` | `infra/scripts/run-integration-from-registry.mjs` — execută comenzile unice din `integrationTestScript` din registru (ex. `@cerniq/db test:integration`, `pnpm smoke:bullmq-prefix`) |
| `pnpm test:e2e` | Playwright |
| `pnpm test:pgtap` | pgTAP (condiționat extensie) |
| `pnpm validate` | lint + typecheck + test (fără gate coverage dedicat) |
| `pnpm verify:src-artifacts` | Fără artefacte compilate în `src/` |
| `pnpm test:mutation:pilot` | Stryker pilot pe `@cerniq/config` (vezi și workflow `mutation-pilot.yml`) |

*Notă:* `test:unit` ca script separat nu este cerut de acest ADR; se folosește `pnpm exec vitest` în pachet dacă e nevoie.

### Matrice: scop, blocare PR, artefacte (fără ambiguitate)

| Comandă / poartă | Ce rulează | Blochează PR-ul în CI? | Artefacte uzuale |
| ---------------- | ----------- | ---------------------- | ---------------- |
| `pnpm validate` | `turbo run lint typecheck test` (Vitest **fără** `--coverage` propagat de `test:coverage`) | **Nu** direct — CI nu invocă `validate`; echivalentul este job-ul `lint` (ESLint, Prettier, typecheck, verificări Python/manifeste) + job-ul `test` | Rapoarte ESLint/TS locale |
| `pnpm verify:coverage-policy` | `vitest.config.ts` ↔ registru tier | **Da** (în job `test`, înainte de `test:coverage`) | stdout / exit code |
| `pnpm test:coverage` | Turbo `test -- --coverage` pe pachete | **Da** | `coverage-summary.json` per pachet, `lcov.info` unde e configurat |
| `pnpm test:integration` | Comenzi unice din `integrationTestScript` | **Da** (în job `test`, după `test:coverage`) | stdout proceselor copil (DB, Redis smoke) |
| `pnpm test:ci` | `run-vitest-ci.mjs` — plan/infra + pachete din registru, raport JSON | **Da** | `test-results/vitest/*.json` |
| `pnpm test:e2e` | Playwright (root); în CI: job condiționat `playwright-e2e` din `apps/web` | **Da** când jobul rulează (modificări `apps/web/**`) | `apps/web/playwright-report`, `test-results` |
| `pnpm test:pgtap` | `infra/scripts/run-pgtap.sh` | **Da** când extensia `pgtap` e disponibilă în Postgres după migrare; altfel suite omisă cu notice (vezi `pgtapPolicy` din registru) | output `psql` / TAP |

**Decizie explicită:** `pnpm validate` **nu** include `test:coverage` și **nu** înlocuiește `verify:coverage-policy`. În CI, poarta de praguri rămâne `verify:coverage-policy` + `test:coverage`. Local, echipa poate rula `validate` pentru feedback rapid; înainte de PR trebuie rulate și comenzile din job-ul `test`.

**Local:** `pnpm test:integration` omite `smoke:bullmq-prefix` dacă `REDIS_URL` lipsește și `CI` nu este setat (mesaj pe stderr); în **CI**, `REDIS_URL` este obligatoriu — altfel agregatorul eșuează înainte de smoke.

### pgTAP (rol și guvernanță)

- **Rol:** verificări SQL pe constrângeri și politici sensibile — vezi câmpul `pgtapPolicy` din [`testing-coverage-tiers.json`](../../developer-guide/testing-coverage-tiers.json) și scriptul [`infra/scripts/run-pgtap.sh`](../../../infra/scripts/run-pgtap.sh).
- **CI:** comportamentul exact (extensie disponibilă vs omisă) este documentat în `pgtapPolicy.ciBehavior` din registru.

### Contracte API și straturi adiționale (Q2 2026)

- **Suficiență curentă:** OpenAPI + scheme Zod + `audit:openapi-route-parity` + inventar rute regenerat (`UPDATE_ROUTE_INVENTORY=1` / scripturi `audit:api-routes`) constituie stratul de contract HTTP pentru perioada curentă.
- **Nu este obligatoriu astăzi:** Pact consumer-driven sau scheme formale pentru **toate** evenimentele interne.
- **Reevaluare Q2 2026:** dacă apar consumatori externi multipli ai aceluiași API sau publicarea unui bus de evenimente către terți, se deschide ADR succesor (sau secțiune nouă) pentru Pact intern, catalog de evenimente (AsyncAPI sau JSON Schema în repo) sau echivalent — cu criterii de suficiență și gate CI negociat.

### Trimiteri

- Ghid operațional: [`docs/developer-guide/testing-strategy-and-coverage-tiers.md`](../../developer-guide/testing-strategy-and-coverage-tiers.md)
- Registru mașină-citibil: [`docs/developer-guide/testing-coverage-tiers.json`](../../developer-guide/testing-coverage-tiers.json)
- Catalog E2E: [`docs/developer-guide/e2e-playwright-catalog.md`](../../developer-guide/e2e-playwright-catalog.md)
- Script politică: [`infra/scripts/verify-vitest-coverage-policy.mjs`](../../../infra/scripts/verify-vitest-coverage-policy.mjs)

## Rezolvare gap-uri (cod vs teste)

La nealiniere test–cod:

1. **Cod insuficient de matur** → refactor / corecție / clarificare API.
2. **Teste insuficiente** → extindere suite până la pragurile tier-ului pe suprafața măsurată.

**Interzis:** eliminarea funcționalității doar pentru metrici (excepție rară: dead code verificat + înregistrare explicită).
