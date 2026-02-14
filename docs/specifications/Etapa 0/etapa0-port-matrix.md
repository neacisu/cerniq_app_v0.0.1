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
| 64089 | TCP | Reserved observability legacy | cerniq_backend | Internal only |
| 64082 | TCP | Reserved | cerniq_backend | Internal only |
| 64083 | TCP | Reserved | cerniq_backend | Internal only |

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
    ┌────────┐                     ┌────────┐
    │ Redis  │                     │  OTel  │
    │ :64039 │                     │ :64070 │
    └────────┘                     └────────┘
        │
        ▼
    cerniq_data (strict internal)
        │
    ┌────────┐
    │Postgres│
    │ :64032 │
    └────────┘
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
    # Internal: true (no external access)
    # Services: api, workers, vector, otel-collector, redis
    
  cerniq_data:
    external: true
    # Subnet: 172.29.30.0/24
    # Internal: true (strict isolation)
    # Services: postgres, redis
```

---

## SERVICE-TO-PORT MAPPING

| Service | Container Name | Port | Networks |
| ------- | -------------- | ---- | -------- |
| API | cerniq-api | 64000 | cerniq_backend |
| Web | cerniq-web | 64010 | cerniq_public |
| PostgreSQL | external (ct107-postgres) | 5432 | external |
| Redis | cerniq-redis | 64039 | cerniq_data, cerniq_backend |
| Vector | cerniq-vector | push 443 | cerniq_backend |
| OTel Collector | cerniq-otel-collector | 64070, 64071 | cerniq_backend |
| cAdvisor | cerniq-cadvisor | 64094 | cerniq_backend |

---

## NGINX CONFIGURATION

```nginx
# /etc/nginx/sites-available/cerniq.app

upstream cerniq_api {
    server 10.0.1.109:64000;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name cerniq.app *.cerniq.app;

    ssl_certificate /etc/letsencrypt/live/cerniq.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cerniq.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    location / {
        proxy_pass http://cerniq_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name cerniq.app *.cerniq.app;
    return 301 https://$host$request_uri;
}
```

---

## SECURITY RULES

### CRITICAL: Ports That Must NEVER Be Public

| Port | Service | Risk if Exposed |
| ---- | ------- | --------------- |
| 64032 | PostgreSQL | Direct database access, data breach |
| 64039 | Redis | Cache poisoning, job manipulation |
| 64083 | ClickHouse | Telemetry data access |

### Verification Commands

```bash
# Check no database ports are exposed externally
ss -tlnp | grep -E ':(64032|64039)' | grep -v '127.0.0.1'
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
