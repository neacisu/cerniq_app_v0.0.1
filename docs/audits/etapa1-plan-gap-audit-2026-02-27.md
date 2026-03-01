# Audit aprofundat Etapa 1 (plan vs implementare)

Data audit: 2026-02-27  
Plan analizat: `/root/.cursor/plans/plan_implementare_etapa_1_5dd7f288.plan.md`

## Metodologie

- comparatie task-cu-task pe PR-urile cu gap-uri mari (`S3.PR4`, `S3.PR8`, `S4.PR1..PR8`)
- verificare implementare in cod (`apps/api`, `apps/web`, `workers/enrichment`, `infra`)
- validare tehnica prin `typecheck`, `lint`, `test` pe pachetele afectate
- clasificare:
  - `COMPLET`: implementat conform intentiei task-ului
  - `PARTIAL`: implementat, dar lipseste parte din scope-ul explicit
  - `GAP`: lipseste implementarea ceruta

## Matrice status (rezumat executiv)

### S3.PR4 (Geo/Agri workers)

- `E1.S3.PR4.001` K.1-K.3: `COMPLET` (geocoding + zones + proximity)
- `E1.S3.PR4.002` L.1 APIA: `COMPLET`
- `E1.S3.PR4.003` L.2 OUAI: `PARTIAL` -> **hardened in audit** (semnale directe APIA + context geo)
- `E1.S3.PR4.004` L.3 Cooperative: `PARTIAL` -> **hardened in audit** (semnale APIA + name/domain)
- `E1.S3.PR4.005` L.4/L.5 clasificatori: `COMPLET`

### S3.PR8 (Integration tests sprint 3)

- `E1.S3.PR8.*`: `PARTIAL` (teste existente pentru subset; mai ramane extindere pe scenarii edge/error si volume)

### S4.PR1 (API Dashboard/Auth/Schemas)

- `E1.S4.PR1.001` middleware setup: `COMPLET`
- `E1.S4.PR1.002` dashboard stats: `COMPLET`
- `E1.S4.PR1.003` dashboard activity: `COMPLET`
- `E1.S4.PR1.004` refresh/logout: `COMPLET`
- `E1.S4.PR1.005` common Zod schemas: `COMPLET`
- `E1.S4.PR1.006` unit tests mock DB: `PARTIAL`

### S4.PR2 (API Imports/Bronze)

- `E1.S4.PR2.001` imports list/detail cu filtre: `PARTIAL` -> **extins in audit** cu `sourceType`, `dateFrom`, `dateTo`
- `E1.S4.PR2.002` multipart upload configurabil: `COMPLET` (mapping/encoding/delimiter/sheetName/hasHeader propagate in metadata + job payload)
- `E1.S4.PR2.003` cancel import: `COMPLET`
- `E1.S4.PR2.004` bronze contacts list/detail cu filtre: `PARTIAL` -> **extins in audit** cu `dateFrom`, `dateTo`
- `E1.S4.PR2.005` reprocess: `COMPLET`
- `E1.S4.PR2.006` schema bundle + Swagger: `PARTIAL` (schema bundle Zod adaugat; Swagger wiring de finalizat)

### S4.PR3 (API Silver/Gold)

- `E1.S4.PR3.001` silver list + FTS pg_trgm: `PARTIAL` -> **hardening in audit** (similarity in query), dar lipsesc inca migrare/index pg_trgm formal
- `E1.S4.PR3.002` enrich/promote: `COMPLET`
- `E1.S4.PR3.003` enrichment log: `COMPLET`
- `E1.S4.PR3.004` gold list filtre extinse: `COMPLET` (include state array, leadScore range, judetCod, assigned/unassigned, doNotContact, isAgricultural, sort)
- `E1.S4.PR3.005` patch/transition FSM: `COMPLET`
- `E1.S4.PR3.006` schema bundle Zod complet: `COMPLET`

### S4.PR4 (API Approvals/Queues)

- `E1.S4.PR4.001` approvals list/detail + filters/sort/entityData: `PARTIAL` -> **extins in audit** cu `overdue`, `sortBy`, `sortDir`, `entityData`
- `E1.S4.PR4.002` assign/decide: `COMPLET`
- `E1.S4.PR4.003` approvals stats: `COMPLET`
- `E1.S4.PR4.004` queue status 58: `COMPLET`
- `E1.S4.PR4.005` queue pause/resume: `COMPLET`
- `E1.S4.PR4.006` schema bundle + unit tests: `COMPLET` (schema bundle + teste Vitest)

### S4.PR5 (Frontend pages, integrare reala)

- `E1.S4.PR5.001` hooks TanStack Query E1: `PARTIAL` (acoperire mare, dar nu 28/28 cu toate combinatiile de parametri)
- `E1.S4.PR5.002` dashboard E1: `COMPLET`
- `E1.S4.PR5.003` import pages (new/detail/mapping): `PARTIAL` (create+detail+mapping exista, dar mapping flow trebuie conectat complet la backend)
- `E1.S4.PR5.004` bronze list + detail raw payload: `COMPLET`
- `E1.S4.PR5.005` silver pages + dedup review: `PARTIAL` (structura exista, dar dedup workflow complet trebuie conectat la API dedicat)
- `E1.S4.PR5.006` gold pages + detail/contacts: `PARTIAL`
- `E1.S4.PR5.007` approvals inbox + review panels: `PARTIAL` (inbox/review exista; panel-uri dedicate pe tip approval trebuie aprofundate)
- `E1.S4.PR5.008` enrichment queues/logs/settings: `COMPLET` (v1 operational)

