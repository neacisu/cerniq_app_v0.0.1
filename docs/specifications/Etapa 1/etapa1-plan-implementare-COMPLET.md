# CERNIQ.APP — ETAPA 1: Plan Implementare (UPDATED pentru infra noua)

> **Versiune:** 2.1  
> **Ultima actualizare:** 2026-02-27  
> **Nota:** Versiunea anterioara continea multe exemple legacy (PostgreSQL/Redis locale in Docker). Pentru operare curenta, folosim infrastructura noua (CT107 + orchestrator + PgBouncer + OpenBao Agents).

## 1) Premise (infra noua)

- PostgreSQL ruleaza nativ pe `CT107 (10.0.1.107:5432)`.
- Aplicatia/workerii folosesc PgBouncer (`64033`) in stack-ul de pe CT109/CT110.
- Redis este shared pe orchestrator (`6379`), izolat prin ACL + prefix `cerniq:`.
- Secretele sunt gestionate de OpenBao pe orchestrator; in CT-uri ruleaza doar OpenBao agents (runtime templates).

## 2) Deliverables Etapa 1 (high level)

- Pipeline enrichment (Bronze -> Silver -> Gold) + validari
- Workers pentru enrichment si procesare batch
- Rate limiting + circuit breakers pentru providerii externi
- Observability: logs in Loki, metrics in Prometheus, traces via OTEL (Tempo)

## 3) Conectivitate (env vars)

Referinta: `docs/specifications/Etapa 1/etapa1-environment-variables.md`

Minim operational:

- `DATABASE_URL` (prin PgBouncer)
- `REDIS_URL` (catre Redis shared; preferabil cu ACL user `cerniq`)
- `BULLMQ_PREFIX=cerniq:e1` (exemplu; prefix global Cerniq obligatoriu)

## 4) Test plan

Referinta: `docs/specifications/Etapa 1/etapa1-testing-strategy.md`

Recomandari:

- Integration tests ruleaza cu service containers (Postgres:5432, Redis:6379) in CI pentru izolare
- E2E (staging/prod) valideaza conectivitate catre CT107 si Redis shared + observability in Grafana

## 5) Discrepante confirmate (documentatie vs implementare curenta)

- Workers existenti in repo sunt inca stubs JavaScript (`workers/enrichment/worker.js`, `workers/ai/worker.js`, `workers/outreach/worker.js`), in timp ce Etapa 1 cere implementare TypeScript + worker shared package.
- `approval_tasks` si tipurile de aprobare din E0 necesita extindere pentru E1 (`approval_type`, `approval_priority`, `pipeline_stage`, SLA/escalation fields).
- Specificatiile de schema si migrari au diferente punctuale (ex: tabele prezente in schema docs dar neenumerate explicit in lista SQL); implementarea ramane condusa de schema Drizzle + migrari generate.
- Prefixul API E1 este `/api/v1/`, iar fluxul auth include `POST /auth/refresh` si `POST /auth/logout`.
- OpenBao template pentru workers trebuie completat cu variabilele externe lipsa (ZeroBounce, xAI, Nominatim, ONRC, HLR, Bing, plus URL-uri provider).

## 6) Referinta executie

- Planul de executie canonic pentru implementare este documentat in planul operational de lucru din sesiunea curenta.
- Pentru sprint scheduling, se foloseste calendarul recalibrat in `etapa1-sprint-plan.md` (S1 porneste pe 27 Feb 2026).
