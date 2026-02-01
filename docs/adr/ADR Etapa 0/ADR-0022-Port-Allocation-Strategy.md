# ADR-0022: Port Allocation Strategy

**Status:** Accepted  
**Data:** 2026-01-14 (Updated from 2026-01-15)  
**Deciders:** Alex (1-Person-Team)

## Context

Serviciile Docker necesită porturi standardizate pentru evitarea conflictelor cu alte aplicații de pe server (Neanelu pe 65000+, GeniusERP pe 5000).

## Decizie

Cerniq.app folosește **range 64000-64099** pentru toate serviciile interne. Acces extern doar prin nginx reverse proxy pe 80/443.

### Port Allocation

| Port | Service | Network |
| ---- | ------- | ------- |
| **External (nginx)** | | |
| 22 | SSH | Host |
| 80 | nginx HTTP → HTTPS redirect | Host |
| 443 | nginx HTTPS (TLS termination) | Host |
| **Application (64000-64019)** | | |
| 64000 | Fastify API | cerniq_backend |
| 64010 | React Web | cerniq_public |
| 64011 | Vite HMR (dev only) | cerniq_public |
| **Database (64030-64049)** | | |
| 64032 | PostgreSQL | cerniq_data |
| 64039 | Redis | cerniq_data |
| 64042 | PgBouncer | cerniq_data |
| **Observability (64070-64089)** | | |
| 64070 | OTel gRPC | cerniq_backend |
| 64071 | OTel HTTP | cerniq_backend |
| 64080 | SigNoz UI | cerniq_backend |
| 64081 | Traefik Metrics | cerniq_backend |
| 64082 | ClickHouse HTTP | cerniq_backend |
| 64083 | ClickHouse Native | cerniq_backend |

### Architecture

```text
nginx (80/443) → proxy_pass → localhost:64000-64099
```

## Consecințe

### Pozitive

- Evitare conflicte cu Neanelu (65000+) și GeniusERP (5000)
- Porturi database/cache nu sunt expuse public
- Consistență în naming și alocare
- Security through obscurity (layer aditional)

### Negative

- Necesită nginx config pentru reverse proxy
- Dezvoltatorii trebuie să cunoască porturile non-standard

## Referințe

- [etapa0-port-matrix.md](../../specifications/Etapa%200/etapa0-port-matrix.md)
- [Neanelu Port Conventions](file:///var/www/ShopifyManager/docs/Port_Conventions.md)
