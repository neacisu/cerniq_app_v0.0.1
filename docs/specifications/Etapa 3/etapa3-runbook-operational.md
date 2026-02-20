# CERNIQ.APP — ETAPA 3: Runbook Operational (UPDATED pentru infra noua)

> **Versiune:** 2.0  
> **Ultima actualizare:** 2026-02-15  
> **Nota:** versiunea anterioara presupunea Postgres/Redis locale in Docker. In infra noua acestea sunt servicii externe/shared.

## 1) Premise

- CT109 (prod) / CT110 (staging) ruleaza stack-ul Docker Cerniq (api + workers + pgbouncer + openbao agents + vector + otel + cadvisor).
- PostgreSQL ruleaza extern pe CT107.
- Redis ruleaza shared pe orchestrator.
- Ingress si OpenBao server sunt pe orchestrator (Traefik HTTPS :443).

## 2) Operatii uzuale (CT109/CT110)

```bash
cd /opt/cerniq
docker compose ps

# logs (exemple)
docker compose logs --tail 200 api
docker compose logs --tail 200 worker-ai

# dependinte (health)
docker inspect -f '{{.State.Health.Status}}' cerniq-openbao-agent-api cerniq-openbao-agent-workers cerniq-openbao-agent-infra
docker inspect -f '{{.State.Health.Status}}' cerniq-pgbouncer
```

## 3) Operatii DB (CT107)

Verificare basic:

```bash
sudo systemctl status postgresql
sudo -u postgres psql -d cerniq -c "SELECT 1;"
```

Backup/restore:

- `docs/runbooks/database-recovery.md`
- `infra/scripts/ct107_pg_dump_cerniq.sh`

## 4) Redis (shared)

Runbook: `docs/runbooks/redis-failover.md`

## 5) Observability

- Grafana: `https://grafana.neanelu.ro`
- Loki: query pe labels `project="cerniq"` + `environment`
- Tempo: traces cand aplicatia este instrumentata
