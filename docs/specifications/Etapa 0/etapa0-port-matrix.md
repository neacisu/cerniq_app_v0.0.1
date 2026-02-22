# CERNIQ.APP — ETAPA 0: PORT MATRIX COMPLET

## Documentație Porturi și Firewall Rules

### Versiunea 3.0 | Februarie 2026

---

## PORT ALLOCATION MATRIX

> [!IMPORTANT]
> Cerniq.app folosește range **64000-64099** pentru toate serviciile interne.
> Acces extern terminat în Traefik orchestrator pe 80/443.

## EXTERNAL PORTS (Expuse Public via orchestrator Traefik)

| Port | Protocol | Service                    | Network | Firewall Rule               |
| ---- | -------- | -------------------------- | ------- | --------------------------- |
| 22   | TCP      | SSH                        | Host    | ALLOW from admin IPs only   |
| 80   | TCP      | Orchestrator Traefik HTTP  | Host    | ALLOW all (redirect to 443) |
| 443  | TCP      | Orchestrator Traefik HTTPS | Host    | ALLOW all                   |
| 443  | UDP      | HTTP/3 QUIC                | Host    | ALLOW all (optional)        |

## INTERNAL PORTS — CERNIQ.APP (64000-64099)

### Application Services

| Port  | Protocol | Service                    | Container              | Networks                          | Access         |
| ----- | -------- | -------------------------- | ---------------------- | --------------------------------- | -------------- |
| 64000 | TCP      | Web Frontend (Nginx+React)  | cerniq-web             | cerniq_public                     | Internal/Debug |
| 64010 | TCP      | API (Fastify v5)           | cerniq-api             | cerniq_public, cerniq_backend     | Internal/Debug |
| 64012 | TCP      | Admin Dashboard (Nginx+React) | cerniq-admin        | cerniq_public                     | Internal/Debug |
| 64033 | TCP      | PgBouncer (connection pooling) | cerniq-pgbouncer   | cerniq_backend, cerniq_data       | Internal only  |
| 64080 | TCP      | Monitoring API Sidecar (Fastify v5) | cerniq-monitoring-api | cerniq_backend             | Internal only  |
| 64094 | TCP      | cAdvisor (container metrics) | cerniq-cadvisor     | cerniq_backend                    | Internal only  |
| 64095 | TCP      | PgBouncer Exporter (Prometheus) | cerniq-pgbouncer-exporter | cerniq_data               | Internal only  |

### Reserved (Future)

| Port  | Service                    | Status  |
| ----- | -------------------------- | ------- |
| 64075 | Python Document Service    | Reserved |
| 64076 | Python PDF Service         | Reserved |
| 64077 | Python Graph Service       | Reserved |
| 64078 | Python MCP Service         | Reserved |

### Removed (Centralizat pe orchestrator)

| Port  | Service           | Notă                                                                 |
| ----- | ----------------- | -------------------------------------------------------------------- |
| 64070 | OTLP gRPC         | NU mai este folosit local; aplicațiile trimit OTLP la otel-cerniq.neanelu.ro |
| 64071 | OTLP HTTP         | NU mai este folosit local; aplicațiile trimit OTLP la otel-cerniq.neanelu.ro |
| —     | Vector            | Observability centralizată pe orchestrator (77.42.76.185)             |
| —     | OTEL Collector    | Observability centralizată pe orchestrator (77.42.76.185)             |

---

## HAPROXY GATEWAY MAPPING (hz.247 la 10.0.1.10)

| Environment | CT   | HAProxy Port | → | Cerniq Port | Service        |
| ----------- | ---- | ------------ | - | ----------- | -------------- |
| Staging     | CT109 | 19000       | → | 64000       | Web Frontend  |
| Staging     | CT109 | 19010       | → | 64010       | API           |
| Staging     | CT109 | 19012       | → | 64012       | Admin Dashboard |
| Production  | CT110 | 29000       | → | 64000       | Web Frontend  |
| Production  | CT110 | 29010       | → | 64010       | API           |
| Production  | CT110 | 29012       | → | 64012       | Admin Dashboard |

---

## PORT RANGES COMPARISON

| Application | Range       | Status    |
| ----------- | ----------- | --------- |
| Cerniq.app  | 64000-64099 | ✅ Active |
| Neanelu     | 65000-65099 | ✅ In use |
| GeniusERP   | 5000        | ✅ In use |

---

## NETWORK TOPOLOGY

