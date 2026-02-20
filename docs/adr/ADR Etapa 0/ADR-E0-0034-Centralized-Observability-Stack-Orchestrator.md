# ADR-E0-0034: Centralized Observability Stack (Orchestrator)

**Status:** Accepted  
**Data:** 2026-02-15  
**Deciders:** Alex (1-Person-Team)

**Supersedes:** ADR-0016 (SigNoz pentru Observability)

## Context

Initial, planul de observability includea SigNoz + ClickHouse. In paralel, pe
infrastructura noua exista deja un stack centralizat operational pe orchestrator:

- Grafana
- Prometheus
- Loki
- Tempo
- Vector
- OpenTelemetry Collector

Cerinta principala pentru Cerniq.app este:

- observability si logs sa fie centralizate, aditive si izolabile per proiect
- traficul de ingest sa fie intern (fara expunere publica directa a CT-urilor)
- sa nu afectam alte proiecte care folosesc deja observability pe orchestrator

## Decizie

Adoptam stack-ul centralizat de pe orchestrator pentru Cerniq.app:

1. Logs: Vector (pe CT109/CT110) -> Loki (orchestrator) prin endpoint dedicat Cerniq.
2. Metrics: Prometheus (orchestrator) scrape node-exporter + cAdvisor din CT-uri.
3. Traces: OTEL Collector local (CT109/CT110) expune OTLP 4317/4318 pentru aplicatie si poate forwarda catre orchestrator.
4. Dashboards: Grafana (orchestrator) cu folder dedicat `Cerniq` (provisioning).
5. Alerte: reguli Prometheus dedicate Cerniq-only (fisier separat).

## Implementare (stare curenta)

### Endpoints

- Grafana: `https://grafana.neanelu.ro` (orchestrator)
- Loki push Cerniq-only: `https://logs-cerniq.neanelu.ro/loki/api/v1/push`
- OTLP Cerniq-only: `https://otel-cerniq.neanelu.ro` (routing intern prin Traefik)

### Izolare si securitate (ingest intern)

Pentru a evita probleme de handshake intre VLAN/vSwitch si pentru a pastra ingest intern:

- CT109/CT110 rezolva domeniile de ingest prin `/etc/hosts`/`extra_hosts` catre VIP `hz.247`:
  - `logs-cerniq.neanelu.ro -> 10.0.1.10`
  - `otel-cerniq.neanelu.ro -> 10.0.1.10`
- Pe `hz.247` exista gateway L4 (HAProxy) care forwardeaza catre orchestrator (Traefik).
- Traefik allowlist foloseste IP-ul gateway-ului intern (`10.0.1.10/32`) pentru ingest.

### Metrici

- node-exporter pe CT107/108/109/110
- cAdvisor pe CT109/CT110 (port host `64094`)
- scrape se face prin gateway-ul "pull" (orchestrator -> hz.247 VIP -> CT109/CT110) pentru stabilitate.

### Dashboards si alerte (Cerniq-only, aditiv)

- Prometheus rules: `/opt/observability/prometheus/rules/infra-cerniq-alerts.yml`
- Grafana dashboards provisioning:
  - provider `Cerniq` (folder) + dashboards sub `/opt/observability/grafana/dashboards/cerniq/`

## Consecinte

### Pozitive

- Refolosim stack-ul deja operational, reducand complexitatea.
- Izolare pe proiect prin labels (`project="cerniq"`, `environment="staging|production"`).
- Configuratii strict aditive pe orchestrator.

### Trade-offs

- Dependenta de orchestrator (single control plane pentru observability).
- Unele panouri/alerte avansate necesita metrici/exporters dedicate (ex: PgBouncer/Redis queue depths).
