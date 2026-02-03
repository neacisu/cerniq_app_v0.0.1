# Network Topology - Cerniq.app

> **Version:** 1.0.0  
> **Last Updated:** 2026-02-03  
> **References:** ADR-0015, ADR-0022

## Overview

Cerniq.app utilizează trei rețele Docker izolate pentru a asigura separarea traficului și securitatea serviciilor.

## Network Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL ACCESS                                   │
│                                                                             │
│    Internet ───► nginx (80/443) ───► proxy_pass ───► Traefik (64xxx)       │
│                   TLS Termination                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         cerniq_public (172.20.0.0/24)                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │  │
│  │   │   Traefik   │    │   Web App   │    │  Admin App  │              │  │
│  │   │   (proxy)   │    │   (React)   │    │   (React)   │              │  │
│  │   │   64010     │    │   64010     │    │   64012     │              │  │
│  │   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘              │  │
│  │          │                  │                  │                      │  │
│  └──────────┼──────────────────┼──────────────────┼──────────────────────┘  │
│             │                  │                  │                         │
└─────────────┼──────────────────┼──────────────────┼─────────────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      cerniq_backend (172.21.0.0/24)                         │
│                           internal: true                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │  │
│  │   │  Fastify    │    │   Workers   │    │   SigNoz    │              │  │
│  │   │    API      │    │  (AI/Enr)   │    │    OTel     │              │  │
│  │   │   64000     │    │   64020+    │    │ 64070-64083 │              │  │
│  │   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘              │  │
│  │          │                  │                  │                      │  │
│  └──────────┼──────────────────┼──────────────────┼──────────────────────┘  │
│             │                  │                  │                         │
└─────────────┼──────────────────┼──────────────────┼─────────────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        cerniq_data (172.22.0.0/24)                          │
│                           internal: true                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │  │
│  │   │ PostgreSQL  │    │    Redis    │    │  PgBouncer  │              │  │
│  │   │ + PostGIS   │    │   (cache)   │    │   (pool)    │              │  │
│  │   │   64032     │    │   64039     │    │   64042     │              │  │
│  │   └─────────────┘    └─────────────┘    └─────────────┘              │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Network Details

### cerniq_public (172.20.0.0/24)

| Property | Value |
|----------|-------|
| **Subnet** | 172.20.0.0/24 |
| **Gateway** | 172.20.0.1 |
| **Driver** | bridge |
| **Internal** | false (external access allowed) |
| **Purpose** | Servicii accesibile extern prin Traefik |

**Servicii conectate:**
- Traefik (reverse proxy)
- Web App (React frontend)
- Admin App (React admin)
- Monitoring UI (când este expus)

### cerniq_backend (172.21.0.0/24)

| Property | Value |
|----------|-------|
| **Subnet** | 172.21.0.0/24 |
| **Gateway** | 172.21.0.1 |
| **Driver** | bridge |
| **Internal** | true (NO external access) |
| **Purpose** | Comunicare internă API și Workers |

**Servicii conectate:**
- Fastify API
- AI Workers
- Enrichment Workers
- Outreach Workers
- SigNoz OTel Collector
- ClickHouse (metrics storage)

**⚠️ IMPORTANT:** Această rețea este `internal: true` - containerele NU pot accesa internetul direct.

### cerniq_data (172.22.0.0/24)

| Property | Value |
|----------|-------|
| **Subnet** | 172.22.0.0/24 |
| **Gateway** | 172.22.0.1 |
| **Driver** | bridge |
| **Internal** | true (NO external access) |
| **Purpose** | Database și cache strict intern |

**Servicii conectate:**
- PostgreSQL 18.1 cu PostGIS
- Redis 8.4.0
- PgBouncer (connection pooling)

**⚠️ CRITICAL:** Această rețea este strict internă. Bazele de date NU sunt expuse extern.

## Port Matrix (ADR-0022)

### External Ports (nginx)

| Port | Protocol | Service |
|------|----------|---------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP → HTTPS redirect |
| 443 | TCP | HTTPS (TLS termination) |

### Application Ports (64000-64019)

| Port | Service | Network | Description |
|------|---------|---------|-------------|
| 64000 | Fastify API | cerniq_backend | Main API endpoint |
| 64010 | React Web | cerniq_public | Frontend web app |
| 64011 | Vite HMR | cerniq_public | Hot reload (dev only) |
| 64012 | React Admin | cerniq_public | Admin dashboard |

