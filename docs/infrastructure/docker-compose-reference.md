# CERNIQ.APP — Docker Compose Reference

## Ghid Complet pentru Serviciile Docker

**Versiune:** 3.0  
**Data:** 5 Februarie 2026  
**Locație:** `infra/docker/docker-compose.yml`

---

> ⚠️ **Notă:** Configurația efectivă poate varia. Consultați fișierul `.yml` pentru setările curente.

---

## SUMAR SERVICII

| Serviciu | Imagine | Port Cerniq | Port Container | Rol |
| -------- | ------- | ----------- | -------------- | --- |
| traefik | traefik:v3.6.6 | 64080, 64443, 64081 | 80, 443, 8080 | Reverse proxy, SSL |
| **openbao** | quay.io/openbao/openbao:2.2.0 | 64200 | 8200 | **Secrets Management** 🆕 |
| api | Custom build | 64000 | 64000 | REST API |
| workers | Custom build | - | - | BullMQ jobs |
| web-admin | Custom build | 64010 | 64010 | React frontend |
| postgres | postgis/postgis:18-3.6 | 64032 | 64032 | Database |
| redis | redis:8.4-alpine | 64039 | 64039 | Queues, cache |
| pgbouncer | bitnami/pgbouncer:1.23 | 64033 | 64033 | Connection pooling |
| signoz | signoz/signoz:v0.107.0 | 64089 | 3301 | Observability |

---

## DEFINIȚII SERVICII

### 1. Traefik (Edge Router)

```yaml
traefik:
  image: traefik:v3.6.6
  ports:
    - "64080:80"
    - "64443:443"
    - "64443:443/udp"  # HTTP/3 QUIC
    - "64081:64081"  # Dashboard (protected)
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

### 2. OpenBao (Secrets Management) 🆕

```yaml
openbao:
  image: quay.io/openbao/openbao:2.2.0
  container_name: cerniq-openbao
  cap_add:
    - IPC_LOCK  # Prevent memory swapping
  environment:
    - BAO_ADDR=http://127.0.0.1:8200
    - BAO_API_ADDR=http://openbao:8200
    - BAO_CLUSTER_ADDR=https://openbao:8201
    - BAO_LOG_LEVEL=info
  volumes:
    - openbao_data:/openbao/data
    - ./infra/config/openbao:/openbao/config:ro
  command: server -config=/openbao/config/openbao.hcl
  ports:
    - "127.0.0.1:64200:8200"  # API - localhost only
  networks:
    cerniq_backend:
      ipv4_address: 172.28.0.50
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", 
           "http://localhost:8200/v1/sys/health?standbyok=true"]
    interval: 10s
    timeout: 5s
    retries: 3
  deploy:
    resources:
      limits:
        memory: 512M
```

**Rol:** Centralized secrets management, dynamic credentials, PKI

**Engines:**

| Engine | Path | Purpose |
|--------|------|---------|
| KV v2 | `secret/` | Static secrets (Redis pass, JWT, API keys) |
| Database | `database/` | Dynamic PostgreSQL credentials |
| PKI | `pki_int/` | Internal TLS certificates |
| Transit | `transit/` | Encryption-as-a-service |

**Authentication:**

- AppRole per serviciu (api, workers, cicd)
- Agent sidecar pentru servicii (template rendering)

**Referință:** [OpenBao Setup Guide](./openbao-setup-guide.md), [ADR-0033](../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md)

---

### 3. API (Backend Fastify)

```yaml
api:
  build:
    context: ../../apps/api
    dockerfile: Dockerfile
  depends_on:
    openbao-agent-api:
      condition: service_healthy
  volumes:
    - api_secrets:/secrets:ro
  environment:
    - NODE_ENV=production
    - ENV_FILE=/secrets/api.env  # Rendered by OpenBao Agent
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:64000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  labels:
    - traefik.http.routers.api.rule=Host(`api.cerniq.app`)
```

**Secrets:** Via OpenBao Agent template → `/secrets/api.env`

**Rol:** REST API (Fastify 5.6.2), Webhooks, Authentication

---

### 4. Workers (BullMQ)

```yaml
workers:
  build:
    context: ../../packages/workers
    dockerfile: Dockerfile
  depends_on:
    openbao-agent-workers:
      condition: service_healthy
  volumes:
    - workers_secrets:/secrets:ro
  environment:
    - NODE_ENV=production
    - ENV_FILE=/secrets/workers.env  # Rendered by OpenBao Agent
  deploy:
    replicas: 1  # Concurrency managed internally
