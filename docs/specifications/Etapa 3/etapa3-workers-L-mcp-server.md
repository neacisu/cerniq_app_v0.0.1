# CERNIQ.APP — ETAPA 3: Worker L (MCP Server) — Spec (UPDATED)

> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15  
> **Motiv update:** eliminare exemple legacy (Redis/PG pe porturi interne vechi), aliniere la infra noua.

## 1) Scop

Worker-ul L descrie un MCP server (Model Context Protocol) folosit de agentii Etapa 3 pentru a expune:
- tool-uri interne (read-only / safe-by-default)
- acces controlat la resurse (DB/Redis) prin servicii backend, nu direct din LLM

## 2) Dependinte (infra noua)

- PostgreSQL: extern pe `CT107 (10.0.1.107:5432)`; consumat din aplicatie prin PgBouncer (`64033` in stack).
- Redis: shared pe orchestrator (`6379`), izolat prin ACL + prefix `cerniq:`.
- Secrete: OpenBao pe orchestrator; CT-urile folosesc OpenBao agents (runtime templates).
- Observability: logs in Loki, metrics Prometheus, traces OTEL -> Tempo (via collector).

## 3) Configurare (env)

Preferam variabile “full URL”:
- `DATABASE_URL` (prin PgBouncer in staging/prod)
- `REDIS_URL` (catre Redis shared; nu hardcoda parola)
- `BULLMQ_PREFIX=cerniq:e3` (exemplu; prefix Cerniq obligatoriu)

## 4) Guardrails

- MCP server NU executa comenzi arbitrare.
- Orice acces la DB/Redis este facut prin servicii aplicatiei si politicile existente (RLS, ACL).
- Rate limits + circuit breakers obligatorii pentru integrari externe.

## 5) Observability

- Logs structurate JSON (Pino) cu labels `project="cerniq"` si `environment`.
- Trace context propagat via OTEL (cand aplicatia e instrumentata).

