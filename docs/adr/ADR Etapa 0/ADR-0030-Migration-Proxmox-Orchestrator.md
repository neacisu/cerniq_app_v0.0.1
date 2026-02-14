# ADR-0030: Migration to Proxmox LXC + Orchestrator Ingress

## Status
Accepted

## Context

Cerniq.app migreaza de pe servere partajate vechi la infrastructura Proxmox cu LXC-uri dedicate pentru aplicatie:
- `CT 109` productie
- `CT 110` staging
- `CT 108` CI worker

Ingress-ul aplicatiei nu mai este gestionat local in stack-ul Cerniq, ci centralizat pe orchestratorul comun Traefik (`77.42.76.185`), prin file provider (`cerniq.yml`) cu reguli dedicate.

PostgreSQL nu mai ruleaza in Docker local in stack-ul Cerniq, ci extern pe `CT 107` (`10.0.1.107:5432`).
OpenBao server local este eliminat; Cerniq foloseste exclusiv OpenBao centralizat pe orchestrator.

## Decision

1. Eliminam Traefik intern, PostgreSQL local si OpenBao server local din `docker-compose`.
2. Pastram in stack doar componentele aplicatiei si sidecar-urile necesare:
   - PgBouncer
   - Redis
   - OpenBao Agents
   - Vector
   - OTEL Collector
   - cAdvisor
3. Configuratiile pe infrastructura partajata sunt strict aditive:
   - rute Traefik dedicate Cerniq
   - reguli FORWARD dedicate Cerniq
   - targets Prometheus dedicate Cerniq
   - allowlist observability extins doar pentru IP-urile Cerniq
4. Nu se modifica configuratia SSH/parole pe hosturile bare-metal in acest ADR.

## Consequences

### Pozitive
- Izolare operationala mai buna pentru Cerniq.
- Simplificare a ingress-ului prin orchestrator unic.
- Suprafata de administrare redusa in stack-ul aplicatiei.
- Aliniere cu observability centralizat (Grafana/Prometheus/Loki/Tempo).

### Trade-offs
- Dependenta de componente partajate (orchestrator, OpenBao centralizat).
- Necesita control atent al regulilor aditive pentru a nu afecta alte proiecte.

## Implementation Notes

- Deploy targete:
  - Staging: `10.0.1.110`
  - Production: `10.0.1.109`
- DB target:
  - PostgreSQL: `10.0.1.107:5432`
- Ingress target:
  - Orchestrator Traefik: `77.42.76.185`
