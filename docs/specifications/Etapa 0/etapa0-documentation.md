# CERNIQ.APP - DOCUMENTAȚIE INFRASTRUCTURĂ ETAPA 0

## LIVRABILUL 1: STRATEGIE GENERALĂ INFRASTRUCTURĂ

### 1. VIZIUNE ARHITECTURALĂ

**Cerniq.app** este o platformă B2B de automatizare a vânzărilor pentru sectorul agricol românesc, deployată pe server bare metal Hetzner cu configurație 20 cores Intel, 128GB RAM, Ubuntu 24.04 LTS.

#### 1.1 Stack Tehnologic Validat Ianuarie 2026

| Componentă | Versiune | Rol |
| :--- | :--- | :--- |
| **Runtime API** | Node.js v24.12.0 LTS "Krypton" | Backend principal, V8 13.6 |
| **Framework API** | Fastify v5.6.2 | Type Provider Zod, hook-based |
| **AI/Worker Runtime** | Python 3.14.2 Free-Threading | True parallelism, no-GIL |
| **Frontend** | React 19.2.3 | Actions, useOptimistic, Compiler |
| **Admin Framework** | Refine v5 | Headless, Custom Data Provider |
| **Database** | PostgreSQL 18.1 | AIO, uuidv7(), PostGIS, pgvector |
| **ORM** | Drizzle ORM | SQL-like, drizzle-zod |
| **Styling** | Tailwind v4.1+ | Oxide Engine (Rust) |
| **Queue Manager** | BullMQ v5.66.5 | Redis 8.4.0 backend |
| **Reverse Proxy** | Traefik v3.6.6 | Auto SSL/TLS, Docker provider |
| **Package Manager** | PNPM 9.15+ | EXCLUSIV, no npm |
| **Observability** | SigNoz v0.106.0 | OpenTelemetry-native |
| **Container Runtime** | Docker Engine 29.2.0 | Compose v2.40+ |

#### 1.2 Principii Arhitecturale

1. **Vertical Slice Architecture**: Organizare per feature, nu per layer tehnic
2. **Medallion Architecture**: Bronze (raw) → Silver (validated) → Gold (operational)
3. **Neuro-Simbolic AI**: Flexibilitate AI + Rigoare factuală
4. **Multi-tenant cu RLS**: Row-Level Security în PostgreSQL
5. **Anti-halucinare**: Guardrails pentru Price/Stock/Discount

### 2. CONFIGURAȚIE DOCKER

#### 2.1 daemon.json Production (128GB/20-core)

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {"max-size": "50m", "max-file": "5"},
  "live-restore": true,
  "userland-proxy": false,
  "default-ulimits": {
    "nofile": {"Name": "nofile", "Soft": 65536, "Hard": 65536}
  },
  "default-address-pools": [
    {"base": "172.20.0.0/16", "size": 24}
  ],
  "metrics-addr": "0.0.0.0:64093"
}
```

#### 2.2 Arhitectură Rețele Docker

```yaml
networks:
  cerniq_public:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  cerniq_backend:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/24
  cerniq_data:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.22.0.0/24
```

**Reguli de segregare:**

- `cerniq_public`: Traefik + servicii expuse
- `cerniq_backend`: API + Workers + Redis (intern)
- `cerniq_data`: PostgreSQL + Redis (data persistence)

### 3. PLAN PORTURI

| Port | Serviciu | Acces | Notă |
| :--- | :--- | :--- | :--- |
| Port | Serviciu | Acces | Notă |
| :--- | :--- | :--- | :--- |
| 64080 | Traefik HTTP | Public (via Nginx) | Mapat din container :80 |
| 64443 | Traefik HTTPS | Public (via Nginx) | Mapat din container :443 |
| 64081 | Traefik Dashboard | Admin (via Nginx) | Mapat din container :64081 |
| 64000 | API Gateway | Intern/Debug | Fastify (via Traefik în prod) |
| 64070 | OTel gRPC | Intern | Traces/Metrics |
| 64071 | OTel HTTP | Intern | Logs |
| 64032 | PostgreSQL | Intern | Never public |
| 64039 | Redis | Intern | BullMQ |
| 64089 | SigNoz UI | Admin (via Nginx) | Observability Dashboard |
| 64082 | ClickHouse HTTP | Intern | Telemetry |

### 4. CONFIGURAȚIE POSTGRESQL 18.1

```ini
# Memory (128GB system)
shared_buffers = 32GB
effective_cache_size = 96GB
work_mem = 256MB
maintenance_work_mem = 4GB
wal_buffers = 64MB

# PostgreSQL 18 AIO
io_method = io_uring

# Parallelism
max_parallel_workers_per_gather = 8
max_parallel_workers = 16
max_worker_processes = 20

# SSD Optimization
random_page_cost = 1.1
effective_io_concurrency = 200

