# CERNIQ.APP - ETAPA 3: RUNBOOK MONITORING (stack centralizat)

> **Versiune:** 2.0  
> **Data:** 2026-02-15  
> **Status:** UPDATED (aliniat la infrastructura noua)

---

## Scop

Runbook operational pentru observability Etapa 3 (AI Sales Agent), aliniat la arhitectura curenta:

- Grafana/Prometheus/Loki/Tempo ruleaza centralizat pe orchestrator
- CT109 (prod) si CT110 (staging) ruleaza doar agenti/collectors (Vector, OTEL Collector, cAdvisor, node-exporter)

Referinte:

- `docs/infrastructure/observability-stack.md`
- `docs/adr/ADR Etapa 0/ADR-E0-0034-Centralized-Observability-Stack-Orchestrator.md`
- `infrastructura_noua.md` (Implementare Cerniq.app)

---

## URL-uri / Endpoints

- Grafana (orchestrator): `https://grafana.neanelu.ro`
- Logs (Explore / Loki): filtreaza `{project="cerniq", environment="production"}` sau `staging`
- Traces (Explore / Tempo): disponibil dupa instrumentarea aplicatiei Etapa 3

Local (CT109/CT110):

- OTEL Collector: `http://localhost:64071/v1/traces` (OTLP HTTP)
- OTEL Collector: `grpc://localhost:64070` (OTLP gRPC)

---

## Checklist diagnostic rapid

### 1) Confirmare pipeline logs (Vector -> Loki)

- In Grafana Explore (Loki), cauta:
  - `{project="cerniq"}`
  - `{project="cerniq", environment="production"}`
  - error keywords: `"error"`, `"exception"`, `"fatal"`

### 2) Confirmare pipeline traces (OTEL -> Tempo) - necesita aplicatie

- In Grafana Explore (Tempo), cauta `service.name="cerniq-api"` (sau worker Etapa 3).
- Daca nu apar trace-uri: verifica ca aplicatia exporta OTLP catre OTEL Collector local (CT109/CT110).

### 3) Confirmare Prometheus targets (infra)

- In Prometheus (orchestrator), verifica targeturi pentru:
  - node-exporter CT109/CT110
  - cAdvisor CT109/CT110

Nota: in implementarea curenta, scraping-ul se face prin gateway-ul `hz.247` unde e necesar.

---

## Operatii uzuale

### Restart collectors (CT109/CT110)

```bash
docker compose -f /var/www/CerniqAPP/infra/docker/docker-compose.yml up -d --force-recreate vector otel-collector cadvisor
```

### Verificare health local (CT109/CT110)

```bash
docker compose -f /var/www/CerniqAPP/infra/docker/docker-compose.yml ps
docker compose -f /var/www/CerniqAPP/infra/docker/docker-compose.yml logs --tail=100 vector
docker compose -f /var/www/CerniqAPP/infra/docker/docker-compose.yml logs --tail=100 otel-collector
```
