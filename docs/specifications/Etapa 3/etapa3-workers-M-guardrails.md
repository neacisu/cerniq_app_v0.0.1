# CERNIQ.APP — ETAPA 3: Worker M (Guardrails) — Spec (UPDATED)

> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15

## 1) Scop

Worker-ul M defineste guardrails (anti-hallucination, policy enforcement, safety checks) pentru agentii Etapa 3:

- validarea intentiei si a constrangerilor
- limitarea actiunilor cu impact (write/side-effects)
- audit trail pentru decizii automate / HITL

## 2) Dependinte (infra noua)

- PostgreSQL: `CT107 (10.0.1.107:5432)`; acces prin PgBouncer (`64033`).
- Redis: shared pe orchestrator (`6379`), ACL + prefix `cerniq:`.
- Secrete: OpenBao orchestrator (agents pe CT-uri).
- Observability centralizat: Grafana/Prometheus/Loki/Tempo + Vector/OTEL.

## 3) Principii guardrails

- **Deny by default**: actiuni care pot modifica date / trimite mesaje / expune PII necesita:
  - permisiune explicita (policy)
  - validare input/output
  - log/audit
  - HITL cand e cazul
- **No secrets in prompts/logs**: token-uri, parole, chei API nu apar in output.
- **Rate limits**: pentru providerii externi (429 handling).
- **Circuit breakers**: cand apar erori repetate / latenta ridicata.

## 4) Configurare

- `REDIS_URL` + `BULLMQ_PREFIX=cerniq:e3`
- `DATABASE_URL` (prin PgBouncer in staging/prod)

## 5) Audit

Audit-ul se scrie in DB (prin API/worker) si se coreleaza cu trace-id (OTEL) unde este disponibil.