```

**Secrets:** Via OpenBao Agent template → `/secrets/workers.env`

**Rol:** 313 workeri logici, procesare cozi BullMQ

**Referință:** [Worker Queue Inventory](../specifications/worker-queue-inventory.md)

---

### 5. Web Admin (React Frontend)

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

### 6. PostgreSQL (Database)

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

### 7. PgBouncer (Connection Pooling)

```yaml
pgbouncer:
  image: bitnami/pgbouncer:1.23
  environment:
    - POSTGRESQL_HOST=postgres
    - POSTGRESQL_PORT=64032
    - POSTGRESQL_USERNAME=cerniq
    - POSTGRESQL_PASSWORD_FILE=/run/secrets/db_password
    - POSTGRESQL_DATABASE=cerniq
    - PGBOUNCER_POOL_MODE=transaction
    - PGBOUNCER_MAX_CLIENT_CONN=1000
    - PGBOUNCER_DEFAULT_POOL_SIZE=50
    - PGBOUNCER_MIN_POOL_SIZE=10
  ports:
    - "64033:64033"
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

### 8. Redis (Queues & Cache)

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

### 9. SigNoz (Observability)

```yaml
signoz:
  # SigNoz uses multiple containers via their docker-compose
  # Reference: https://signoz.io/docs/install/docker/
```

**Components:**

- ClickHouse (storage)
- Query Service
- Frontend (port 3301, mapat pe 64089)
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
  openbao_data:
    driver: local
  api_secrets:
    driver: local
  workers_secrets:
    driver: local
```

---

## SECRETS MANAGEMENT

> ⚠️ **v3.0 Change:** Docker secrets înlocuite cu OpenBao

### OpenBao Agent Sidecars

```yaml
# Agent pentru API
openbao-agent-api:
  image: quay.io/openbao/openbao:2.2.0
  command: agent -config=/openbao/config/agent-api.hcl
  volumes:
    - ./infra/config/openbao:/openbao/config:ro
    - ./infra/config/openbao/templates:/openbao/templates:ro
    - api_secrets:/secrets
    - ./secrets/api_role_id:/openbao/config/api_role_id:ro
    - ./secrets/api_secret_id:/openbao/config/api_secret_id:ro
  networks:
    - cerniq_backend
  healthcheck:
    test: ["CMD", "test", "-f", "/secrets/api.env"]
    interval: 5s
    timeout: 3s
    retries: 10

# Agent pentru Workers
openbao-agent-workers:
  image: quay.io/openbao/openbao:2.2.0
  command: agent -config=/openbao/config/agent-workers.hcl
  volumes:
    - ./infra/config/openbao:/openbao/config:ro
    - ./infra/config/openbao/templates:/openbao/templates:ro
    - workers_secrets:/secrets
    - ./secrets/workers_role_id:/openbao/config/workers_role_id:ro
    - ./secrets/workers_secret_id:/openbao/config/workers_secret_id:ro
  networks:
    - cerniq_backend
  healthcheck:
    test: ["CMD", "test", "-f", "/secrets/workers.env"]
```

### Fișiere Locale Rămase (AppRole credentials)

```
secrets/
├── api_role_id          # Generated by OpenBao
├── api_secret_id        # Rotated monthly
├── workers_role_id      # Generated by OpenBao
├── workers_secret_id    # Rotated monthly
└── openbao_unseal_keys.txt  # CRITICAL - backed up to Storage Box
```

**Referință:** [OpenBao Setup Guide](./openbao-setup-guide.md), [Secrets Rotation](./secrets-rotation-procedure.md)

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
- [OpenBao Setup Guide](./openbao-setup-guide.md)
- [Secrets Rotation Procedure](./secrets-rotation-procedure.md)
- [Worker Queue Inventory](../specifications/worker-queue-inventory.md)
- [Redis High Availability](./redis-high-availability.md)
- [ADR-0033: OpenBao Secrets Management](../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md)

---

**Actualizat:** 5 Februarie 2026
