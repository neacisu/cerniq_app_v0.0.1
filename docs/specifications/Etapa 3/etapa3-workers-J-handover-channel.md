# CERNIQ.APP — ETAPA 3: Worker J (Handover Channel) — Spec (UPDATED)

> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15

## 1) Scop

Worker-ul J defineste mecanismul de handover (agent -> om) pentru cazuri HITL:
- creare task de handover (cine, de ce, context minim)
- notificare in canal dedicat
- urmarire status (pending/ack/resolved)

## 2) Dependinte (infra noua)

- PostgreSQL extern pe `CT107`; acces in runtime prin PgBouncer.
- Redis shared pe orchestrator; BullMQ foloseste prefix `cerniq:`.
- Secrete din OpenBao (orchestrator); nu exista secrete hardcodate.

## 3) Contract (minimal)

Payload recomandat:
- `tenantId`, `conversationId`, `reason`, `severity`
- `summary` (fara PII sensibila)
- `links` (ex: UI admin pentru task)

## 4) Observability

- loguri structurate (Loki)
- metrics (Prometheus): handover created/closed, backlog
- traces (Tempo) cand e instrumentat

