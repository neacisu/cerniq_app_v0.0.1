# ADR-0022: Port Allocation Strategy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Serviciile Docker necesită porturi standardizate pentru evitarea conflictelor.

## Decizie

| Range | Tip Serviciu | Exemple |
| ----- | ------------ | ------- |
| 80, 443 | Traefik (public) | HTTP, HTTPS |
| 3000-3099 | Frontend | React dev server |
| 4000-4099 | API Services | Fastify API (4000) |
| 4317-4318 | OpenTelemetry | OTLP gRPC/HTTP |
| 5000-5099 | Background Workers | Python workers |
| 5432 | PostgreSQL | Database (intern only!) |
| 6379 | Redis | Cache/Queue (intern only!) |
| 6432 | PgBouncer | Connection pool |
| 8080 | SigNoz UI | Observability dashboard |
| 9000-9099 | Monitoring | Prometheus, ClickHouse |
| 9323 | Docker metrics | Prometheus scraping |