```text
                    INTERNET
                        │
                        ▼
    ┌───────────────────────────────────────┐
    │           UFW FIREWALL                │
    │  Allow: 22 (admin), 80, 443           │
    │  Deny: everything else                │
    └───────────────────────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────┐
    │     ORCHESTRATOR TRAEFIK               │
    │     :80 → redirect :443               │
    │     :443 → TLS + proxy to LXC          │
    └───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    ┌────────┐     ┌────────┐     ┌────────┐
    │  Web   │     │  API   │     │ Admin  │
    │ :64000 │     │ :64010 │     │ :64012 │
    │cerniq- │     │cerniq- │     │cerniq- │
    │  web   │     │  api   │     │ admin  │
    └────────┘     └────────┘     └────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
              cerniq_public (172.29.10.0/24)
                        │
              cerniq_backend (172.29.20.0/24)
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    ┌──────────┐  ┌──────────────┐  ┌────────────┐
    │Monitoring│  │  PgBouncer   │  │  cAdvisor  │
    │ API      │  │   :64033     │  │  :64094    │
    │ :64080   │  │cerniq-       │  │cerniq-     │
    │cerniq-   │  │ pgbouncer    │  │ cadvisor   │
    │monitoring│  └──────┬───────┘  └────────────┘
    └──────────┘         │
                         │  cerniq_data (172.29.30.0/24)
                         ▼
                  ┌──────────────────┐
                  │ PgBouncer        │
                  │ Exporter :64095  │
                  │ cerniq-pgbouncer-│
                  │ exporter         │
                  └──────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
    PostgreSQL (CT107)           Redis (orchestrator)
    10.0.1.107:5432              10.0.1.10:6379
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
    # Services: Web, API, Admin — Traefik ingress

  cerniq_backend:
    external: true
    # Subnet: 172.29.20.0/24
    # Services: API, Workers, PgBouncer, Monitoring API, cAdvisor

  cerniq_data:
    external: true
    # Subnet: 172.29.30.0/24
    # Services: PgBouncer, PgBouncer Exporter
```

---

## SERVICE-TO-PORT MAPPING

| Service           | Container Name              | Port   | Networks                          |
| ----------------- | --------------------------- | ------ | --------------------------------- |
| Web Frontend      | cerniq-web                  | 64000  | cerniq_public                     |
| API               | cerniq-api                  | 64010  | cerniq_public, cerniq_backend     |
| Admin Dashboard   | cerniq-admin                | 64012  | cerniq_public                     |
| PgBouncer         | cerniq-pgbouncer            | 64033  | cerniq_backend, cerniq_data       |
| Monitoring API    | cerniq-monitoring-api       | 64080  | cerniq_backend                    |
| cAdvisor          | cerniq-cadvisor             | 64094  | cerniq_backend                    |
| PgBouncer Exporter| cerniq-pgbouncer-exporter   | 64095  | cerniq_data                       |
| PostgreSQL        | external (CT107)            | 5432   | external (10.0.1.107)             |
| Redis             | shared (orchestrator)       | 6379   | external via gateway (10.0.1.10)  |

---

## EXTERNAL SERVICES (NU pe rețele Docker Cerniq)

| Service      | Locație                    | Endpoint                    |
| ------------ | -------------------------- | --------------------------- |
| PostgreSQL 18.2 | CT107                   | 10.0.1.107:5432             |
| Redis 8.4.0 | Orchestrator (shared)       | 10.0.1.10:6379 via gateway  |
| OpenBao      | Orchestrator               | s3cr3ts.neanelu.ro:443      |
| Observability | Orchestrator (Grafana/Prometheus/Loki/Tempo) | 77.42.76.185 |
| OTLP         | Orchestrator               | otel-cerniq.neanelu.ro      |

---

## SECURITY RULES

### CRITICAL: Ports That Must NEVER Be Public

| Port  | Service            | Risk if Exposed                     |
| ----- | ------------------ | ----------------------------------- |
| 5432  | PostgreSQL (CT107) | Direct database access, data breach |
| 6379  | Redis shared       | Cache poisoning, job manipulation   |
| 64033 | PgBouncer          | Unauthorized DB access attempts     |
| 64095 | PgBouncer Exporter | Metrics leakage, infrastructure info|

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

**Document generat:** Februarie 2026  
**Versiune:** 3.0 (corectare porturi API/Web, adăugare servicii, eliminare Vector/OTEL local)