# Connections (use PgBouncer)
max_connections = 200
```

**Extensii obligatorii:**

- `pgvector` - Căutare semantică (HNSW indexes)
- `PostGIS` - Interogări geospațiale
- `pg_trgm` - Fuzzy search

### 5. CONFIGURAȚIE REDIS 8.4.0 (BullMQ)

```conf
# CRITICAL: BullMQ cannot tolerate eviction
maxmemory 8gb
maxmemory-policy noeviction

# Persistence (hybrid)
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes

# Lazy freeing
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
activedefrag yes

# BullMQ notifications
notify-keyspace-events Ex
```

### 6. STRUCTURĂ DIRECTOARE

```text
/var/www/CerniqAPP/
├── apps/
│   ├── api/                    # Backend Fastify v5.6.2
│   │   ├── src/
│   │   │   ├── features/       # Vertical Slice
│   │   │   │   ├── auth/
│   │   │   │   ├── leads/
│   │   │   │   ├── outreach/
│   │   │   │   └── invoicing/
│   │   │   ├── plugins/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web-admin/              # Frontend React 19.2.3 + Refine v5
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── providers/
│       │   └── App.tsx
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── db/                     # Drizzle ORM + Migrații
│   │   ├── drizzle/
│   │   ├── schema/
│   │   │   ├── bronze.ts
│   │   │   ├── silver.ts
│   │   │   └── gold.ts
│   │   └── package.json
│   ├── shared-types/           # Zod schemas exported
│   └── config/
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
├── workers/                    # Python 3.14 Free-Threading
│   ├── enrichment/
│   ├── outreach/
│   ├── ai/
│   └── requirements.txt
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.override.yml
│   │   └── traefik/
│   │       ├── traefik.yml
│   │       └── dynamic/
│   ├── scripts/
│   │   ├── backup.sh
│   │   └── bootstrap.sh
│   └── config/
│       ├── postgres/
│       ├── redis/
│       └── otel/
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   ├── architecture/
│   └── api/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── .npmrc
```

### 7. CONFIGURAȚIE TRAEFIK v3.6.6

```yaml
# traefik.yml
global:
  checkNewVersion: false
  sendAnonymousUsage: false

api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ":443"
    http3: {}

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: cerniq_public

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@cerniq.app
      storage: /acme.json
      httpChallenge:
        entryPoint: web
```

### 8. STRATEGIA BACKUP (BorgBackup + Hetzner Storage Box)

```bash
# Retenție GFS
--keep-daily 7
--keep-weekly 4
--keep-monthly 6
--keep-yearly 2

# PostgreSQL backup
pg_dumpall | gzip > pg_backup_$(date +%Y%m%d).sql.gz

# Borg create
borg create \
  --compression auto,zstd,6 \
  ssh://uXXXXXX@uXXXXXX.your-storagebox.de:22/./borg-repo::{hostname}-{now} \
  /var/www/CerniqAPP \
  /etc/cerniq \
  /var/backups/databases
