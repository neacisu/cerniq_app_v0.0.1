# Observability Stack (Orchestrator) - Cerniq.app

Aceasta pagina documenteaza observability pentru Cerniq.app folosind stack-ul
centralizat de pe orchestrator (Grafana/Prometheus/Loki/Tempo/Vector/OTEL).

## 1. Acces

- Grafana: `https://grafana.neanelu.ro`

## 2. Logs (Vector -> Loki)

- Endpoint dedicat Cerniq (ingest): `https://logs-cerniq.neanelu.ro/loki/api/v1/push`
- Vector ruleaza pe CT109/CT110 in Docker stack-ul Cerniq si colecteaza loguri din Docker.
- Labels minime:
  - `project="cerniq"`
  - `environment="staging|production"`

Notita (trafic intern):

- CT109/CT110 folosesc rezolvare interna catre gateway-ul `hz.247` (`10.0.1.10`) pentru a evita iesire prin IP public/NAT si pentru stabilitate.

## 3. Metrics (Prometheus)

Prometheus ruleaza pe orchestrator si face scrape pentru:

- `node-exporter` (CT107/108/109/110)
- `cAdvisor` (CT109/CT110)

## 4. Traces (OTEL)

- Ghid aplicație (instrumentare Fastify/HTTP, env vars, bootstrap): [`docs/developer-guide/http-server-opentelemetry-enterprise.md`](../developer-guide/http-server-opentelemetry-enterprise.md)
- `otel-collector` local pe CT109/CT110 expune:
  - OTLP gRPC: `4317` (mapat host `64070`)
  - OTLP HTTP: `4318` (mapat host `64071`)
- Forward catre orchestrator se face prin route dedicata (Traefik).

## 5. Dashboards si alerte (Cerniq-only)

- Folder Grafana: `Cerniq` (dashboards provisionate)
- Prometheus rules Cerniq-only: `/opt/observability/prometheus/rules/infra-cerniq-alerts.yml`
