# CERNIQ.APP — ETAPA 0: RUNBOOK OPERATIONAL (noua infrastructura)

## Versiunea 2.0 | 2026-02-15

**DOCUMENT STATUS:** NORMATIV (aliniat la ADR-0030 / ADR-0031 / ADR-0033)  
**SCOPE:** Proceduri operationale pentru infrastructura noua (fara aplicatie deployata inca)  
**AUDIENTA:** DevOps, Developers, On-call engineers

## Context (noua arhitectura)

- Ingress public: Traefik pe orchestrator (`77.42.76.185`).
- PostgreSQL: nativ pe CT107 (`10.0.1.107:5432`).
- Redis: shared pe orchestrator (`10.0.0.2:6379`), accesat din CT109/CT110 prin gateway `hz.247` VIP `10.0.1.10:6379`.
- OpenBao: exclusiv pe orchestrator (`https://s3cr3ts.neanelu.ro`), accesat din CT109/CT110 prin `10.0.1.10:443`.
- Observability: centralizat pe orchestrator (Grafana/Prometheus/Loki/Tempo).
- CT109/CT110 ruleaza doar infra-sidecars: PgBouncer, OpenBao agents, Vector, OTEL Collector, cAdvisor.

## Proceduri

### 1) Verificare starea infrastructurii (CT109 / productie)

```bash
# Container status
cd /opt/cerniq/infra/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# OpenBao agents trebuie sa fie healthy
docker inspect -f '{{.Name}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
  cerniq-openbao-agent-api cerniq-openbao-agent-workers cerniq-openbao-agent-infra

# PgBouncer trebuie sa fie healthy
docker inspect -f '{{.Name}} {{.State.Status}} {{.State.Health.Status}}' cerniq-pgbouncer
```

### 2) DB smoke test (prod) prin PgBouncer + credențiale dinamice

```bash
. /opt/cerniq/runtime-secrets/api/api.env
PGCONNECT_TIMEOUT=5 PGPASSWORD="$POSTGRES_PASSWORD" \
  psql -h 172.29.20.11 -p 64033 -U "$POSTGRES_USER" -d cerniq -Atqc 'SELECT 1'
```

### 3) Redis smoke test (shared, prin gateway)

```bash
. /opt/cerniq/runtime-secrets/api/api.env
redis-cli -u "$REDIS_URL" PING
```

### 4) Observability quick checks

- Grafana: `https://grafana.neanelu.ro` (folder `Cerniq`)
- Loki: cauta logs cu query `{project="cerniq",environment="production"}`
- Prometheus: targets `cerniq-nodes` si `cerniq-docker` trebuie sa fie UP

## Documente conexe

- `docs/infrastructure/deployment-guide.md`
- `docs/infrastructure/network-topology.md`
- `docs/infrastructure/dns-configuration.md`
- `docs/infrastructure/observability-stack.md`
