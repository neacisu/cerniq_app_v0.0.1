# CERNIQ.APP — ETAPA 3: Worker N (Human Intervention / HITL) — Spec (UPDATED)

> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15

## 1) Scop

Worker-ul N gestioneaza cazurile HITL:

- creeaza/actualizeaza task-uri de aprobare
- blocheaza actiuni automate pana la confirmare
- aplica decizia umana (approve/reject) si reia fluxul

## 2) Infra (aliniere)

- PostgreSQL extern `CT107`, conexiuni via PgBouncer in staging/prod.
- Redis shared pe orchestrator (BullMQ + cache), prefix `cerniq:`.
- OpenBao centralizat, agent templates pe CT-uri.
- Observability centralizat (Grafana/Loki/Prometheus/Tempo).

## 3) Politici

- Nu se executa actiuni cu side effects fara:
  - task HITL `approved`
  - audit log (cine, cand, ce)
- PII minim in payload/logs.

## 4) Verificari

- backlog HITL vizibil in UI admin
- alerte: backlog > prag, task aging > prag
