# CERNIQ.APP — DEVELOPER GETTING STARTED GUIDE

## Quick Start pentru Dezvoltatori

### Versiunea 1.0 | 19 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Ghid de pornire rapidă pentru dezvoltatori noi sau existenți  
**AUTHOR:** AI Documentation System

---

## CUPRINS

1. [Cerințe Preliminare](#1-cerințe-preliminare)
2. [Setup Mediu](#2-setup-mediu)
3. [Structura Proiectului](#3-structura-proiectului)
4. [Development Workflow](#4-development-workflow)
5. [Rulare Servicii Locale](#5-rulare-servicii-locale)
6. [Verificare Sănătate](#6-verificare-sănătate)
7. [Resurse Adiționale](#7-resurse-adiționale)

---

## 1. CERINȚE PRELIMINARE

### 1.1 Versiuni Obligatorii (Canonic)

> 📖 **Sursă:** [`master-specification.md`](../specifications/master-specification.md) § "Canonical Technology Versions"

| Componenta         | Versiune OBLIGATORIE  | Verificare               |
| ------------------ | --------------------- | ------------------------ |
| **Node.js**        | 25.8.1 (Current)      | `node --version`         |
| **PNPM**           | 10.32.1               | `pnpm --version`         |
| **Python**         | 3.14.3 Free-Threading | `python3 --version`      |
| **Docker**         | 29.2.0                | `docker --version`       |
| **Docker Compose** | 2.20+                 | `docker compose version` |

### 1.2 Dependențe Docker

Serviciile containerizate necesare:

| Serviciu                          | Port Local  | Imagine Docker                 |
| --------------------------------- | ----------- | ------------------------------ |
| **PostgreSQL (dev optional)**     | 5432        | `postgis/postgis:18-3.6`       |
| **Redis (dev optional)**          | 6379        | `redis:8.4.0-alpine`           |
| **OTEL Collector (dev optional)** | 64070/64071 | `otel/opentelemetry-collector` |

---

## 2. SETUP MEDIU

### 2.1 Clonare Repository

```bash
git clone git@github.com:your-org/cerniq-app.git
cd cerniq-app
```

### 2.2 Instalare Dependențe

```bash
# Instalare Node.js dependencies cu PNPM
pnpm install

# Verificare că toate packages sunt linkate
pnpm -r exec pwd
```

### 2.3 Configurare Environment Variables

```bash
# Copiere template
cp .env.example .env

# Editare cu valorile locale
nano .env
```

#### Variabile Obligatorii pentru Development

```bash
# General
NODE_ENV=development
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://c3rn1q:cerniq_ci@localhost:64032/cerniq

# Redis
REDIS_URL=redis://localhost:64039/0
REDIS_PREFIX=cerniq

# API Server
HOST=0.0.0.0
PORT=64010

# Authentication (generate cu: openssl rand -hex 32)
JWT_SECRET=your-development-jwt-secret-min-32-chars

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:64071
OTEL_SERVICE_NAME=cerniq-api
```

> 📖 **Referință Completă:** [`etapa0-environment-variables.md`](../specifications/Etapa%200/etapa0-environment-variables.md)

### 2.4 Pornire Servicii Docker

```bash
# Nota: pentru development poti rula local doar dependintele (PostgreSQL/Redis/OTEL).
# In staging/prod (infrastructura noua), PostgreSQL si Redis sunt servicii externe/shared
# (CT107 + orchestrator) si NU ruleaza ca servicii locale in stack-ul Cerniq.
#
# Pentru infrastructura noua (staging/prod): vezi `docs/infrastructure/deployment-guide.md`.

# Exemplu (optional): porniți servicii DEV (ex: redisinsight) din `infra/docker/`:
cd infra/docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
docker compose ps
```

---

## 3. STRUCTURA PROIECTULUI

```text
/var/www/CerniqAPP/
├── apps/
│   ├── api/              # Fastify API Server (localhost:64010)
│   ├── web/              # React app (localhost:64000)
│   ├── web-admin/        # React Admin Dashboard (localhost:64012)
│   └── monitoring-api/   # Internal monitoring service (localhost:64080)
├── packages/
│   ├── config/           # Config package
│   ├── db/               # Drizzle ORM + migrations
│   ├── observability/    # OpenTelemetry bootstrap
│   └── shared-types/     # Shared schemas/types
├── workers/
│   ├── enrichment/       # Worker runtime activ Etapa 0 + 1
│   └── shared/           # Queue registry, Redis, metrics
├── infra/
│   └── docker/           # Docker Compose files
└── docs/                 # Documentația proiectului
```

### Mono-repo Management

- **Package Manager:** PNPM 10.32.1 cu workspaces
- **Build Tool:** Turborepo
- **Linting:** ESLint + Prettier + markdownlint

---

## 4. DEVELOPMENT WORKFLOW

### 4.1 Rulare în Mod Development

```bash
# Terminal 1: API Server
pnpm --filter @cerniq/api dev

# Terminal 2: Web App
pnpm --filter @cerniq/web dev

# Terminal 3: Admin Dashboard
pnpm --filter @cerniq/web-admin dev

# Terminal 4: Monitoring API
pnpm --filter @cerniq/monitoring-api dev

# Terminal 5: Worker runtime
pnpm --filter @cerniq/worker-enrichment dev
```

### 4.2 Verificare Lint și Types

```bash
# Verificare TypeScript
pnpm typecheck

# Verificare Lint
pnpm lint

# Validare agregată
pnpm validate
```

### 4.3 Rulare Teste

```bash
# Workspace tests cu coverage
pnpm test:coverage

# Workspace tests cu artefacte JSON reale
pnpm test:ci

# E2E Playwright
pnpm test:e2e
```

---

## 5. RULARE SERVICII LOCALE

### 5.1 Port Allocation Matrix

> 📖 **Referință Canonică:** [`ADR-0022-Port-Allocation-Strategy.md`](../adr/ADR%20Etapa%200/ADR-0022-Port-Allocation-Strategy.md)

| Serviciu               | Port  | Endpoint                             |
| ---------------------- | ----- | ------------------------------------ |
| **Web**                | 64000 | `http://localhost:64000`             |
| **API**                | 64010 | `http://localhost:64010/api/v1`      |
| **Web Admin**          | 64012 | `http://localhost:64012`             |
| **Monitoring API**     | 64080 | `http://localhost:64080/health`      |
| **PostgreSQL (CI/dev)**| 64032 | `postgresql://localhost:64032/cerniq`|
| **Redis (CI/dev)**     | 64039 | `redis://localhost:64039/0`          |
| **OTEL Collector**     | 64070/64071 | `http://localhost:64071`      |

### 5.2 Migrații Database

```bash
# Generare migrație nouă
pnpm --filter db generate

# Aplicare migrații
pnpm --filter db migrate

# Reset database (DESTRUCTIV!)
pnpm --filter db reset
```

---

## 6. VERIFICARE SĂNĂTATE

### 6.1 Health Check Endpoints

| Endpoint              | Scop                 | Răspuns Healthy                |
| --------------------- | -------------------- | ------------------------------ |
| `GET /health`         | Liveness probe       | `200 {"status":"ok"}`          |
| `GET /health/ready`   | Readiness (DB+Redis) | `200 {"db":"ok","redis":"ok"}` |
| `GET /health/startup` | Startup probe        | `200` după init                |

### 6.2 Script de Verificare Completă

```bash
# Verificare toate serviciile
curl -s http://localhost:64000/health/ready | jq .

# Exemplu output:
# {
#   "status": "ok",
#   "db": "ok",
#   "redis": "ok",
#   "version": "0.1.0",
#   "uptime": 1234
# }
```

---

## 7. RESURSE ADIȚIONALE

### Documente Obligatorii de Citit

| Document                                                               | Scop                   | Prioritate |
| ---------------------------------------------------------------------- | ---------------------- | ---------- |
| [`master-specification.md`](../specifications/master-specification.md) | Single Source of Truth | P0         |
| [`coding-standards.md`](./coding-standards.md)                         | Standarde de cod       | P1         |
| [`architecture.md`](../architecture/architecture.md)                   | Arhitectura sistemului | P1         |
| [`glossary.md`](../architecture/glossary.md)                           | Termeni și convenții   | P2         |

### Documentație per Etapă (313 Workeri)

| Etapă                                   | Workeri | Focus                                |
| --------------------------------------- | ------- | ------------------------------------ |
| [Etapa 1](../specifications/Etapa%201/) | 58      | Data Enrichment (Bronze→Silver→Gold) |
| [Etapa 2](../specifications/Etapa%202/) | 52      | Cold Outreach (WhatsApp + Email)     |
| [Etapa 3](../specifications/Etapa%203/) | 78      | AI Sales Agent (xAI Grok-4)          |
| [Etapa 4](../specifications/Etapa%204/) | 67      | Post-Sale (Payments, Logistics)      |
| [Etapa 5](../specifications/Etapa%205/) | 58      | Nurturing (PostGIS, Graph)           |

### LLM Provider Policy

| Rol            | Provider | Model                  |
| -------------- | -------- | ---------------------- |
| **Primary**    | xAI      | Grok-4                 |
| **Fallback**   | OpenAI   | GPT-4o                 |
| **Embeddings** | OpenAI   | text-embedding-3-large |

---

## TROUBLESHOOTING

### Probleme Frecvente

| Problemă             | Cauză                       | Soluție                                              |
| -------------------- | --------------------------- | ---------------------------------------------------- |
| `ECONNREFUSED :5432` | PostgreSQL local nu rulează | Porniți PostgreSQL local sau ajustați `DATABASE_URL` |
| `ECONNREFUSED :6379` | Redis local nu rulează      | Porniți Redis local sau ajustați `REDIS_URL`         |
| `Invalid token`      | JWT_SECRET nesetat          | Verifică `.env`                                      |
| Type errors          | Versiune Node greșită       | `nvm use 25.8.1`                                     |

### Comenzi Utile de Debug

```bash
# Verificare logs Docker
docker compose logs -f

# Verificare conexiune DB
psql $DATABASE_URL -c "SELECT 1"

# Verificare Redis
redis-cli -u $REDIS_URL PING
```

---

**Generat:** 19 Ianuarie 2026  
**Bazat pe:** Master Spec v1.2, Coding Standards v1.0, ADR-0022  
**Canonical:** Da — Subordonat Master Spec
