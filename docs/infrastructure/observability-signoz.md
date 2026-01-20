# Observability cu SigNoz

**Cerniq.app** utilizează [SigNoz](https://signoz.io/) ca soluție unificată de observabilitate (APM, Logs, Traces, Metrics), bazată pe OpenTelemetry.

## 1. Acces Dashboard

- **URL Local**: `http://localhost:3301`
- **URL Producție**: `https://monitor.cerniq.app` (protejat prin BasicAuth în Traefik)
- **Versiune**: v0.107.0

## 2. Integrare Servicii (OpenTelemetry)

Serviciile Node.js (API, Workers) sunt instrumentate folosind SDK-ul OpenTelemetry Auto-Instrumentation.

### Variabile de Mediu Necesare

```bash
# Endpoint-ul OTLP gRPC al colectorului SigNoz
OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz-otel-collector:4317

# Identificarea serviciului
OTEL_SERVICE_NAME=cerniq-api  # sau cerniq-workers
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production
```

## 3. Ce Monitorizăm?

### 3.1 Metrics (RED Method)

- **Rate**: Request-uri pe secundă (RPS) per endpoint.
- **Errors**: Rata de erori 5xx și 4xx.
- **Duration**: Latency p95 și p99.

### 3.2 Logs Correlation

Logs sunt structurate JSON (Pino logger) și includ automat `trace_id`.
În SigNoz, puteți naviga de la un Trace direct la Logs asociate ("Logs for this trace").

### 3.3 Infrastructure

- CPU/RAM usage per container.
- Redis memory fragmentation.
- PostgreSQL active connections & lock waits.

## 4. Alerte Critice

Alertele sunt configurate în SigNoz pentru a notifica pe Slack/Discord:

- **High Error Rate**: > 1% erori pe API timp de 5 min.
- **Worker Lag**: > 1000 job-uri în așteptare (vezi Queue Monitoring).
- **Phone Offline**: Logs pattern matching pentru "phone disconnected".
