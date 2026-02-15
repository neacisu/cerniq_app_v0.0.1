# CERNIQ.APP — ETAPA 1: Plan Implementare (UPDATED pentru infra noua)

> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15  
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

