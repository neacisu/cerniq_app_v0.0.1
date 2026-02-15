# CERNIQ.APP — Docker Compose Reference (Noua arhitectura)

**Versiune:** 4.1  
**Actualizat:** 2026-02-15  
**Surse:** `infra/docker/docker-compose.yml`, `infra/docker/docker-compose.prod.yml`

## Principii

- Ingress public: exclusiv prin Traefik pe orchestrator (nu exista Traefik/Nginx in stack-ul Cerniq).
- OpenBao server: exclusiv pe orchestrator (`https://s3cr3ts.neanelu.ro`); pe CT109/CT110 rulam doar OpenBao agents.
- PostgreSQL: nativ pe CT107 (`10.0.1.107:5432`), nu in Docker.
- Redis: shared pe orchestrator, accesat intern prin gateway `hz.247` (`10.0.1.10:6379`).
- Observability: centralizat pe orchestrator; pe CT109/CT110 rulam doar Vector/OTEL/cAdvisor.

## Sumar servicii (infra-only, deja deployat)

| Serviciu | Imagine | Port host | Rol |
| --- | --- | --- | --- |
| `pgbouncer` | `edoburu/pgbouncer:latest` | (intern) `64033` | pooler catre CT107, auth_query (Postgres) |
| `openbao-agent-api` | `quay.io/openbao/openbao:2.5.0` | - | randeaza `/run/cerniq/runtime-secrets/api/api.env` |
| `openbao-agent-workers` | `quay.io/openbao/openbao:2.5.0` | - | randeaza `/run/cerniq/runtime-secrets/workers/workers.env` |
| `openbao-agent-infra` | `quay.io/openbao/openbao:2.5.0` | - | randeaza config PgBouncer in tmpfs |
| `vector` | `timberio/vector:0.53.0-debian` | - | push logs in Loki (orchestrator) |
| `otel-collector` | `otel/opentelemetry-collector-contrib:0.145.0` | `64070/64071` | OTLP endpoint local pt aplicatie |
| `cadvisor` | `gcr.io/cadvisor/cadvisor:latest` | `64094` | metrics Docker fara expunere daemon |

## Servicii aplicatie (NU sunt deployate inca)

`api`, `web`, `web-admin`, `workers` vor fi adaugate dupa ce aplicatia este pregatita.

## Notes (secrete / config)

- Fara secrete statice in fisiere `.txt` pe CT-uri.
- `openbao-agent-*` randeaza secretele in tmpfs (`/run/cerniq/runtime-secrets/...`).
- Redis/BullMQ izolare: prefix `cerniq:` (vezi `REDIS_PREFIX` / `BULLMQ_PREFIX` randate in env).

## Comenzi utile

```bash
cd /opt/cerniq/infra/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Documente conexe

- [Deployment Guide](./deployment-guide.md)
- [Network Topology](./network-topology.md)
- [DNS Configuration](./dns-configuration.md)
- [ADR-0033: OpenBao Secrets Management](../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md)

---

**Actualizat:** 2026-02-15
