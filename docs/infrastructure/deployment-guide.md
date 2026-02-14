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
- [ ] SSH key deploy din CT108 pe CT109/CT110 configurat
- [ ] GitHub Secrets actualizate: `STAGING_*`, `PRODUCTION_*`, `ORCHESTRATOR_SSH_KEY`, `OPENBAO_ADDR`
- [ ] Conectivitate confirmată:
  - CT109/110 -> CT107:5432
  - CT109/110 -> OpenBao orchestrator:443
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
- `docker exec cerniq-pgbouncer psql -h 127.0.0.1 -p 64033 -U c3rn1q -d cerniq_staging -c 'SELECT 1'`
- `curl -k -I https://staging.cerniq.app`
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
- `docker exec cerniq-pgbouncer psql -h 127.0.0.1 -p 64033 -U c3rn1q -d cerniq -c 'SELECT 1'`
- `curl -k -I https://cerniq.app`
- `docker exec cerniq-openbao-agent-workers test -f /secrets/workers.env`

## 5. Observability

- Logs: Vector -> Loki (`https://logs.neanelu.ro`)
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