### S4.PR6 (Frontend components)

- `E1.S4.PR6.001`: `COMPLET` (DataTable ecosystem + column configs + filters)
- `E1.S4.PR6.002`: `PARTIAL` (FileUpload + ImportMappingForm exista, progress/mapping orchestration end-to-end de finisat)
- `E1.S4.PR6.003`: `COMPLET`
- `E1.S4.PR6.004`: `COMPLET`
- `E1.S4.PR6.005`: `COMPLET`
- `E1.S4.PR6.006`: `COMPLET`
- `E1.S4.PR6.007`: `COMPLET`

### S4.PR7 (E2E)

- `E1.S4.PR7.001` import csv: `COMPLET`
- `E1.S4.PR7.002` pipeline flow: `COMPLET` (functional coverage v1)
- `E1.S4.PR7.003` HITL flow: `COMPLET` (functional coverage v1)
- `E1.S4.PR7.004` gold lead management: `COMPLET` (functional coverage v1)

### S4.PR8 (Docs/Deployment/Ops)

- `E1.S4.PR8.001` runbook: `PARTIAL`
- `E1.S4.PR8.002` env vars doc: `COMPLET` (set minim 24 vars + variabile recomandate extinse)
- `E1.S4.PR8.003` grafana 14 metrici: `COMPLET` (dashboard `infra/config/grafana/dashboards/etapa1-overview.json`)
- `E1.S4.PR8.004` alert rules: `COMPLET` (set extins: queue depth, failure rate, HITL SLA/backlog, stalled, worker down, PG connections, slow queries)
- `E1.S4.PR8.005` openbao template complet: `COMPLET` (actualizat cu variabile lipsa)
- `E1.S4.PR8.006` compose resources worker enrichment: `COMPLET` (1G / 2.0 CPU)
- `E1.S4.PR8.007` deploy monorepo worker build: `COMPLET` (worker-enrichment context set la root monorepo)
- `E1.S4.PR8.008` final review + tag: `GAP`

## Ce a fost corectat in acest ciclu de audit

- API:
  - filtre suplimentare date/sursa in imports + bronze contacts
  - upload contract extins pentru imports (`mapping`, `hasHeader`, `encoding`, `delimiter`, `sheetName`) cu validare stricta
  - hardening query-uri SQL parametrizate (eliminare concatenari string brute)
  - approvals: `overdue`, `sortBy`, `sortDir`, `entityData` in detail
  - schema bundle Zod completat pentru E1 (`etapa1.ts`) + teste automate (`etapa1-schemas.test.ts`)
  - silver/gold routes migrate pe schema-contract reutilizabil (fara validari ad-hoc duplicative)
  - silver search ranking cu `similarity(...)`
- Workers:
  - `L.2` OUAI membership: inferenta bazata pe semnale directe APIA + context geospatial
  - `L.3` cooperative membership: inferenta bazata pe semnale APIA + name/domain
- Frontend:
  - extensie component library + pagini/rute Etapa 1 noi + hooks E1
- Ops:
  - openbao vars externe completate
  - resource limits worker enrichment ridicate conform plan
  - pipeline deploy actualizat: build `worker-enrichment` din context monorepo (`.`)
  - load test scaffold (`k6`) pentru 1000/min + documentatie de rulare
- DB:
  - migratie noua `0012_silver_trgm_search.sql` pentru indexare trigram pe `silver_companies`

## Validari executate

- `@cerniq/worker-enrichment`: `typecheck`, `lint` -> pass
- `@cerniq/api`: `typecheck`, `lint`, `test` -> pass
- `@cerniq/web`: `typecheck`, `lint`, `test` -> pass (warning-uri non-blocking existente in proiect)

## Gap-uri critice ramase pentru 100% complet/correct

1. `S4.PR3.001` — formalizare `pg_trgm` la nivel migrare/index + test de performanta query.
2. `S4.PR5.*` — finalizare fluxuri detail/review la nivel de functionalitate completa (nu doar scaffolding operational).
3. `S4.PR8.003` + `S4.PR8.007` + `S4.PR8.008` — dashboards, CI deploy monorepo worker si release final.
4. `S4.PR2.002` / `S4.PR2.006` / `S4.PR4.006` — contract schema complet + testare unitara dedicata.

## Concluzie

Implementarea este acum substantial mai aproape de standardul cerut (fara shortcut-uri minime pe zonele auditate), dar **inca nu este 100% finalizata pe toate task-urile din plan**. Acoperirea curenta este ridicata pe componenta tehnica de baza; pentru 100% mai raman task-uri explicite de inchis pe API contract completeness, frontend feature-depth si operare/release.
