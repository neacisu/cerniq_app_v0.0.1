# CERNIQ.APP — ETAPA 3: Worker K (Sentiment + Intent) — Spec (UPDATED)

> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15

## Scop

Worker-ul K calculeaza:

- intent (lead / customer intent)
- sentiment (pozitiv/neutral/negativ)
  si scrie rezultatele in DB (prin API/worker), apoi poate genera actiuni (HITL, follow-up).

## Infra

- DB: PostgreSQL extern CT107 (acces via PgBouncer in staging/prod).
- Queue/cache: Redis shared orchestrator (ACL + prefix `cerniq:`).
- Secrete: OpenBao centralizat + agent templates.

## Config

- `DATABASE_URL`
- `REDIS_URL`
- `BULLMQ_PREFIX=cerniq:e3`

## Observability

- logs in Loki, metrics in Prometheus, traces via OTEL/Tempo (cand e cazul).
