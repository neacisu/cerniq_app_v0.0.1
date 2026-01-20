# CERNIQ.APP — Deployment Guide

## Proceduri Complete pentru Bare-Metal Deployment

**Versiune:** 2.0  
**Data:** 20 Ianuarie 2026  
**Infrastructură:** Hetzner Dedicated Server

---

## 1. ARHITECTURA DEPLOYMENT

### 1.1 Stack Tehnologic

| Component | Versiune | Rol |
| --------- | -------- | --- |
| **OS** | Ubuntu 24.04 LTS | Host operating system |
| **Docker** | 29.1.3+ | Container runtime |
| **Traefik** | v3.6.6 | Reverse proxy, SSL termination |
| **PostgreSQL** | 18.1 | Primary database |
| **Redis** | 8.4.0 | BullMQ queues, caching |
| **SigNoz** | v0.107.0 | Observability (traces, metrics, logs) |

### 1.2 Server Requirements

| Etapă | RAM | CPU | Storage | Network |
| ----- | --- | --- | ------- | ------- |
| 0-2 | 64GB | 8 cores | 500GB NVMe | 1Gbps |
| 3-5 | 128GB | 16 cores | 1TB NVMe | 1Gbps |

### 1.3 Network Diagram

```text
Internet
    │
    ▼
┌─────────────────────────────────────┐
│  Traefik (443/80)                   │
│  ├─ SSL Termination                 │
│  ├─ Rate Limiting                   │
│  └─ Load Balancing                  │
└─────────────┬───────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
 ┌─────┐  ┌─────┐  ┌─────────┐
 │ API │  │ Web │  │ Workers │
 └──┬──┘  └──┬──┘  └────┬────┘
    │        │          │
    └────────┴────┬─────┘
                  ▼
         ┌───────────────┐
         │  PostgreSQL   │
         │  Redis        │
         └───────────────┘
```

---

## 2. PRE-DEPLOYMENT CHECKLIST

### 2.1 Server Preparation

- [ ] Ubuntu 24.04 LTS instalat și actualizat
- [ ] Docker Engine 29.1.3+ instalat
- [ ] UFW configurat (ports: 22, 80, 443)
- [ ] SSH key access configurat
- [ ] Fail2ban instalat și activ

### 2.2 DNS Configuration

- [ ] `api.cerniq.app` → Server IP
- [ ] `app.cerniq.app` → Server IP
- [ ] `signoz.cerniq.app` → Server IP (optional, pentru monitoring)

### 2.3 Secrets Preparation

- [ ] Database credentials generate
- [ ] Redis password generat
- [ ] JWT secret generat (256-bit)
- [ ] API keys externe obținute (ANAF, TimelinesAI, etc.)
- [ ] Docker secrets create (vezi [Secrets Guide](../specifications/Etapa%200/etapa0-docker-secrets-guide.md))

---

## 3. DEPLOYMENT PROCEDURE

### 3.1 Initial Clone & Setup

```bash
# 1. Clone repository
git clone git@github.com:cerniq/cerniq-app.git /var/www/cerniq
cd /var/www/cerniq

# 2. Checkout production branch
git checkout main

# 3. Environment configuration
cp .env.example .env.production
chmod 600 .env.production

# 4. Edit with production values
nano .env.production
```

### 3.2 Docker Secrets Creation

```bash
# Database
echo "your-strong-password" | docker secret create postgres_password -
echo "your-redis-password" | docker secret create redis_password -

# API Keys
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-anaf-token" | docker secret create anaf_api_token -

# Verify
docker secret ls
```

### 3.3 Database Initialization

```bash
# 1. Start only PostgreSQL first
docker compose -f infra/docker/docker-compose.yml up -d postgres

# 2. Wait for healthy
docker compose -f infra/docker/docker-compose.yml ps postgres
# Wait until STATUS shows "healthy"

# 3. Run migrations
docker compose -f infra/docker/docker-compose.yml exec api pnpm db:migrate

# 4. Seed initial data (optional)
docker compose -f infra/docker/docker-compose.yml exec api pnpm db:seed
```

### 3.4 Full Stack Launch

```bash
# 1. Build images (first time only)
docker compose -f infra/docker/docker-compose.yml build

# 2. Start all services
docker compose -f infra/docker/docker-compose.yml up -d

# 3. Verify all services
docker compose -f infra/docker/docker-compose.yml ps

# Expected: All services "running" or "healthy"
```

### 3.5 SSL Certificate

