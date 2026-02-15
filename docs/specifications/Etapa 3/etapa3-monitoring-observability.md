# Etapa 3 - Monitoring si Observability (stack centralizat)

> **Document Version**: 2.0.0  
> **Last Updated**: 2026-02-15  
> **Author**: Cerniq Development Team  
> **Status**: UPDATED (aliniat la infrastructura noua)  
> **Parent**: `docs/specifications/master-specification.md`

---

## Context

Documentele initiale pentru Etapa 3 au fost scrise pentru un stack local all-in-one (observability + storage local).
In implementarea curenta, observability este centralizata pe orchestrator si consumata de CT-urile dedicate Cerniq (CT109 productie, CT110 staging).

Surse de adevar:

- `docs/infrastructure/observability-stack.md`
- `docs/adr/ADR Etapa 0/ADR-E0-0034-Centralized-Observability-Stack-Orchestrator.md`
- `infrastructura_noua.md` (Implementare Cerniq.app)

---

## 1. Arhitectura (Etapa 3)

Principii:

- Ingest intern (fara expunere publica directa a componentelor de observability din CT-uri)
- Traces/Metrics prin OTEL Collector local (CT109/CT110) catre orchestrator
- Logs prin Vector local (CT109/CT110) catre Loki (orchestrator)
- UI centralizata in Grafana (orchestrator)

---

## 2. Endpoints canonice

Pe CT109 / CT110 (local):

- `otel-collector`:
  - OTLP gRPC: `:64070`
  - OTLP HTTP: `:64071`

Pe orchestrator (shared):

- Grafana: `https://grafana.neanelu.ro`
- Loki push: rutare interna (Traefik) pentru `logs-cerniq.neanelu.ro`
- Tempo ingest: rutare interna (Traefik) pentru `otel-cerniq.neanelu.ro` (OTLP)

Nota: traficul intern catre orchestrator poate fi trecut prin gateway-ul `hz.247` unde e necesar (conform `infrastructura_noua.md`).

---

## 3. Etichete si izolare

Minim necesar in logs/metrics/traces:

- `project=cerniq`
- `environment=staging|production`
- `service.name` (ex: `cerniq-api`, `cerniq-workers-e3`)
- `service.version` (din `CERNIQ_VERSION` / `APP_VERSION`)

Pentru Redis shared (BullMQ):

- prefix chei: `cerniq:` (izolare intre proiecte)

---

## 4. Validare (fara aplicatie)

Fara aplicatia deployata, validarile se limiteaza la infrastructura:

- OTEL Collector local porneste si expune `:64071/v1/traces` (accepta POST)
- Vector porneste si trimite loguri de infrastructura Docker la Loki (vizibile in Grafana Explore cu `{project="cerniq"}`)
- Prometheus scrape (orchestrator) pentru node-exporter/cAdvisor prin targeturile Cerniq

Validarea completa Etapa 3 (traces reale din AI Agent) necesita aplicatia deployata + instrumentata.

---

## 5. Deprecari

Nu folosim un stack local all-in-one in implementarea curenta. Orice referinta istorica la un astfel de stack trebuie tratata ca legacy.