### Database Ports (64030-64049)

| Port | Service | Network | Description |
|------|---------|---------|-------------|
| 64032 | PostgreSQL | cerniq_data | Primary database |
| 64039 | Redis | cerniq_data | Cache & queues |
| 64042 | PgBouncer | cerniq_data | Connection pooling |

### Observability Ports (64070-64089)

| Port | Service | Network | Description |
|------|---------|---------|-------------|
| 64070 | OTel gRPC | cerniq_backend | OTLP gRPC receiver |
| 64071 | OTel HTTP | cerniq_backend | OTLP HTTP receiver |
| 64080 | SigNoz UI | cerniq_backend | Monitoring dashboard |
| 64081 | Traefik Metrics | cerniq_backend | Prometheus metrics |
| 64082 | ClickHouse HTTP | cerniq_backend | ClickHouse interface |
| 64083 | ClickHouse Native | cerniq_backend | ClickHouse protocol |

### Infrastructure Ports (64090-64099)

| Port | Service | Network | Description |
|------|---------|---------|-------------|
| 64093 | Docker Metrics | Host | Docker daemon metrics |

## Security Rules

### Network Isolation Rules

1. **cerniq_data → Internet:** ❌ BLOCKED (internal: true)
2. **cerniq_backend → Internet:** ❌ BLOCKED (internal: true)
3. **cerniq_public → Internet:** ✅ ALLOWED (for external API calls)
4. **cerniq_backend → cerniq_data:** ✅ ALLOWED (services attached to both)
5. **cerniq_public → cerniq_backend:** ✅ ALLOWED (services attached to both)
6. **cerniq_public → cerniq_data:** ❌ NOT DIRECT (must go through backend)

### Firewall Rules (ufw)

```bash
# Default: deny incoming, allow outgoing
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp

# HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Block direct access to application ports from external
# (handled by nginx reverse proxy)
ufw deny 64000:64099/tcp
```

### Docker Network Commands

```bash
# Create networks manually (if needed)
docker network create --driver bridge \
  --subnet 172.20.0.0/24 \
  --gateway 172.20.0.1 \
  cerniq_public

docker network create --driver bridge \
  --internal \
  --subnet 172.21.0.0/24 \
  --gateway 172.21.0.1 \
  cerniq_backend

docker network create --driver bridge \
  --internal \
  --subnet 172.22.0.0/24 \
  --gateway 172.22.0.1 \
  cerniq_data

# Inspect network
docker network inspect cerniq_public

# List connected containers
docker network inspect cerniq_backend --format '{{range .Containers}}{{.Name}} {{end}}'
```

## Service Network Attachment Matrix

| Service | cerniq_public | cerniq_backend | cerniq_data |
|---------|:-------------:|:--------------:|:-----------:|
| Traefik | ✅ | ✅ | ❌ |
| Web App | ✅ | ❌ | ❌ |
| Admin App | ✅ | ❌ | ❌ |
| API | ✅ | ✅ | ✅ |
| Workers | ❌ | ✅ | ✅ |
| PostgreSQL | ❌ | ❌ | ✅ |
| Redis | ❌ | ❌ | ✅ |
| PgBouncer | ❌ | ✅ | ✅ |
| SigNoz | ❌ | ✅ | ❌ |

## Troubleshooting

### Check Network Connectivity

```bash
# From API container to PostgreSQL
docker exec cerniq-api ping -c 3 postgres

# Check DNS resolution
docker exec cerniq-api nslookup postgres

# Test port connectivity
docker exec cerniq-api nc -zv postgres 64032
```

### Common Issues

1. **Container can't reach database**
   - Verify container is attached to `cerniq_data` network
   - Check service name in connection string

2. **External requests failing**
   - Verify service is on `cerniq_public` network
   - Check Traefik routing rules

3. **Inter-service communication failing**
   - Ensure both services share at least one common network

## References

- [ADR-0015: Docker Containerization Strategy](../adr/ADR%20Etapa%200/ADR-0015-Docker-Containerization-Strategy.md)
- [ADR-0022: Port Allocation Strategy](../adr/ADR%20Etapa%200/ADR-0022-Port-Allocation-Strategy.md)
- [ADR-0027: Container Resource Limits](../adr/ADR%20Etapa%200/ADR-0027-Container-Resource-Limits.md)
- [docker-compose.yml](../../infra/docker/docker-compose.yml)
