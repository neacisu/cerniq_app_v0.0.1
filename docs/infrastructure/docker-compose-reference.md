# Docker Compose Reference

Acest document detaliază serviciile definite în `infra/docker/docker-compose.yml`.

> ⚠️ **Notă:** Configurația efectivă poate varia. Consultați fișierul `.yml` pentru setările curente.

## Services Definition

### 1. `traefik` (Edge Router)

- **Image**: `traefik:v3.6.6`
- **Ports**: 80:80, 443:443, 8080:8080 (Dashboard, protected)
- **Volumes**: `/var/run/docker.sock`, `./acme.json`
- **Role**: Reverse proxy, SSL termination, Load balancing automat.

### 2. `api` (Backend)

- **Context**: `apps/api` (Fastify)
- **Ports**: 64000 (Internal)
- **Env**: NODE_ENV=production, DB_URL, REDIS_URL
- **Healthcheck**: `curl -f http://localhost:64000/health || exit 1`
- **Role**: Gestionează toate request-urile REST și Webhooks.

### 3. `workers` (Background Jobs)

- **Context**: `packages/workers` (BullMQ)
- **Scale**: 1 replica (Concurrency gestionată intern în Node.js)
- **Role**: Procesează cozile definitie în Etapa 1-5 (313 workeri logici).

### 4. `web-admin` (Frontend)

- **Context**: `apps/web-admin` (React 19 + Refine)
- **Role**: Dashboard administrativ pentru operatori umani.

### 5. `postgres` (Database)

- **Image**: `postgis/postgis:18-3.6` (Based on PostgreSQL 18.1)
- **Ports**: 5432 (Host: 64032 dev)
- **Volumes**: `postgres_data:/var/lib/postgresql/data`
- **Turing**: Configurat pentru SSD NVMe.

### 6. `redis` (Queue & Cache)

- **Image**: `redis:7.4-alpine`
- **Ports**: 6379 (Host: 64039 dev)
- **Config**: AOF enabled, Maxmemory policy `noeviction` (pentru cozi).

### 7. `signoz` (Observability)

- **Stack**: ClickHouse + Query Service + Frontend + OtelCollector
- **Ports**: 3301 (Frontend)
- **Role**: Centralized logging, metrics, traces.

## Networking

Toate serviciile comunică printr-un network intern `cerniq-net`. Doar Traefik expune porturi publice.