```bash
# Traefik auto-obtains Let's Encrypt certificates
# Verify:
curl -I https://api.cerniq.app/health

# Expected: HTTP/2 200
```

---

## 4. POST-DEPLOYMENT VERIFICATION

### 4.1 Health Checks

```bash
# API Health
curl https://api.cerniq.app/health
# Expected: {"status":"healthy","version":"1.0.0"}

# Database connectivity
curl https://api.cerniq.app/health/ready
# Expected: {"database":"connected","redis":"connected"}

# Workers health
curl https://api.cerniq.app/health/workers
# Expected: {"queues":{"active":X,"waiting":Y}}
```

### 4.2 Smoke Tests

```bash
# Test API endpoint
curl -X GET https://api.cerniq.app/api/v1/companies?limit=1

# Test authentication
curl -X POST https://api.cerniq.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cerniq.app","password":"xxx"}'
```

### 4.3 Monitoring Verification

1. Access SigNoz: `https://signoz.cerniq.app`
2. Verify traces are appearing
3. Check metrics dashboards
4. Test alert notifications

---

## 5. UPDATE PROCEDURE (Zero-Downtime)

### 5.1 Standard Update

```bash
cd /var/www/cerniq

# 1. Pull latest changes
git pull origin main

# 2. Build new images
docker compose -f infra/docker/docker-compose.yml build

# 3. Rolling update (one service at a time)
docker compose -f infra/docker/docker-compose.yml up -d --no-deps api
docker compose -f infra/docker/docker-compose.yml up -d --no-deps workers
docker compose -f infra/docker/docker-compose.yml up -d --no-deps web

# 4. Cleanup old images
docker image prune -f
```

### 5.2 Database Migration Update

```bash
# 1. Put app in maintenance mode (optional)
docker compose exec api pnpm maintenance:on

# 2. Run migrations
docker compose exec api pnpm db:migrate

# 3. Restart API with new schema
docker compose up -d --no-deps api

# 4. Disable maintenance mode
docker compose exec api pnpm maintenance:off
```

---

## 6. ROLLBACK PROCEDURE

### 6.1 Quick Rollback (Image-based)

```bash
# 1. List recent images
docker images | grep cerniq

# 2. Rollback to previous tag
docker compose -f infra/docker/docker-compose.yml up -d --no-deps \
  -e API_IMAGE=cerniq-api:previous-tag api
```

### 6.2 Full Rollback (Git-based)

```bash
# 1. Identify last working commit
git log --oneline -10

# 2. Checkout specific commit
git checkout <commit-hash>

# 3. Rebuild and deploy
docker compose -f infra/docker/docker-compose.yml build
docker compose -f infra/docker/docker-compose.yml up -d
```

### 6.3 Database Rollback

```bash
# 1. Stop writes
docker compose stop api workers

# 2. Restore from backup
./scripts/restore-db.sh /backups/postgres-YYYYMMDD.sql

# 3. Checkout matching code version
git checkout <matching-commit>

# 4. Restart services
docker compose up -d
```

---

## 7. TROUBLESHOOTING

### 7.1 Common Issues

| Symptom | Cause | Solution |
| ------- | ----- | -------- |
| API returns 502 | Container crashed | `docker logs cerniq-api` |
| Database connection refused | PostgreSQL not ready | Wait for healthy, check credentials |
| SSL certificate error | Let's Encrypt rate limit | Wait 1h, check DNS |
| Workers not processing | Redis connection | Check Redis logs, credentials |

### 7.2 Debug Commands

```bash
# View all logs
docker compose logs -f --tail=100

# Enter container shell
docker compose exec api sh

# Check resource usage
docker stats

# Inspect network
docker network inspect cerniq-network
```

### 7.3 Emergency Procedures

```bash
# Full restart (nuclear option)
docker compose down
docker compose up -d

# Clear all queues (data loss!)
docker compose exec redis redis-cli FLUSHALL
```

---

## 8. DOCUMENTE CONEXE

- [Docker Compose Reference](./docker-compose-reference.md)
- [Backup Strategy](./backup-strategy.md)
- [Backup Setup Guide](./backup-setup-guide.md)
- [CI/CD Pipeline](./ci-cd-pipeline.md)
- [Environment Variables](../specifications/Etapa%200/etapa0-environment-variables.md)
- [Secrets Management](../specifications/Etapa%200/etapa0-docker-secrets-guide.md)

---

**Actualizat:** 20 Ianuarie 2026
