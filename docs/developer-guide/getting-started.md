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
| **Node.js**        | 24.12.0 "Krypton"     | `node --version`         |
| **PNPM**           | 9.x                   | `pnpm --version`         |
| **Python**         | 3.14.2 Free-Threading | `python3 --version`      |
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
DATABASE_URL=postgresql://cerniq:devpassword@localhost:5432/cerniq_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# API Server
HOST=0.0.0.0
PORT=64000

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
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up -d redisinsight
docker compose ps
```

---

## 3. STRUCTURA PROIECTULUI

```text
/var/www/CerniqAPP/
├── apps/
│   ├── api/              # Fastify 5.6.2 API Server (localhost:64000)
│   └── web-admin/        # React 19.2.3 Admin Dashboard (localhost:64010)
├── packages/
│   ├── db/               # Drizzle ORM + Migrations
│   ├── workers/          # BullMQ 5.66.5 Workers (313 total)
│   ├── shared/           # Shared utilities, types
│   └── events/           # Event schemas (Zod)
├── infra/
│   └── docker/           # Docker Compose files
├── docs/                 # 📚 Documentația completă
└── config/               # Configurații globale
```

### Mono-repo Management

- **Package Manager:** PNPM 9.x cu workspaces
- **Build Tool:** Turborepo
- **Linting:** ESLint + Prettier + markdownlint

---

## 4. DEVELOPMENT WORKFLOW

### 4.1 Rulare în Mod Development

```bash
# Terminal 1: API Server
pnpm --filter api dev

# Terminal 2: Workers (opțional - pentru testare jobs)
pnpm --filter workers dev

# Terminal 3: Frontend (opțional)
pnpm --filter web-admin dev
```

### 4.2 Verificare Lint și Types

```bash
# Verificare TypeScript
pnpm -r typecheck

# Verificare Lint
pnpm -r lint

# Formatare automată
pnpm -r format
```

### 4.3 Rulare Teste

```bash
# Unit tests (Vitest)
pnpm -r test

# Integration tests (necesită Docker)
pnpm -r test:integration

# E2E tests (necesită tot stack-ul)
pnpm test:e2e
```

---

## 5. RULARE SERVICII LOCALE

### 5.1 Port Allocation Matrix

> 📖 **Referință Canonică:** [`ADR-0022-Port-Allocation-Strategy.md`](../adr/ADR%20Etapa%200/ADR-0022-Port-Allocation-Strategy.md)

| Range       | Serviciu                 | Port        | Endpoint                        |
| ----------- | ------------------------ | ----------- | ------------------------------- |
| 64000-64009 | **API**                  | 64000       | `http://localhost:64000/api/v1` |
| 64010-64019 | **Web Admin**            | 64010       | `http://localhost:64010`        |
| 5432        | **PostgreSQL (dev)**     | 5432        | `postgresql://localhost:5432`   |
| 6379        | **Redis (dev)**          | 6379        | `redis://localhost:6379`        |
| 64070-64071 | **OTEL Collector (dev)** | 64070/64071 | `http://localhost:64071`        |

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
| Type errors          | Versiune Node greșită       | `nvm use 24.12.0`                                    |

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
