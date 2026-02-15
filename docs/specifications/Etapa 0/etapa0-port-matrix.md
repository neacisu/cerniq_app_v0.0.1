# CERNIQ.APP — ETAPA 0: PORT MATRIX COMPLET

## Documentație Porturi și Firewall Rules

### Versiunea 2.0 | 14 Ianuarie 2026

---

## PORT ALLOCATION MATRIX

> [!IMPORTANT]
> Cerniq.app folosește range **64000-64099** pentru toate serviciile interne.
> Acces extern terminat in Traefik orchestrator pe 80/443.

## EXTERNAL PORTS (Expuse Public via orchestrator Traefik)

| Port | Protocol | Service | Network | Firewall Rule |
| ---- | -------- | ------- | ------- | ------------- |
| 22 | TCP | SSH | Host | ALLOW from admin IPs only |
| 80 | TCP | Orchestrator Traefik HTTP | Host | ALLOW all (redirect to 443) |
| 443 | TCP | Orchestrator Traefik HTTPS | Host | ALLOW all |
| 443 | UDP | HTTP/3 QUIC | Host | ALLOW all (optional) |

## INTERNAL PORTS — CERNIQ.APP (64000-64099)

### Application Services

| Port | Protocol | Service | Network | Access |
| ---- | -------- | ------- | ------- | ------ |
| 64000 | TCP | Fastify API | cerniq_backend | Internal/Debug |
| 64010 | TCP | React Web | cerniq_public | Internal/Debug |
| 64011 | TCP | Vite HMR | cerniq_public | Dev only |
| 64012 | TCP | React Admin | cerniq_public | Internal/Debug |
| 64033 | TCP | PgBouncer | cerniq_backend + cerniq_data | Internal only |
| 64070 | TCP | OTLP gRPC | cerniq_backend | Internal only |
| 64071 | TCP | OTLP HTTP | cerniq_backend | Internal only |
| 64094 | TCP | cAdvisor | cerniq_backend | Internal only |

### Reserved

| Range | Purpose |
| ----- | ------- |
| 64090-64099 | Future workers, services |

---

## PORT RANGES COMPARISON

| Application | Range | Status |
| ----------- | ----- | ------ |
| Cerniq.app | 64000-64099 | ✅ Active |
| Neanelu | 65000-65099 | ✅ In use |
| GeniusERP | 5000 | ✅ In use |

---

## NETWORK TOPOLOGY

```text
                    INTERNET
                        │
                        ▼
    ┌───────────────────────────────────────┐
    │           UFW FIREWALL                │
    │  Allow: 22 (admin), 80, 443          │
    │  Deny: everything else               │
    └───────────────────────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────┐
    │     ORCHESTRATOR TRAEFIK              │
    │     :80 → redirect :443               │
    │     :443 → TLS + proxy to LXC         │
    └───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    ┌────────┐     ┌────────┐     ┌────────┐
    │  API   │     │  OTel  │     │  Web   │
    │ :64000 │     │ :64070 │     │ :64010 │
    └────────┘     └────────┘     └────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
              cerniq_backend (internal)
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
    ┌──────────────┐
    │ PgBouncer     │
    │ :64033        │
    └──────┬────────┘
           │
           ├── PostgreSQL (CT107, extern): 10.0.1.107:5432
           └── Redis shared (orchestrator, via gateway): 10.0.1.10:6379
```

---

## UFW FIREWALL CONFIGURATION

```bash
#!/bin/bash
# UFW Configuration for Cerniq.app
# Location: /var/www/CerniqAPP/infra/scripts/setup-firewall.sh

# Reset UFW
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (restrict to admin IPs in production)
sudo ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS for nginx
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 443/udp comment 'HTTP/3 QUIC'

# Enable UFW
sudo ufw --force enable

# Show status
sudo ufw status verbose
```

---

## DOCKER NETWORK CONFIGURATION

```yaml
# docker-compose.yml networks section
networks:
  cerniq_public:
    external: true
    # Subnet: 172.29.10.0/24
    # Services: nginx interface, web
    
  cerniq_backend:
    external: true
    # Subnet: 172.29.20.0/24
    # NOTE: not created with --internal; egress is controlled by iptables on hz.247
    # Services: api, workers, vector, otel-collector, pgbouncer
    
  cerniq_data:
    external: true
    # Subnet: 172.29.30.0/24
    # NOTE: not created with --internal; egress is controlled by iptables on hz.247
    # Services: pgbouncer
```

---

## SERVICE-TO-PORT MAPPING

| Service | Container Name | Port | Networks |
| ------- | -------------- | ---- | -------- |
| API | cerniq-api | 64000 | cerniq_backend |
| Web | cerniq-web | 64010 | cerniq_public |
| PostgreSQL | external (ct107-postgres) | 5432 | external |
| Redis | redis-shared (orchestrator) | 6379 | external (internal) |
| PgBouncer | cerniq-pgbouncer | 64033 | cerniq_backend, cerniq_data |
| Vector | cerniq-vector | push 443 | cerniq_backend |
| OTel Collector | cerniq-otel-collector | 64070, 64071 | cerniq_backend |
| cAdvisor | cerniq-cadvisor | 64094 | cerniq_backend |

---

## SECURITY RULES

### CRITICAL: Ports That Must NEVER Be Public

| Port | Service | Risk if Exposed |
| ---- | ------- | --------------- |
| 5432 | PostgreSQL (CT107) | Direct database access, data breach |
| 6379 | Redis shared | Cache poisoning, job manipulation |
| 64033 | PgBouncer | Unauthorized DB access attempts |

### Verification Commands

```bash
# Check no database ports are exposed externally
ss -tlnp | grep -E ':(5432|6379)' | grep -v '127.0.0.1'
# Should return EMPTY

# Check Cerniq services are listening
ss -tlnp | grep -E ':640[0-9]{2}'
# Should show all 64xxx ports

# Verify from external host
nmap -p 64000-64099 <server-ip>
# All should be filtered/closed
```

---

**Document generat:** 14 Ianuarie 2026  
**Versiune:** 2.0 (migrare la range 64000+)
