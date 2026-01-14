# CERNIQ.APP — ETAPA 0: PORT MATRIX COMPLET

## Documentație Porturi și Firewall Rules

### Versiunea 1.0 | 15 Ianuarie 2026

---

## PORT ALLOCATION MATRIX

## EXTERNAL PORTS (Expuse Public)

| Port | Protocol | Service | Network | Firewall Rule |
| ------ | -------- | ------- | ------- | ------------- |
| 22 | TCP | SSH | Host | ALLOW from admin IPs only |
| 80 | TCP | Traefik HTTP | cerniq_public | ALLOW all (redirect to 443) |
| 443 | TCP | Traefik HTTPS | cerniq_public | ALLOW all |
| 443 | UDP | Traefik HTTP/3 | cerniq_public | ALLOW all |

## INTERNAL PORTS (Docker Networks Only)

| Port | Protocol | Service | Network | Access |
| ------ | -------- | ------- | ------- | ------ |
| 4000 | TCP | API Fastify | cerniq_backend | Internal only |
| 4317 | TCP | OTel gRPC | cerniq_backend | Internal only |
| 4318 | TCP | OTel HTTP | cerniq_backend | Internal only |
| 5432 | TCP | PostgreSQL | cerniq_data | **NEVER PUBLIC** |
| 6379 | TCP | Redis | cerniq_data | **NEVER PUBLIC** |
| 6432 | TCP | PgBouncer | cerniq_data | Internal only |
| 8080 | TCP | SigNoz UI | cerniq_backend | Via Traefik only |
| 8082 | TCP | Traefik Metrics | cerniq_backend | Internal only |
| 8123 | TCP | ClickHouse HTTP | cerniq_backend | Internal only |
| 9000 | TCP | ClickHouse Native | cerniq_backend | Internal only |
| 9323 | TCP | Docker Metrics | Host | Internal only |

## PORT RANGES BY SERVICE TYPE

| Range | Purpose | Examples |
| ----- | ------- | -------- |
| 80, 443 | Public HTTP/HTTPS | Traefik |
| 3000-3099 | Frontend Development | React dev server (3000) |
| 4000-4099 | API Services | Fastify (4000), GraphQL (4001) |
| 4317-4318 | OpenTelemetry | OTLP gRPC (4317), HTTP (4318) |
| 5000-5099 | Background Workers | Python workers |
| 5432 | PostgreSQL | Database |
| 6379-6399 | Redis | Cache/Queue |
| 6432 | PgBouncer | Connection pooling |
| 8000-8099 | Admin UIs | SigNoz (8080), Traefik (8082) |
| 9000-9099 | Monitoring | ClickHouse (9000), Prometheus |

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
    │     TRAEFIK (cerniq_public)          │
    │     :80 → redirect :443              │
    │     :443 → TLS termination           │
    └───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    ┌───────┐      ┌───────┐      ┌───────┐
    │  API  │      │SigNoz │      │  Web  │
    │ :4000 │      │ :8080 │      │ :3000 │
    └───────┘      └───────┘      └───────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
              cerniq_backend (internal)
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
    ┌───────┐                      ┌───────┐
    │ Redis │                      │OTel   │
    │ :6379 │                      │:4317  │
    └───────┘                      └───────┘
        │
        ▼
    cerniq_data (strict internal)
        │
    ┌───────┐
    │Postgre│
    │ :5432 │
    └───────┘
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

# HTTP/HTTPS for Traefik
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 443/udp comment 'HTTP/3 QUIC'

# Docker metrics (localhost only)
sudo ufw allow from 127.0.0.1 to any port 9323 comment 'Docker metrics'

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
    # Subnet: 172.20.0.0/24
    # Gateway: 172.20.0.1
    # Services: traefik, api (public interface)
    
  cerniq_backend:
    external: true
    # Subnet: 172.21.0.0/24
    # Gateway: 172.21.0.1
    # Internal: true (no external access)
    # Services: api, workers, signoz, otel-collector, redis
    
  cerniq_data:
    external: true
    # Subnet: 172.22.0.0/24
    # Gateway: 172.22.0.1
    # Internal: true (strict isolation)
    # Services: postgres, redis
```

---

## SERVICE-TO-PORT MAPPING

| Service | Container Name | Ports | Networks |
| ------- | -------------- | ----- | -------- |
| Traefik | cerniq-traefik | 80, 443, 443/udp, 8082 | cerniq_public |
| API | cerniq-api | 4000 | cerniq_public, cerniq_backend |
| Web | cerniq-web | 3000 | cerniq_public |
| PostgreSQL | cerniq-postgres | 5432 | cerniq_data |
| Redis | cerniq-redis | 6379 | cerniq_data, cerniq_backend |
| SigNoz | cerniq-signoz | 8080 | cerniq_backend |
| OTel Collector | cerniq-otel | 4317, 4318 | cerniq_backend |
| ClickHouse | cerniq-clickhouse | 8123, 9000 | cerniq_backend |

---

## SECURITY RULES

## CRITICAL: Ports That Must NEVER Be Public

| Port | Service | Risk if Exposed |
| ---- | ------- | --------------- |
| 5432 | PostgreSQL | Direct database access, data breach |
| 6379 | Redis | Cache poisoning, job manipulation |
| 9000 | ClickHouse | Telemetry data access |
| 8080 | SigNoz | Internal metrics exposure |

## Verification Commands

```bash
# Check no database ports are exposed
ss -tlnp | grep -E ':(5432|6379)' | grep -v '127.0.0.1'
# Should return EMPTY

# Check only expected ports are listening on 0.0.0.0
ss -tlnp | grep '0.0.0.0'
# Should only show: 22, 80, 443

# Verify from external host
nmap -p 5432,6379,9000 <server-ip>
# All should be filtered/closed
```

---

**Document generat:** 15 Ianuarie 2026
