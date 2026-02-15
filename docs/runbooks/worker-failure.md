# CERNIQ.APP — Worker Failure Runbook (BullMQ + Redis shared + PG extern)

> **Clasificare:** OPERATIONAL  
> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15

## 1) Context (infra noua)

- Workerii ruleaza in containere pe `CT109` (prod) si `CT110` (staging).
- Redis este shared pe orchestrator; izolarea cheilor foloseste prefix `cerniq:` (BullMQ prefix obligatoriu).
- PostgreSQL este extern pe `CT107 (10.0.1.107:5432)`; conexiunile app trec prin PgBouncer (`64033`).
- Logs/metrics: centralizate pe orchestrator (Loki/Prometheus), trimise de pe CT-uri.

## 2) Diagnosticare rapida (CT109/CT110)

```bash
cd /opt/cerniq
docker compose ps

# Worker logs (exemple)
docker compose logs --tail 200 worker-enrichment
docker compose logs --tail 200 worker-outreach
docker compose logs --tail 200 worker-ai
```

Verifica dependinte:

```bash
# OpenBao agents (secrete randate)
docker inspect -f '{{.State.Health.Status}}' cerniq-openbao-agent-api cerniq-openbao-agent-workers cerniq-openbao-agent-infra

# PgBouncer (daca exista ca service in stack)
docker inspect -f '{{.State.Health.Status}}' cerniq-pgbouncer
```

## 3) Scenarii comune

### A) Container worker down / restart loop

```bash
docker compose ps | rg 'worker-'
docker compose logs --tail 200 <worker-service>
docker stats --no-stream | rg 'worker-'
```

Remediere:

```bash
docker compose restart <worker-service>
```

### B) Jobs se acumuleaza (backlog)

Cauze uzuale:
- Redis shared probleme / credentiale gresite
- rate limit extern (429)
- DB slow / pool epuizat (PgBouncer)

Actiuni:
- Verifica Loki pentru pattern-uri de erori (ex: `redis`, `pg`, `timeout`, `429`).
- Daca ai acces la tool-ul de inspectie BullMQ, verifica counts (waiting/active/failed) pentru queue-urile relevante.

### C) Rate limit extern (429)

Strategie:
- pauzeaza temporar queue-ul afectat
- scade concurrency / creste backoff
- reia dupa fereastra de reset

## 4) Post-incident

- [ ] Workerii sunt up si stable (fara restart loop)
- [ ] Nu cresc erorile Redis/DB in logs
- [ ] Backlog-ul scade in timp
- [ ] Exista RCA scurt + actiune preventiva (retry/backoff/timeout/limits)