```

---

## LIVRABILUL 2: ADR CONTRACTS

### ADR-0001: PNPM ca Package Manager Exclusiv

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0001-PNPM-ca-Package-Manager-Exclusiv.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0002: Node.js v24 LTS "Krypton"

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0002-Node-js-v24-LTS-Krypton.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0003: Python 3.14 Free-Threading pentru Workers

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0003-Python-3-14-Free-Threading-pentru-Workers.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0004: PostgreSQL 18.1 cu PostGIS

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0004-PostgreSQL-18-1-cu-PostGIS.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0005: Row-Level Security pentru Multi-Tenancy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0005-Row-Level-Security-pentru-Multi-Tenancy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0006: Redis 8.4.0 cu BullMQ v5.66.5

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0006-Redis-8-4-0-cu-BullMQ-v5.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0007: Drizzle ORM pentru Database Access

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0007-Drizzle-ORM-pentru-Database-Access.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0008: Fastify v5.6.2 ca API Framework

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0008-Fastify-v5-6-2-ca-API-Framework.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0009: Zod pentru Validation Strategy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0009-Zod-pentru-Validation-Strategy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0010: Error Handling Pattern Standardizat

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0010-Error-Handling-Pattern-Standardizat.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0011: API Versioning Strategy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0011-API-Versioning-Strategy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0012: React 19 cu Refine v5

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0012-React-19-cu-Refine-v5.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0013: Tailwind CSS v4 cu Oxide Engine

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0013-Tailwind-CSS-v4-cu-Oxide-Engine.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0014: Traefik v3.6.6 ca Reverse Proxy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0014-Traefik-v3-6-6-ca-Reverse-Proxy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0015: Docker Containerization Strategy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0015-Docker-Containerization-Strategy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0016: SigNoz pentru Observability

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0016-SigNoz-pentru-Observability.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0017: Secrets Management Strategy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0017-Secrets-Management-Strategy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0018: Authentication Flow (JWT + Refresh Tokens)

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0018-Authentication-Flow-JWT-Refresh-Tokens.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0019: CORS Policy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0019-CORS-Policy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0020: BorgBackup cu Hetzner Storage Box

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0020-BorgBackup-cu-Hetzner-Storage-Box.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0021: Naming Conventions

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0021-Naming-Conventions.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0022: Port Allocation Strategy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0022-Port-Allocation-Strategy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0023: Logging Standards cu Pino

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0023-Logging-Standards-cu-Pino.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0024: Directory Structure Standard

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0024-Directory-Structure-Standard.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0025: Health Check Patterns

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0025-Health-Check-Patterns.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0026: Graceful Shutdown Strategy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0026-Graceful-Shutdown-Strategy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0027: Container Resource Limits

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0027-Container-Resource-Limits.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0028: Git Branching Strategy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0028-Git-Branching-Strategy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0029: Testing Strategy

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0029-Testing-Strategy.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0030: Environment Management

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0030-Environment-Management.md)
**Status:** Accepted | **Data:** 2026-01-15

### ADR-0031: Provider Abstraction Layer

[View detailed ADR](../../adr/ADR%20Etapa%200/ADR-0031-Provider-Abstraction-Layer.md)
**Status:** Accepted | **Data:** 2026-02-01

---

## LIVRABILUL 3: PLAN IMPLEMENTARE GRANULAR (F0.x)

### FAZA F0.1: INFRASTRUCTURĂ DOCKER DE BAZĂ

#### F0.1.1 Docker Engine Setup

```json
{
  "taskID": "F0.1.1.T001",
  "denumire_task": "Instalare și configurare Docker Engine 29.2.0 pe Ubuntu 24.04",
  "context_anterior": "Server Hetzner bare metal fresh cu Ubuntu 24.04 LTS instalat, fără Docker",
  "descriere_task": "Ești un expert DevOps cu experiență extinsă în containerizare Docker. Task-ul tău este să instalezi Docker Engine 29.2.0 (sau latest stable) pe Ubuntu 24.04 LTS folosind repository-ul oficial Docker. Trebuie să: 1) Elimini orice versiune veche de Docker (docker.io, docker-doc, docker-compose, podman-docker, containerd, runc), 2) Adaugi repository-ul Docker oficial cu GPG key, 3) Instalezi docker-ce, docker-ce-cli, containerd.io, docker-buildx-plugin, docker-compose-plugin, 4) Verifici instalarea cu `docker version` și `docker compose version`, 5) Adaugi userul root în grupul docker (dacă nu e deja), 6) Activezi și pornești serviciul docker (systemctl enable --now docker).",
  "director_implementare": "/root",
  "restrictii_antihalucinatie": [
    "NU folosi snap pentru instalare Docker",
    "NU folosi docker.io din repository Ubuntu",
    "NU sări pașii de verificare a versiunii",
    "VERIFICĂ că versiunea instalată este 29.x sau mai nouă"
  ],
  "validare_task": "docker version afișează Version: 29.x.x sau mai nou; docker compose version afișează v2.40+ sau mai nou; systemctl status docker arată active (running)",
  "outcome": "Docker Engine 29.2.0 instalat și funcțional cu Docker Compose v2.40+"
}
```

```json
{
  "taskID": "F0.1.1.T002",
  "denumire_task": "Configurare daemon.json pentru server 128GB RAM/20 cores",
  "context_anterior": "Docker Engine 29.2.0 instalat în F0.1.1.T001, configurare default",
  "descriere_task": "Ești un expert Docker specializat în optimizare pentru servere high-memory. Task-ul tău este să creezi fișierul /etc/docker/daemon.json cu configurația optimizată pentru serverul Cerniq (128GB RAM, 20 cores). Configurația TREBUIE să includă: storage-driver overlay2, log-driver json-file cu max-size 50m și max-file 5, live-restore true pentru zero-downtime upgrades, userland-proxy false pentru performanță network îmbunătățită, default-ulimits nofile 65536, default-address-pools cu baza 172.20.0.0/16 și size 24, metrics-addr 0.0.0.0:64093 pentru Prometheus scraping. După creare, restartează docker daemon și verifică aplicarea configurației.",
  "director_implementare": "/etc/docker",
  "restrictii_antihalucinatie": [
    "NU folosi storage-driver diferit de overlay2",
    "NU seta log max-size mai mare de 50m",
    "NU omite live-restore",
    "VERIFICĂ JSON syntax înainte de restart"
  ],
  "validare_task": "docker info afișează Storage Driver: overlay2, Live Restore Enabled: true; cat /etc/docker/daemon.json parsează corect cu jq",
  "outcome": "daemon.json configurat pentru production cu toate optimizările aplicate"
}
```

```json
{
  "taskID": "F0.1.1.T003",
  "denumire_task": "Creare structură directoare CerniqAPP",
  "context_anterior": "Docker configurat în F0.1.1.T002, nu există structură de proiect",
  "descriere_task": "Ești un expert în structurare monorepo pentru aplicații fullstack. Task-ul tău este să creezi întreaga structură de directoare pentru proiectul Cerniq.app în /var/www/CerniqAPP conform arhitecturii definite. Structura TREBUIE să includă: apps/ cu subdirectoare api/ și web-admin/, packages/ cu db/, shared-types/, config/, workers/ cu enrichment/, outreach/, ai/, infra/ cu docker/, scripts/, config/, docs/ cu adr/, architecture/. Setează permisiunile corecte (root:root, 755 pentru directoare). Creează fișiere placeholder .gitkeep în directoarele goale pentru tracking în git.",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "NU modifica structura definită în ADR-0024",
    "NU crea directoare suplimentare nedocumentate",
    "NU uita directorul docs/adr/",
    "PĂSTREAZĂ exact naming-ul specificat (lowercase)"
  ],
  "validare_task": "tree -L 3 /var/www/CerniqAPP afișează structura completă; toate directoarele au .gitkeep",
  "outcome": "Structură completă de directoare creată conform specificației"
}
```

#### F0.1.2 Docker Networks Setup

```json
{
  "taskID": "F0.1.2.T001",
  "denumire_task": "Creare rețele Docker pentru segregarea serviciilor",
  "context_anterior": "Structură directoare creată în F0.1.1.T003, rețele Docker default",
  "descriere_task": "Ești un expert Docker networking. Task-ul tău este să creezi cele 3 rețele Docker pentru Cerniq.app: 1) cerniq_public - bridge network pentru servicii expuse public (Traefik, API gateway), subnet 172.20.0.0/24, 2) cerniq_backend - bridge network INTERN pentru comunicare API-Workers, subnet 172.21.0.0/24, cu flag internal: true, 3) cerniq_data - bridge network INTERN STRICT pentru PostgreSQL și Redis, subnet 172.22.0.0/24, cu flag internal: true. Documentează rețelele create în /var/www/CerniqAPP/docs/architecture/networks.md.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune cerniq_backend sau cerniq_data la internet",
    "NU folosi subnets care se suprapun",
    "SETEAZĂ internal: true pentru rețelele backend și data",
    "NU șterge rețeaua bridge default"
  ],
  "validare_task": "docker network ls afișează cele 3 rețele; docker network inspect cerniq_backend arată Internal: true; docker network inspect cerniq_data arată Internal: true",
  "outcome": "3 rețele Docker izolate create conform strategiei de segregare"
}
```

### FAZA F0.2: POSTGRESQL 18.1 SETUP

```json
{
  "taskID": "F0.2.1.T001",
  "denumire_task": "Creare Docker Compose pentru PostgreSQL 18.1 cu PostGIS",
  "context_anterior": "Rețele Docker create în F0.1.2, PostgreSQL nu e instalat",
  "descriere_task": "Ești un expert DBA PostgreSQL cu experiență în containerizare. Task-ul tău este să creezi serviciul PostgreSQL în docker-compose.yml. Folosește imaginea postgis/postgis:18-3.6 (include PostGIS). Configurează: volume pentru persistență la /var/lib/postgresql/data, network cerniq_data (intern ONLY - NU expune portul 64032 public), environment variables pentru POSTGRES_USER, POSTGRES_PASSWORD (din secret), POSTGRES_DB=cerniq_production, healthcheck cu pg_isready, shm_size: 4gb pentru shared memory, deploy resources cu memory limit 32G. NU expune portul 64032 la host în production - doar intern.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune port 64032 la 0.0.0.0",
    "NU folosi imagine postgres standard - TREBUIE postgis/postgis",
    "NU hardcodează parola - folosește Docker secret",
    "VERIFICĂ versiunea este 18.x"
  ],
  "validare_task": "docker compose config validează fără erori; postgres service are network cerniq_data; nu există port mapping public pentru 64032",
  "outcome": "PostgreSQL 18.1 cu PostGIS configurat în Docker Compose"
}
```

```json
{
  "taskID": "F0.2.1.T002",
  "denumire_task": "Configurare postgresql.conf pentru 128GB RAM",
  "context_anterior": "PostgreSQL service definit în F0.2.1.T001, configurare default",
  "descriere_task": "Ești un expert PostgreSQL DBA specializat în tuning. Task-ul tău este să creezi fișierul postgresql.conf cu parametrii optimizați pentru serverul de 128GB RAM. Parametrii OBLIGATORII: shared_buffers=32GB (25% RAM), effective_cache_size=96GB (75% RAM), work_mem=256MB, maintenance_work_mem=4GB, wal_buffers=64MB, max_connections=200, max_parallel_workers_per_gather=8, max_parallel_workers=16, random_page_cost=1.1 (SSD), effective_io_concurrency=200, checkpoint_timeout=30min, io_method=io_uring (PostgreSQL 18 AIO). Montează fișierul în container via volume.",
  "director_implementare": "/var/www/CerniqAPP/infra/config/postgres",
  "restrictii_antihalucinatie": [
    "NU seta shared_buffers mai mare de 32GB",
    "NU folosi max_connections peste 200 (folosește PgBouncer)",
    "NU omite io_method pentru AIO",
    "VERIFICĂ sintaxa configurației"
  ],
  "validare_task": "PostgreSQL pornește fără erori; SHOW shared_buffers returnează 32GB; SHOW io_method returnează io_uring",
  "outcome": "PostgreSQL configurat optimal pentru 128GB RAM cu AIO activat"
}
```

```json
{
  "taskID": "F0.2.1.T003",
  "denumire_task": "Creare script init.sql cu extensii obligatorii",
  "context_anterior": "PostgreSQL configurat în F0.2.1.T002, extensii neactivate",
  "descriere_task": "Ești un expert PostgreSQL. Task-ul tău este să creezi scriptul init.sql care se execută la prima pornire a containerului PostgreSQL. Scriptul TREBUIE să activeze extensiile: 1) pgvector pentru căutare semantică, 2) postgis pentru funcții geospațiale, 3) postgis_topology, 4) pg_trgm pentru fuzzy search, 5) uuid-ossp pentru UUID generation (complementar uuidv7 nativ). După activare, verifică cu SELECT extname FROM pg_extension. Scriptul va fi montat în /docker-entrypoint-initdb.d/.",
  "director_implementare": "/var/www/CerniqAPP/infra/config/postgres",
  "restrictii_antihalucinatie": [
    "NU omite pgvector - e CRITIC pentru AI search",
    "NU omite PostGIS - e CRITIC pentru proximity queries",
    "VERIFICĂ că extensiile există în imagine înainte de CREATE EXTENSION",
    "FOLOSEȘTE IF NOT EXISTS pentru idempotență"
  ],
  "validare_task": "SELECT extname FROM pg_extension include pgvector, postgis, pg_trgm; \\dx arată toate extensiile active",
  "outcome": "Toate extensiile PostgreSQL necesare activate automat la startup"
}
```

### FAZA F0.3: REDIS 8.4.0 ȘI BULLMQ SETUP

```json
{
  "taskID": "F0.3.1.T001",
  "denumire_task": "Creare Docker Compose pentru Redis 8.4.0 optimizat BullMQ",
  "context_anterior": "PostgreSQL configurat, Redis neinstalat",
  "descriere_task": "Ești un expert Redis specializat în job queues. Task-ul tău este să adaugi serviciul Redis în docker-compose.yml pentru BullMQ. Folosește imaginea redis:8.4.0-alpine. Configurația CRITICĂ: maxmemory 8gb, maxmemory-policy noeviction (OBLIGATORIU pentru BullMQ - jobs NU pot fi evicted), appendonly yes, appendfsync everysec, aof-use-rdb-preamble yes, notify-keyspace-events Ex, lazyfree-lazy-eviction yes, activedefrag yes. Network: cerniq_data (intern). Volume pentru persistență. Healthcheck cu redis-cli ping.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "maxmemory-policy TREBUIE să fie noeviction - altfel BullMQ va pierde job-uri",
    "NU expune port 64039 public",
    "NU dezactiva persistența AOF",
    "VERIFICĂ notify-keyspace-events pentru delayed jobs"
  ],
  "validare_task": "redis-cli CONFIG GET maxmemory-policy returnează noeviction; redis-cli PING returnează PONG; AOF file se creează",
  "outcome": "Redis 8.4.0 configurat optim pentru BullMQ job queues"
}
```

### FAZA F0.4: TRAEFIK v3.6.6 SETUP

```json
{
  "taskID": "F0.4.1.T001",
  "denumire_task": "Creare configurație statică Traefik cu Let's Encrypt",
  "context_anterior": "PostgreSQL și Redis configurate, reverse proxy absent",
  "descriere_task": "Ești un expert Traefik și TLS/SSL. Task-ul tău este să creezi traefik.yml cu configurația statică pentru Traefik v3.6.6. EntryPoints: web pe :80 cu redirect permanent la websecure, websecure pe :443 cu TLS și HTTP/3 activat. Providers: docker cu endpoint unix socket, exposedByDefault false (OBLIGATORIU), network cerniq_public. CertificatesResolvers: letsencrypt cu ACME httpChallenge pe entrypoint web, email admin@cerniq.app, storage /acme.json. API dashboard activat dar securizat (insecure: false).",
  "director_implementare": "/var/www/CerniqAPP/infra/docker/traefik",
  "restrictii_antihalucinatie": [
    "exposedByDefault TREBUIE să fie false",
    "NU activa api.insecure în production",
    "NU omite HTTP → HTTPS redirect",
    "VERIFICĂ email valid pentru Let's Encrypt"
  ],
  "validare_task": "traefik configcheck validează configurația; HTTPS funcționează cu certificat valid Let's Encrypt",
  "outcome": "Traefik v3.6.6 configurat cu auto-SSL și HTTP/3"
}
```

```json
{
  "taskID": "F0.4.1.T002",
  "denumire_task": "Creare middleware-uri dinamice pentru securitate",
  "context_anterior": "Traefik static config creat în F0.4.1.T001",
  "descriere_task": "Ești un expert în securitate web. Task-ul tău este să creezi fișierul dynamic.yml cu middleware-uri Traefik: 1) secure-headers cu HSTS (31536000s, includeSubdomains, preload), X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, 2) rate-limit cu average 100, burst 200, period 1s, sourceCriterion ipStrategy, 3) compress cu encodings gzip, br, zstd. Configurează TLS options cu minVersion TLS 1.2, cipher suites moderne (ECDHE only).",
  "director_implementare": "/var/www/CerniqAPP/infra/docker/traefik/dynamic",
  "restrictii_antihalucinatie": [
    "NU permite TLS 1.0 sau 1.1",
    "NU omite HSTS headers",
    "NU seta rate limit prea restrictiv (sub 50 req/s)",
    "VERIFICĂ sintaxa YAML"
  ],
  "validare_task": "Traefik încarcă dynamic config fără erori; curl -I https://cerniq.app arată Strict-Transport-Security header",
  "outcome": "Middleware-uri securitate Traefik configurate conform best practices"
}
```

### FAZA F0.5: OBSERVABILITY STACK (SigNoz)

```json
{
  "taskID": "F0.5.1.T001",
  "denumire_task": "Creare Docker Compose pentru SigNoz v0.106.0",
  "context_anterior": "Infrastructură de bază completă, observability absent",
  "descriere_task": "Ești un expert observability și OpenTelemetry. Task-ul tău este să adaugi SigNoz v0.106.0 în docker-compose.yml. Servicii necesare: 1) zookeeper (signoz/zookeeper:3.7.1), 2) clickhouse (clickhouse/clickhouse-server:25.12.3) cu healthcheck și volume, 3) schema-migrator-sync pentru migrații, 4) signoz (signoz/signoz:v0.106.0) pe port 64080, 5) otel-collector (signoz/signoz-otel-collector:v0.129.12) pe ports 64070 (gRPC) și 64071 (HTTP). Toate pe network cerniq_backend. Configure retention 7 zile logs, 30 zile metrics.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune ClickHouse direct la public",
    "NU omite schema-migrator - e necesar pentru init",
    "VERIFICĂ compatibilitatea versiunilor între componente",
    "NU seta retention mai mare de 30 zile fără calcul storage"
  ],
  "validare_task": "SigNoz UI accesibil pe port 64080; OTel collector primește traces pe 64070; ClickHouse healthy",
  "outcome": "Stack observability SigNoz complet și funcțional"
}
```

### FAZA F0.6: PNPM ȘI MONOREPO SETUP

```json
{
  "taskID": "F0.6.1.T001",
  "denumire_task": "Inițializare monorepo cu PNPM workspaces",
  "context_anterior": "Structură directoare există, pnpm neinstalat",
  "descriere_task": "Ești un expert JavaScript/TypeScript specializat în monorepo management. Task-ul tău este să inițializezi proiectul Cerniq.app ca monorepo PNPM. Pași: 1) Instalează Node.js v24.12.0 (via nvm sau direct), 2) Activează corepack și enable pnpm, 3) Creează package.json root cu name @cerniq/monorepo, private true, packageManager pnpm@9.15.0, engines node >=24.0.0, 4) Creează pnpm-workspace.yaml cu packages apps/*, packages/*, 5) Creează .npmrc cu prefer-frozen-lockfile=true, auto-install-peers=true, link-workspace-packages=true, shamefully-hoist=false, 6) Creează turbo.json pentru task orchestration.",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "NU folosi npm sau yarn sub nicio formă",
    "NU seta shamefully-hoist=true decât dacă absolut necesar",
    "VERIFICĂ versiunea PNPM este 9.15+",
    "NU omite packageManager field în package.json"
  ],
  "validare_task": "pnpm --version arată 9.15+; pnpm install rulează fără erori; structura node_modules urmează strict isolation",
  "outcome": "Monorepo PNPM inițializat cu workspaces și Turborepo"
}
```

```json
{
  "taskID": "F0.6.1.T002",
  "denumire_task": "Creare package.json pentru apps/api (Fastify v5.6.2)",
  "context_anterior": "Monorepo PNPM inițializat în F0.6.1.T001",
  "descriere_task": "Ești un expert backend Node.js specializat în Fastify. Task-ul tău este să creezi package.json pentru apps/api cu configurația pentru Fastify v5.6.2. Dependencies: fastify ^5.6.2, @fastify/type-provider-zod, @fastify/cors, @fastify/helmet, @fastify/jwt, @fastify/cookie, zod, pino, drizzle-orm (workspace:*). DevDependencies: typescript ^5.5.0, @types/node ^22, tsup, vitest. Scripts: dev (node --watch), build (tsup), start (node dist/index.js). Type: module. Engine: node >=24.",
  "director_implementare": "/var/www/CerniqAPP/apps/api",
  "restrictii_antihalucinatie": [
    "NU folosi Express - TREBUIE Fastify v5+",
    "NU omite @fastify/type-provider-zod",
    "FOLOSEȘTE workspace:* pentru packages interne",
    "NU include nodemon - folosește node --watch nativ"
  ],
  "validare_task": "pnpm install în apps/api reușește; pnpm dev pornește serverul Fastify",
  "outcome": "Package API configurat cu Fastify v5.6.2 și toate dependențele"
}
```

### FAZA F0.7: BACKUP STRATEGY

```json
{
  "taskID": "F0.7.1.T001",
  "denumire_task": "Configurare BorgBackup cu Hetzner Storage Box",
  "context_anterior": "Infrastructură completă, backup neimplementat",
  "descriere_task": "Ești un expert backup și disaster recovery. Task-ul tău este să configurezi BorgBackup pentru Cerniq.app cu Hetzner Storage Box. Pași: 1) Generează SSH key dedicat (ed25519) pentru borg, 2) Uploadează public key pe Storage Box (port 23), 3) Inițializează repository borg cu encryption repokey, 4) Creează script /usr/local/bin/backup.sh cu: pre-backup pg_dumpall pentru PostgreSQL, borg create cu compression zstd:6, exclude-uri pentru node_modules și cache, 5) Configurează borg prune cu retention GFS (7D/4W/6M/2Y), 6) Creează systemd timer pentru rulare zilnică la 02:00, 7) EXPORTĂ și salvează cheia borg în loc sigur (CRITIC pentru restore).",
  "director_implementare": "/var/www/CerniqAPP/infra/scripts",
  "restrictii_antihalucinatie": [
    "NU uita să exportezi și salvezi borg key - fără ea restore e IMPOSIBIL",
    "NU include node_modules în backup (regenerabil)",
    "NU rula backup în peak hours",
    "VERIFICĂ conexiunea SSH la Storage Box înainte de cron"
  ],
  "validare_task": "borg list afișează repository; backup manual reușește; systemd timer este active; cheia borg e salvată în loc sigur",
  "outcome": "BorgBackup configurat cu retenție GFS și automatizare systemd"
}
```

### FAZA F0.8: SECURITY HARDENING

> ⚠️ **SUPERSEDED (Februarie 2026):** Această abordare cu Docker secrets a fost înlocuită de OpenBao.
> Consultă: [ADR-0033 OpenBao Secrets Management](../../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md)
> și [openbao-setup-guide.md](../../infrastructure/openbao-setup-guide.md)

```json
{
  "taskID": "F0.8.1.T001",
  "status": "SUPERSEDED - vezi ADR-0033 OpenBao",
  "denumire_task": "Configurare Docker secrets pentru credențiale",
  "context_anterior": "Infrastructură completă, secrets în .env (nesigur)",
  "descriere_task": "Ești un expert securitate DevOps. Task-ul tău este să migrezi credențialele sensibile de la environment variables la Docker secrets. Pași: 1) Creează directorul secrets/ (gitignored), 2) Creează fișiere separate pentru: postgres_password, redis_password, jwt_secret, signoz_jwt_secret, anaf_oauth_client_secret, 3) Modifică docker-compose.yml să folosească secrets: directive în loc de environment, 4) Actualizează aplicațiile să citească din /run/secrets/ folosind pattern-ul _FILE suffix, 5) Asigură-te că secrets files au permisiuni 600, 6) Documentează procesul în docs/security/secrets-management.md.",
  "director_implementare": "/var/www/CerniqAPP/infra",
  "restrictii_antihalucinatie": [
    "NU commita fișierele secret în git",
    "NU folosi environment variables pentru parole în production",
    "NU lăsa permisiuni 644 pe fișierele secret",
    "VERIFICĂ că .gitignore include secrets/"
  ],
  "validare_task": "docker compose config nu afișează parole în plain text; secrets mount corect în /run/secrets/; git status nu arată fișiere secret",
  "outcome": "Secrets management securizat implementat conform best practices"
}
```

### FAZA F0.15: CI/CD PIPELINE SETUP

> **ADR Reference:** [ADR-0032 CI/CD Pipeline Strategy](../../adr/ADR%20Etapa%200/ADR-0032-CI-CD-Pipeline-Strategy.md)

```json
{
  "taskID": "F0.15.1.T001",
  "denumire_task": "Creare CI Pipeline cu GitHub Actions",
  "context_anterior": "Infrastructură completă, deployment 100% manual via SSH",
  "descriere_task": "Ești un expert DevOps specializat în GitHub Actions. Task-ul tău este să creezi .github/workflows/ci-pr.yml pentru CI pipeline. Jobs necesare: 1) lint - ESLint 9 + TypeScript check, 2) test - Vitest cu PostgreSQL și Redis services, 3) security - Trivy filesystem scan pentru vulnerabilități, 4) docker-build - Docker Buildx verificare build (fără push), 5) python-lint (condiționat) - Ruff + mypy pentru workers/. Triggers: push pe main/develop, pull_request. Folosește concurrency groups pentru cancel-in-progress.",
  "director_implementare": "/var/www/CerniqAPP/.github/workflows",
  "restrictii_antihalucinatie": [
    "NU push images în CI - doar verificare build",
    "NU skip security scan pentru PR-uri",
    "FOLOSEȘTE frozen-lockfile pentru pnpm install",
    "VERIFICĂ Node.js 24.12.0 și PNPM 9"
  ],
  "validare_task": "CI workflow apare în GitHub Actions; PR-urile trigger-uiesc toate jobs; toate checks trec pe cod valid",
  "outcome": "CI pipeline implementat cu lint, test, security scan, docker build"
}
```

```json
{
  "taskID": "F0.15.1.T002",
  "denumire_task": "Creare CD Pipeline pentru deployments",
  "context_anterior": "CI pipeline creat în F0.15.1.T001",
  "descriere_task": "Ești un expert DevOps specializat în continuous delivery. Task-ul tău este să creezi .github/workflows/deploy.yml pentru CD pipeline. Jobs necesare: 1) setup - determină environment (staging/production) bazat pe tag format, 2) build-push - build multi-app images și push în GHCR, 3) scan-images - Trivy scan pe imagini publicate, 4) deploy-staging - SSH deploy pentru pre-release tags (v*-rc*, v*-beta*), 5) deploy-production - SSH deploy pentru release tags (vX.Y.Z), 6) verify - smoke tests post-deploy. Triggers: push tags v*.*.*, workflow_dispatch cu alegere environment.",
  "director_implementare": "/var/www/CerniqAPP/.github/workflows",
  "restrictii_antihalucinatie": [
    "NU deploy production fără tag semver valid",
    "NU skip database backup înainte de deploy production",
    "FOLOSEȘTE GitHub Environments pentru approval gates",
    "VERIFICĂ health checks post-deploy"
  ],
  "validare_task": "CD workflow apare în GitHub Actions; tag v0.0.1-rc.1 deploy-uiește în staging; tag v0.0.1 deploy-uiește în production",
  "outcome": "CD pipeline implementat cu build, push, deploy staging/production"
}
```

```json
{
  "taskID": "F0.15.2.T001",
  "denumire_task": "Configurare GitHub Secrets și Environments",
  "context_anterior": "CI/CD workflows create în F0.15.1",
  "descriere_task": "Ești un expert securitate DevOps. Task-ul tău este să configurezi GitHub repository pentru CD pipeline. Pași: 1) Generează SSH key pair (ed25519) dedicat pentru deployment, 2) Adaugă public key pe serverele staging și production în authorized_keys, 3) Configurează GitHub Secrets: STAGING_SSH_KEY, STAGING_HOST, STAGING_USER, PRODUCTION_SSH_KEY, PRODUCTION_HOST, PRODUCTION_USER, SLACK_WEBHOOK_URL (opțional), 4) Creează GitHub Environments: staging (fără restrictions), production (required reviewers, wait timer 5 min), 5) Configurează branch protection pentru main cu required status checks.",
  "director_implementare": "GitHub Repository Settings",
  "restrictii_antihalucinatie": [
    "NU commita SSH keys în repository",
    "NU folosi aceeași SSH key pentru staging și production",
    "NU skip branch protection pentru main",
    "VERIFICĂ că secrets sunt encrypted"
  ],
  "validare_task": "GitHub Secrets listează toate keys necesare; Environments staging și production există; branch protection active pentru main",
  "outcome": "GitHub repository configurat pentru CD pipeline securizat"
}
```

---

## ADDENDUM v1.1 (1 Februarie 2026)

### Documente noi (Etapa 0)

- [pgbouncer-connection-pooling.md](../../infrastructure/pgbouncer-connection-pooling.md)
- [redis-authentication.md](../../infrastructure/redis-authentication.md)
- [dns-configuration.md](../../infrastructure/dns-configuration.md)
- [github-repository-setup.md](../../infrastructure/github-repository-setup.md)
- [secrets-rotation-procedure.md](../../infrastructure/secrets-rotation-procedure.md)
- [openapi-etapa0.yaml](../../api/openapi-etapa0.yaml)

### Faze suplimentare introduse

- F0.16 DNS & Domain Configuration
- F0.17 GitHub Repository Setup
- F0.18 Documentation Generation
- F0.19 Performance Baseline
- F0.20 Operational Readiness

Această documentație completă oferă fundamentul pentru implementarea infrastructurii Cerniq.app Etapa 0, fiind aliniată cu Master Spec-ul ca sursă unică de adevăr și utilizând exclusiv versiunile latest released ale tuturor tehnologiilor.
