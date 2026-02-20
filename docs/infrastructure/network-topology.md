# Network Topology - Cerniq.app (LXC + Orchestrator)

> **Version:** 2.0.0  
> **Last Updated:** 2026-02-15  
> **References:** ADR-0015, ADR-0022, ADR-0030

## Overview

- Ingress public: exclusiv prin Traefik pe orchestrator (`77.42.76.185`).
- CT-urile Cerniq (prod/staging) NU expun servicii direct pe IP public.
- PostgreSQL ruleaza nativ pe CT107 (`10.0.1.107:5432`).
- Redis este shared pe orchestrator (`10.0.0.2:6379`) si este accesat de CT-uri prin gateway-ul intern `hz.247` (`10.0.1.10:6379`) pentru stabilitate.
- OpenBao/Observability sunt centralizate pe orchestrator si accesate intern prin gateway-ul `hz.247` (`10.0.1.10:443`).

## Diagram (conceptual)

```text
Internet
  |
  v
orchestrator (Traefik 80/443, IP public 77.42.76.185)
  |
  | (pull, intern) 10.0.0.2 -> hz.247 VIP 10.0.1.10:29xxx/19xxx -> CT109/CT110
  v
CT109 (prod) / CT110 (staging)
  |
  | Docker networks (in-LXC): 172.29.10/20/30 (pre-create, external)
  |
  +--> PgBouncer (64033) --> CT107 Postgres (10.0.1.107:5432)
  +--> OpenBao agents --> hz.247 VIP 10.0.1.10 (443) --> orchestrator (Traefik routes)
  +--> Redis (shared) --> hz.247 VIP 10.0.1.10 (6379) --> orchestrator redis-shared (10.0.0.2:6379)
```

## Docker networks (CT109/CT110)

Subnets standardizate:

- `cerniq_public`: `172.29.10.0/24`
- `cerniq_backend`: `172.29.20.0/24`
- `cerniq_data`: `172.29.30.0/24`

Nota:

- Retelele NU sunt create cu `--internal` deoarece stack-ul are nevoie de egress controlat (OpenBao/observability prin gateway).
- Egress-ul este controlat la nivel LXC/host (iptables pe `hz.247`), nu prin Docker `--internal`.

### Create networks (idempotent)

```bash
docker network create --driver bridge --subnet 172.29.10.0/24 cerniq_public 2>/dev/null || true
docker network create --driver bridge --subnet 172.29.20.0/24 cerniq_backend 2>/dev/null || true
docker network create --driver bridge --subnet 172.29.30.0/24 cerniq_data 2>/dev/null || true
```

## Ports (Cerniq)

Porturi relevante in CT109/CT110 (host):

| Port    | Scop                       |
| ------- | -------------------------- |
| `64033` | PgBouncer (in-container)   |
| `64094` | cAdvisor (metrics Docker)  |
| `64095` | PgBouncer exporter metrics |

Porturi externe publice:

- doar `80/443` pe orchestrator (Traefik), cu routing spre CT109/CT110 prin gateway `hz.247` (10.0.1.10).

## Troubleshooting (verificari rapide)

```bash
# Pe CT109/CT110: confirmare OpenBao intern prin gateway
getent hosts s3cr3ts.neanelu.ro

# Pe orchestrator: scrape prin pull gateway (exemple)
curl -fsS http://10.0.1.10:29100/metrics >/dev/null
curl -fsS http://10.0.1.10:29094/metrics >/dev/null
```

1. **Container can't reach database**
   - Verify container is attached to `cerniq_data` network
   - Check service name in connection string

2. **External requests failing**
   - Verify service is on `cerniq_public` network
   - Check Traefik routing rules

3. **Inter-service communication failing**
   - Ensure both services share at least one common network

## References

- [ADR-0015: Docker Containerization Strategy](../adr/ADR%20Etapa%200/ADR-0015-Docker-Containerization-Strategy.md)
- [ADR-0022: Port Allocation Strategy](../adr/ADR%20Etapa%200/ADR-0022-Port-Allocation-Strategy.md)
- [ADR-0027: Container Resource Limits](../adr/ADR%20Etapa%200/ADR-0027-Container-Resource-Limits.md)
- [docker-compose.yml](../../infra/docker/docker-compose.yml)
