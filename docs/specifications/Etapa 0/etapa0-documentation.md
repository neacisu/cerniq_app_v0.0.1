# CERNIQ.APP — ETAPA 0 (documentatie) - superseded

## Versiunea 3.0 | 2026-02-15

Acest document a descris initial un stack local (Traefik + PostgreSQL + Redis + observability local) in cadrul proiectului.
In implementarea curenta, arhitectura este diferita si acest document este **superseded**.

## Surse de adevar (curent)

- `infrastructura_noua.md` (implementarea reala in noua infrastructura)
- `docs/infrastructure/deployment-guide.md`
- `docs/infrastructure/network-topology.md`
- `docs/infrastructure/dns-configuration.md`
- `docs/specifications/Etapa 0/etapa0-port-matrix.md`
- `docs/specifications/Etapa 0/etapa0-runbook-operational.md`

## ADR-uri relevante

- ADR-0030: Migrare Proxmox LXC + ingress centralizat (orchestrator)
- ADR-0031: Observability centralizata (Grafana/Prometheus/Loki/Tempo/Vector/OTEL)
- ADR-0033: OpenBao centralizat (secrete + credențiale dinamice)
- ADR-0004: PostgreSQL extern (CT107, nativ)
