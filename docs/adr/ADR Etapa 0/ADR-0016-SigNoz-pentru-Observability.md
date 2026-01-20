# ADR-0016: SigNoz pentru Observability

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm observability stack unificat pentru:

- APM (traces)
- Metrics
- Logs
- Alerting

## Decizie

Utilizăm **SigNoz v0.106.0** self-hosted cu ClickHouse.

## Consecințe

### Pozitive

- OpenTelemetry-native (OTLP)
- Single pane of glass pentru traces, metrics, logs
- ClickHouse pentru storage performant
- Zero dependențe SaaS externe

### Configurație

```yaml
services:
  signoz:
    image: signoz/signoz:v0.106.0
    ports:
      - "64080:8080"  # Internal 8080 exposed as 64080
    depends_on:
      - clickhouse
    networks:
      - cerniq_backend

  otel-collector:
    image: signoz/signoz-otel-collector:v0.129.12
    ports:
      - "64070:4317"  # gRPC OTLP
      - "64071:4318"  # HTTP OTLP
```

### Retention Policy

- Logs: 7 zile
- Metrics: 30 zile
- Traces: 15 zile
