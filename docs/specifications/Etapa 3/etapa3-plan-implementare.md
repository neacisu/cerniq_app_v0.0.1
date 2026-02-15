# CERNIQ.APP - ETAPA 3: PLAN IMPLEMENTARE (aliniat la infrastructura noua)

> **Versiune:** 2.0  
> **Data:** 2026-02-15  
> **Status:** UPDATED (plan rezumat; detalii iterative in PR-uri)

---

## Context

Versiunile anterioare ale acestui document au fost auto-generate si au presupus o infrastructura veche (stack local complet).
In implementarea curenta, Etapa 3 va fi dezvoltata/deployata pe LXCs dedicate, folosind resursele centralizate ale orchestratorului.

Surse de adevar:

- `docs/specifications/master-specification.md`
- `docs/architecture/architecture.md`
- `docs/infrastructure/deployment-guide.md`
- `docs/infrastructure/network-topology.md`
- `docs/infrastructure/observability-stack.md`
- `infrastructura_noua.md` (Implementare Cerniq.app)

---

## Dependinte (obligatorii)

Inainte de Etapa 3:

- Infrastructura noua operationala: CT109 (prod), CT110 (staging), CT107 (PostgreSQL), CT108 (CI)
- Secrets centralizat: OpenBao pe orchestrator
- Database extern: PostgreSQL pe CT107, acces prin PgBouncer local (CT109/CT110)
- Redis shared: pe orchestrator, izolat prin prefix `cerniq:`
- Observability: centralizat (Grafana/Prometheus/Loki/Tempo), ingest intern

---

## Livrabile Etapa 3 (rezumat)

- AI Sales Agent (FSM negociere + orchestration)
- RAG / knowledge base (pgvector + document pipeline)
- Guardrails anti-halucinatie (blocking + audit)
- HITL (escalation + SLA)
- Integrare e-Factura/Oblio (cand etapa 4 devine aplicabila)

---

## Test plan (rezumat)

- Unit + integration tests pentru logica de negociere si guardrails
- Contract tests pentru integrare externa (providers)
- E2E pe staging (CT110) inainte de prod
- Observability: logs/traces/metrics vizibile in Grafana (folder Cerniq)

---

## Regula de documentare

La fiecare modificare semnificativa, se actualizeaza:

- `infrastructura_noua.md` -> "Implementare Cerniq.app"
- ADR-uri relevante (cand apar decizii noi)

