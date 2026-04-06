# ADR-0022: Port Allocation Strategy

**Status:** Accepted  
**Data:** 2026-01-14 (Updated: 2026-01-15; **tabel aplicație corectat 2026-04-05** — aliniat la `etapa0-port-matrix.md` și `infra/docker/docker-compose.yml`)  
**Deciders:** Alex (1-Person-Team)

## Context

Serviciile Docker necesită porturi standardizate pentru evitarea conflictelor cu alte aplicații de pe server (Neanelu pe 65000+, GeniusERP pe 5000).

## Decizie

Cerniq.app folosește **range 64000-64099** pentru serviciile interne ale aplicației. Accesul extern este terminat centralizat în Traefik-ul orchestratorului.

### Port Allocation

Range-ul **64000–64099** rămâne decizia; detaliul pe serviciu este sursa unică în [`etapa0-port-matrix.md`](../../specifications/Etapa%200/etapa0-port-matrix.md). Rezumat (trebuie să coincidă cu Vite `apps/web` / `apps/web-admin` și compose):

| Port                          | Service                                                                          | Network                       |
| ----------------------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| **External (orchestrator)**   |                                                                                  |                               |
| 22                            | SSH                                                                              | Host                          |
| 80                            | Orchestrator Traefik HTTP → HTTPS redirect                                       | Host (orchestrator)           |
| 443                           | Orchestrator Traefik HTTPS (TLS termination)                                     | Host (orchestrator)           |
| **Application (64000-64019)** |                                                                                  |                               |
| 64000                         | Web (Vite dev / Nginx+React în imagine)                                          | cerniq_public                 |
| 64010                         | API (Fastify)                                                                    | cerniq_public, cerniq_backend |
| 64012                         | Web Admin                                                                        | cerniq_public                 |
| 64011                         | *(rezervat / HMR viitor dacă e nevoie)*                                          | —                             |
| **Database (64030-64049)**    |                                                                                  |                               |
| 64033                         | PgBouncer                                                                        | cerniq_backend + cerniq_data  |
| 5432                          | PostgreSQL (CT107, nativ)                                                        | external                      |
| 6379                          | Redis shared (orchestrator, via gateway hz.247)                                  | external (internal)           |
| **Sidecar / observabilitate** |                                                                                  |                               |
| 64080                         | Monitoring API (Fastify)                                                         | cerniq_backend                |
| 64094                         | cAdvisor                                                                         | cerniq_backend                |
| 64095                         | PgBouncer exporter (host 64095 → 9127 în container)                              | cerniq_data                   |
| **OTLP local 64070–64071**    | **Eliminat** — OTLP la orchestrator (`otel-cerniq.neanelu.ro`); vezi ADR-E0-0034 | —                             |

### Architecture

```text
Internet → Traefik orchestrator (80/443) → LXC Cerniq (:64000 web, :64010 API, :64012 admin)
```

## Consecințe

### Pozitive

- Evitare conflicte cu Neanelu (65000+) și GeniusERP (5000)
- Porturi database/cache nu sunt expuse public
- Consistență în naming și alocare
- Security through obscurity (layer aditional)

### Negative

- Routing-ul public este gestionat de Traefik orchestrator (fără nginx local în stack-ul Cerniq)
- Dezvoltatorii trebuie să cunoască porturile non-standard

## Referințe

- [etapa0-port-matrix.md](../../specifications/Etapa%200/etapa0-port-matrix.md)
- [Neanelu Port Conventions](file:///var/www/ShopifyManager/docs/Port_Conventions.md)
