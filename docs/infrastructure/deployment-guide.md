# CERNIQ.APP — Deployment Guide (LXC + Orchestrator)

**Versiune:** 3.0  
**Actualizat:** 13 Februarie 2026

## 1. Arhitectura nouă

- `CT 109` (`10.0.1.109`) — productie Cerniq
- `CT 110` (`10.0.1.110`) — staging Cerniq
- `CT 108` (`10.0.1.108`) — runner CI self-hosted
- `CT 107` (`10.0.1.107`) — PostgreSQL extern (nativ)
- `Orchestrator` (`77.42.76.185`) — Traefik + OpenBao + observability

Ingress-ul este centralizat pe orchestrator prin Traefik file provider (`cerniq.yml`).
Stack-ul Cerniq nu mai rulează Traefik intern, PostgreSQL local sau OpenBao server local.

## 2. Pre-deploy checklist

- [ ] DNS pentru `cerniq.app`, `api/admin`, `staging` pointează la `77.42.76.185`
- [ ] SSH key deploy (GitHub Actions) pe userul `deploy` din CT109/CT110 configurat
- [ ] GitHub Secrets actualizate: `STAGING_*`, `PRODUCTION_*`, `OPENBAO_ADDR`, `OPENBAO_CICD_ROLE_ID`, `OPENBAO_CICD_SECRET_ID`
- [ ] Conectivitate confirmată:
  - CT109/110 -> CT107:5432
  - CT109/110 -> OpenBao orchestrator:443 (prin gateway `hz.247` VIP `10.0.1.10:443`)
  - CT109/110 -> Redis shared:6379 (prin gateway `10.0.1.10:6379`)
  - CT108 -> CT109/110:22

## 3. Deploy staging

```bash
# pe CT110
cd /opt/cerniq
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

Validări:

- `docker ps | grep cerniq`
- DB prin PgBouncer cu credidentiale dinamice randate de OpenBao agent:
  - `. /opt/cerniq/runtime-secrets/api/api.env && PGCONNECT_TIMEOUT=5 PGPASSWORD="$POSTGRES_PASSWORD" psql -h 172.29.20.11 -p 64033 -U "$POSTGRES_USER" -d cerniq_staging -Atqc 'SELECT 1'`
- `docker exec cerniq-openbao-agent-api test -f /secrets/api.env`

## 4. Deploy producție

```bash
# pe CT109
cd /opt/cerniq
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
```

Validări:

- `docker ps | grep cerniq`
- DB prin PgBouncer cu credidentiale dinamice randate de OpenBao agent:
  - `. /opt/cerniq/runtime-secrets/api/api.env && PGCONNECT_TIMEOUT=5 PGPASSWORD="$POSTGRES_PASSWORD" psql -h 172.29.20.11 -p 64033 -U "$POSTGRES_USER" -d cerniq -Atqc 'SELECT 1'`
- `docker exec cerniq-openbao-agent-workers test -f /secrets/workers.env`

## 5. Observability

- Logs: Vector -> Loki (`https://logs-cerniq.neanelu.ro` pentru Cerniq-only push)
- Traces: OTEL Collector -> orchestrator OTLP route
- Metrics:
  - node-exporter: CT107/108/109/110
  - cAdvisor: CT109/110 (`:64094`)
- Dashboards în Grafana folder `Cerniq`

## 6. Rollback

Rollback folosește tag-ul salvat în `/opt/cerniq/.previous_deploy`.
Pipeline-ul de rollback aplică imaginea anterioară și repornește serviciile.

## 7. Documente conexe

- [CI/CD Pipeline](./ci-cd-pipeline.md)
- [Network Topology](./network-topology.md)
- [Docker Compose Reference](./docker-compose-reference.md)
- [DNS Configuration](./dns-configuration.md)
