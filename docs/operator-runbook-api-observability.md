# Runbook operator — observabilitate API (Cerniq)

## Unde sunt semnalele

| Semnal | Locație |
| --- | --- |
| Metrici Prometheus | `GET /metrics` pe instanța API (acces restricționat; vezi `METRICS_ALLOW_CIDR` în `apps/api/src/plugins/metrics.ts`). |
| Trace-uri / metrici OTLP | Export către endpoint-ul configurat (`OTEL_EXPORTER_OTLP_ENDPOINT`); inițializare în `packages/observability/src/init.ts`. |
| Loguri structurate | stdout JSON (Pino); câmpuri `traceId`, `spanId`, `correlationId` în pluginul de request logging (`apps/api/src/plugins/request-logging.ts`). |

## Cum corelez o cerere

1. **Din log**: caută `correlationId` sau `traceId` pe linia de acces.
2. **În backend traces**: filtrează după același `trace_id` (W3C) sau `correlationId` dacă îl proiectați ca atribut.
3. **În Prometheus**: histograma `cerniq_http_request_duration_seconds` și counterul `cerniq_http_requests_total` folosesc label `route` = **șablon** Fastify (nu URL brut).

## Politică sampling (cost)

- Document complet: `docs/developer-guide/otel-sampling-policy.md`.
- Producție fără `OTEL_TRACES_SAMPLER`: implicit **ratio** (implicit 0.1), nu AlwaysOn.
- Pentru **100% erori** la export: configurați **tail sampling** în OpenTelemetry Collector (SDK head-based nu poate ști statusul 5xx înainte de încheierea handler-ului).

## Cardinalitate metrici

- Listă albă label-uri HTTP: `packages/observability/src/http-metric-label-allowlist.json`.
- CI: `node infra/scripts/audit_http_metric_label_allowlist.mjs`.
- Rate-limit: `cerniq_rate_limit_exceeded_total{route,surface}`; auth HTTP: `cerniq_http_auth_failures_total{route,reason,surface}` (`reason` = `unauthenticated` | `forbidden`; 403 pe `/metrics` nu intră în counterul de auth).

## Dashboard Grafana

- `infra/config/grafana/dashboards/cerniq/07-api-http-slo.json` — RED, p95/p99, 5xx, SSE, rate-limit, login.

## Smoke trace — familii de rute

- Matrice generată: `docs/generated/http-trace-smoke-matrix.json` (`infra/scripts/build_http_trace_smoke_matrix.py`).
- Test automat: `packages/observability/src/http-route-trace-smoke.test.ts`.

## Paritate OpenAPI

- `infra/scripts/compare_route_manifest_openapi.py` și `docs/developer-guide/openapi-route-parity.md`.
