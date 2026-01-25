# CERNIQ.APP — Docker Compose Reference

## Ghid Complet pentru Serviciile Docker

**Versiune:** 2.0  
**Data:** 20 Ianuarie 2026  
**Locație:** `infra/docker/docker-compose.yml`

---

> ⚠️ **Notă:** Configurația efectivă poate varia. Consultați fișierul `.yml` pentru setările curente.

---

## SUMAR SERVICII

| Serviciu | Imagine | Port Intern | Port Dev | Rol |
| -------- | ------- | ----------- | -------- | --- |
| traefik | traefik:v3.6.6 | 80, 443 | - | Reverse proxy, SSL |
| api | Custom build | 64000 | 64000 | REST API |
| workers | Custom build | - | - | BullMQ jobs |
| web-admin | Custom build | 64010 | 64010 | React frontend |
| postgres | postgis/postgis:18-3.6 | 5432 | 64032 | Database |
| redis | redis:8.4-alpine | 6379 | 64039 | Queues, cache |
| pgbouncer | bitnami/pgbouncer:1.23 | 6432 | 64033 | Connection pooling |
| signoz | signoz/signoz:v0.107.0 | 3301 | 64070 | Observability |

---

## DEFINIȚII SERVICII

### 1. Traefik (Edge Router)

```yaml
traefik:
  image: traefik:v3.6.6
  ports:
    - "80:80"
    - "443:443"
    - "8080:8080"  # Dashboard (protected)
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - ./acme.json:/acme.json
  command:
    - --api.dashboard=true
    - --entrypoints.web.address=:80
    - --entrypoints.websecure.address=:443
    - --certificatesresolvers.letsencrypt.acme.email=admin@cerniq.app
```

**Rol:** Reverse proxy, SSL termination via Let's Encrypt, Load balancing

---

### 2. API (Backend Fastify)

```yaml
api:
  build:
    context: ../../apps/api
    dockerfile: Dockerfile
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://cerniq:${DB_PASSWORD}@pgbouncer:6432/cerniq
    - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:64000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  labels:
    - traefik.http.routers.api.rule=Host(`api.cerniq.app`)
```

**Rol:** REST API (Fastify 5.6.2), Webhooks, Authentication

---

### 3. Workers (BullMQ)

```yaml
workers:
  build:
    context: ../../packages/workers
    dockerfile: Dockerfile
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://cerniq:${DB_PASSWORD}@pgbouncer:6432/cerniq
    - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
  deploy:
    replicas: 1  # Concurrency managed internally
```

**Rol:** 313 workeri logici, procesare cozi BullMQ

**Referință:** [Worker Queue Inventory](../specifications/worker-queue-inventory.md)

---

### 4. Web Admin (React Frontend)

```yaml
web-admin:
  build:
    context: ../../apps/web-admin
    dockerfile: Dockerfile
  labels:
    - traefik.http.routers.web.rule=Host(`app.cerniq.app`)
```

**Rol:** Dashboard administrativ (React 19 + Refine v5)

---

### 5. PostgreSQL (Database)

```yaml
postgres:
  image: postgis/postgis:18-3.6
  environment:
    - POSTGRES_USER=cerniq
    - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    - POSTGRES_DB=cerniq
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./postgresql.conf:/etc/postgresql/postgresql.conf
  command: postgres -c config_file=/etc/postgresql/postgresql.conf
  shm_size: 2g
```

**Extensions:** pgvector 0.8.1, PostGIS 3.6.1, pg_trgm

**Tuning:** Optimizat pentru 128GB RAM, NVMe SSD

---

### 6. PgBouncer (Connection Pooling) 🆕

```yaml
pgbouncer:
  image: bitnami/pgbouncer:1.23
  environment:
    - POSTGRESQL_HOST=postgres
    - POSTGRESQL_PORT=5432
    - POSTGRESQL_USERNAME=cerniq
    - POSTGRESQL_PASSWORD_FILE=/run/secrets/db_password
    - POSTGRESQL_DATABASE=cerniq
    - PGBOUNCER_POOL_MODE=transaction
    - PGBOUNCER_MAX_CLIENT_CONN=1000
    - PGBOUNCER_DEFAULT_POOL_SIZE=50
    - PGBOUNCER_MIN_POOL_SIZE=10
  ports:
    - "64033:6432"
  depends_on:
    - postgres
```

**Rol:** Connection pooling pentru 313 workeri

**Configuration:**

- **Pool Mode:** `transaction` (recomandat pentru BullMQ)
- **Max Connections:** 1000 clienți
- **Pool Size:** 50 conexiuni reale către PostgreSQL

**Beneficii:**

- Reduce conexiuni PostgreSQL de la ~313 la ~50
- Faster connection acquisition
- Protection against connection exhaustion

---

### 7. Redis (Queues & Cache)

```yaml
redis:
  image: redis:8.4-alpine
  command: >
    redis-server
    --appendonly yes
    --maxmemory 8gb
    --maxmemory-policy noeviction
    --requirepass ${REDIS_PASSWORD}
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
```

**Critical Config:**

- `maxmemory-policy: noeviction` — OBLIGATORIU pentru BullMQ
- `appendonly: yes` — Durability

**Referință:** [Redis High Availability](./redis-high-availability.md)

---

### 8. SigNoz (Observability)

```yaml
signoz:
  # SigNoz uses multiple containers via their docker-compose
  # Reference: https://signoz.io/docs/install/docker/
```

**Components:**

- ClickHouse (storage)
- Query Service
- Frontend (port 3301)
- OTel Collector

**Referință:** [Observability Guide](./observability-signoz.md)

---

## NETWORKING

```yaml
networks:
  cerniq-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

**Reguli:**

- Toate serviciile pe `cerniq-network`
- Doar Traefik expune porturi publice (80, 443)
- Comunicare internă via service names

---

## VOLUMES

```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

---

## SECRETS

```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt
  redis_password:
    file: ./secrets/redis_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

**Referință:** [Docker Secrets Guide](../specifications/Etapa%200/etapa0-docker-secrets-guide.md)

---

## COMENZI UTILE

```bash
# Start toate serviciile
docker compose up -d

# Verificare status
docker compose ps

# Logs pentru un serviciu
docker compose logs -f api

# Rebuild după modificări cod
docker compose build api workers
docker compose up -d api workers

# Scale workers (nu recomandat - folosește concurrency internă)
docker compose up -d --scale workers=2

# Cleanup
docker compose down -v  # Include volumes (DESTRUCTIV!)
```

---

## DOCUMENTE CONEXE

- [Deployment Guide](./deployment-guide.md)
- [Backup Strategy](./backup-strategy.md)
- [Worker Queue Inventory](../specifications/worker-queue-inventory.md)
- [Redis High Availability](./redis-high-availability.md)

---

**Actualizat:** 20 Ianuarie 2026
