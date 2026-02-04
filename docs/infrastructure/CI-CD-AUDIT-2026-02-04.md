# CI/CD Audit Report - 2026-02-04

## Executive Summary

Audit complet al configurației CI/CD pentru proiectul Cerniq.app, verificând integrarea cu infrastructura partajată și configurarea deployment-urilor pentru staging și production.

**Status General:**
| Environment | Status | Blocker |
|-------------|--------|---------|
| **Staging** | ✅ FUNCȚIONAL | - |
| **Production** | ⚠️ NEPREGĂTIT | Secrets + Config lipsesc |

**Proiecte pe Production care NU trebuie afectate:**
- `wappbuss` (dev.neanelu.ro) - WhatsApp Business
- `iwms-only` (IP direct) - IWMS

---

## 1. Arhitectura Actuală

### 1.1 Mașina Staging (Actuală)
```
Internet
    ↓
neanelu_traefik (port 443, TLS termination)
    ↓ Docker labels routing
cerniq-staging-proxy (nginx, port 80)
    ↓ proxy_pass
cerniq-traefik (port 64080, internal routing)
    ↓
[Servicii Cerniq: api, web, workers]
```

### 1.2 Proiecte pe Mașina Staging

| Proiect | Compose Project | Networks | Status |
|---------|-----------------|----------|--------|
| Neanelu Shopify | `neanelu_shopify` | neanelu_public_net, neanelu_frontend_network, **cerniq_public** | ✅ Running |
| Cerniq | `cerniq` | cerniq_public, cerniq_backend, cerniq_data | ✅ Running |
| GeniusERP Suite | `geniuserp_*` | geniuserp_net_* | ⚠️ Unhealthy (pre-existing) |
| Docker TLC4Pipes | `docker_*` | docker_tlc4pipes_net | ✅ Running |

### 1.3 Traefik Routing Constraints
```
--providers.docker.constraints=
    Label(`com.docker.compose.project`,`neanelu_shopify`) 
    || Label(`com.docker.compose.project`,`cerniq`)
```
**Configurație corectă**: neanelu_traefik va prelua doar containerele din proiectele `neanelu_shopify` și `cerniq`.

---

## 2. Fișiere CI/CD Auditate

### 2.1 `.github/workflows/deploy.yml` (525 linii)

**Funcționalitate:**
- ✅ Versioning automat (v0.0.x → v0.0.x+1 la push pe main)
- ✅ Build Docker images pentru 6 servicii (api, web, web-admin, 3 workers)
- ✅ Push la ghcr.io registry
- ✅ Security scan cu Trivy
- ✅ Deploy staging via SSH
- ✅ Deploy production via SSH (cu backup pre-deploy)
- ✅ Post-deploy verification și smoke tests
- ✅ GitHub Release creation pentru production

**Branch Strategy:**
| Branch | Environment | Auto-Tag |
|--------|-------------|----------|
| `main` | production | ✅ v0.0.x |
| `develop` | staging | ❌ |
| `feature/**`, `feat/**`, `fix/**`, `hotfix/**` | staging | ❌ |

### 2.2 `.github/workflows/ci-pr.yml` (357 linii)

**Funcționalitate:**
- ✅ Lint & Type Check (ESLint, TypeScript)
- ✅ Unit Tests (Vitest, exclud e2e/integration)
- ✅ Docker Build verification
- ✅ Concurrency control (cancel in-progress)

---

## 3. Configurație Necesară (GitHub Secrets)

### 3.1 Secrets Obligatorii

| Secret | Scop | Status Staging | Status Production |
|--------|------|----------------|-------------------|
| `STAGING_SSH_KEY` | SSH key pentru deploy | ✅ Key există local | ⚠️ Trebuie în GitHub |
| `STAGING_HOST` | IP server staging | ⚠️ Trebuie configurat | N/A |
| `STAGING_USER` | User SSH staging | ⚠️ Trebuie configurat | N/A |
| `PRODUCTION_SSH_KEY` | SSH key pentru deploy | ✅ Key există local | ⚠️ Trebuie în GitHub |
| `PRODUCTION_HOST` | IP server production | N/A | ❌ Server nesetat |
| `PRODUCTION_USER` | User SSH production | N/A | ❌ Server nesetat |

### 3.2 Secrets Opționale

| Secret | Scop | Recomandare |
|--------|------|-------------|
| `SLACK_WEBHOOK_URL` | Notificări deploy | Recomandat pentru production |
| `CODECOV_TOKEN` | Coverage upload | Opțional |

### 3.3 Generare Chei SSH (Referință)

Cheile există deja în `/var/www/CerniqAPP/secrets/ssh/`:
```bash
# Staging
staging_deploy_key      # Private key
staging_deploy_key.pub  # Public key (ssh-ed25519 ... cerniq-staging)

# Production
production_deploy_key      # Private key
production_deploy_key.pub  # Public key (ssh-ed25519 ... cerniq-production)
```

---

## 4. Modificări Efectuate în Acest Audit

### 4.1 `/var/www/Neanelu_Shopify/docker-compose.yml`

**Modificare 1: Adăugare rețea la serviciul traefik**
```yaml
# ÎNAINTE
networks:
  - public_net
  - neanelu_frontend_network

# DUPĂ
networks:
  - public_net
  - cerniq_public          # ← ADĂUGAT
  - neanelu_frontend_network
```

**Modificare 2: Declarare rețea externă**
```yaml
networks:
  # ... existing networks ...
  # External network for Cerniq project routing
  cerniq_public:
    external: true
```

**Rezultat:** neanelu_traefik poate acum ruta traficul către containerele Cerniq.

### 4.2 Verificare Post-Modificare

```bash
# Rețele neanelu_traefik
$ docker inspect neanelu_traefik --format='...'
cerniq_public: 172.27.0.3        # ← NOU
neanelu_frontend_network: 172.25.0.2
neanelu_public_net: 172.24.0.2
```

---

## 5. Teste Efectuate

### 5.1 Staging (staging.cerniq.app)

```bash
$ curl -sI https://staging.cerniq.app

HTTP/2 404                                      # Expected - no services yet
strict-transport-security: max-age=63072000; includeSubDomains; preload  # ✅ HSTS
x-frame-options: DENY                           # ✅ Security
x-content-type-options: nosniff                 # ✅ Security
x-xss-protection: 1; mode=block                 # ✅ Security
referrer-policy: strict-origin-when-cross-origin # ✅ Security
```

**Status: ✅ Rutare funcțională, security headers OK, 404 expected (servicii neimplementate)**

### 5.2 Production (cerniq.app) - AUDIT COMPLET

**Server Info:**
- Hostname: `erp`
- IP: `95.216.225.145`
- Docker: `28.3.3`

**DNS:**
```bash
$ host cerniq.app
cerniq.app has address 95.216.225.145  # ✅ Configurat
```

**SSL Certificate:**
```
notBefore=Feb  3 12:49:11 2026 GMT
notAfter=May  4 12:49:10 2026 GMT  # ✅ Valid 3 luni
```

**Proiecte Existente (NU TREBUIE AFECTATE):**
| Proiect | Container | Porturi | Domain |
|---------|-----------|---------|--------|
| wappbuss | backend, frontend, postgres, redis | 3060-3063 | dev.neanelu.ro |
| iwms-only | - | 3000, 3002 | IP direct (default) |

**Status Cerniq pe Producție:**
| Component | Status | Problemă |
|-----------|--------|----------|
| Networks cerniq_* | ✅ Există | - |
| /opt/cerniq | ✅ Există | docker-compose.yml vechi (v1.0.1, 140 linii) |
| nginx config | ✅ Configurat | Proxy către 127.0.0.1:64080 |
| SSL Certificate | ✅ Valid | Expiră 2026-05-04 |
| **Secrets** | ❌ **LIPSESC** | /opt/cerniq/secrets/ este GOL |
| **Config** | ❌ **LIPSESC** | /opt/cerniq/config/ este GOL |
| **Traefik** | ⏳ Nepornit | Așteaptă CI/CD deployment |
| **Containere** | ⏳ Niciunul | Așteaptă CI/CD deployment |

### 5.3 Neanelu (manager.neanelu.ro)

```bash
$ curl -sI https://manager.neanelu.ro
HTTP/2 302
location: /app/
```

**Status: ✅ Serviciile Neanelu funcționează în continuare**

---

## 6. Deploy Flow Actual

### 6.1 Staging Deploy (Feature/Develop Branch)

```mermaid
graph LR
    A[git push feature/*] --> B[GitHub Actions]
    B --> C[Build Images]
    C --> D[Push ghcr.io]
    D --> E[SSH to Staging]
    E --> F[docker compose pull]
    F --> G[docker compose up -d]
    G --> H[Health Check]
```

**Directorul pe Server:** `/opt/cerniq`

### 6.2 Production Deploy (Main Branch)

```mermaid
graph LR
    A[git push main] --> B[Auto-version v0.0.x+1]
    B --> C[Build Images]
    C --> D[Push ghcr.io]
    D --> E[Security Scan]
    E --> F[SSH to Production]
    F --> G[Backup Pre-Deploy]
    G --> H[docker compose up -d]
    H --> I[Health Check]
    I --> J[Create GitHub Release]
```

---

## 7. Probleme Identificate și Rezolvări

### 7.1 ✅ REZOLVAT: neanelu_traefik nu vedea containerele Cerniq (STAGING)

**Problemă:** neanelu_traefik nu era conectat la rețeaua `cerniq_public`
**Simptom:** HTTP 504 Gateway Timeout la staging.cerniq.app
**Rezolvare:** Adăugat `cerniq_public` în docker-compose.yml Neanelu_Shopify

### 7.2 🔴 CRITICĂ: docker-compose.yml pe producție este VECHI

**Problemă:** 
- Producție: v1.0.1, 140 linii (din 2026-02-03)
- Staging: v1.0.2, 453 linii (din 2026-02-04)

**Impact:** CI/CD va eșua deoarece fișierul nu conține:
- Configurația pentru `staging-proxy` cu labels Traefik
- Secretele pentru PostgreSQL, Redis
- Serviciul Traefik actualizat la v3.6

**Rezolvare:** CI/CD workflow face `docker compose pull && docker compose up -d` dar NU actualizează docker-compose.yml. 
Trebuie adăugat step de sincronizare în deploy workflow sau folosit git clone.

### 7.3 🔴 CRITICĂ: Secrets și Config LIPSESC pe producție

**Problemă:** 
```
/opt/cerniq/secrets/  → GOL (trebuie: postgres_password.txt, redis_password.txt, traefik_dashboard.htpasswd)
/opt/cerniq/config/   → GOL (trebuie: postgres/postgresql.conf, postgres/init.sql, traefik/*)
```

**Impact:** Docker compose va eșua la start:
```
ERROR: Cannot find secret file: /opt/cerniq/secrets/postgres_password.txt
```

**Rezolvare Necesară:**
1. Generare secrete pe producție
2. Copiere config files
3. Sau modificare CI/CD să copieze și secretele

### 7.4 ⚠️ ATENȚIE: Arhitectură diferită staging vs production

**Staging:**
```
Internet → neanelu_traefik (443) → staging-proxy (nginx) → cerniq-traefik (64080)
```

**Production (planificat):**
```
Internet → nginx (443, TLS terminare) → cerniq-traefik (64080)
```

**Diferență:** Pe producție nginx gestionează TLS, pe staging neanelu_traefik.
Aceasta necesită **docker-compose.production.yml** sau environment detection.

### 7.5 ⚠️ ATENȚIE: Port 64080 disponibil pe producție

```bash
$ ss -tlnp | grep 64080
# (empty - port liber) ✅
```

---

## 8. ACȚIUNI NECESARE ÎNAINTE DE MERGE

### 8.1 🔴 PE PRODUCȚIE (SSH manual sau script)

```bash
# 1. Generare secrete
cd /opt/cerniq/secrets
openssl rand -base64 32 > postgres_password.txt
openssl rand -base64 32 > redis_password.txt
htpasswd -nb admin $(openssl rand -base64 16) > traefik_dashboard.htpasswd
chmod 600 *.txt *.htpasswd

# 2. Copiere config files (de pe staging sau git)
scp -r staging:/var/www/CerniqAPP/infra/config/* /opt/cerniq/config/

# 3. Actualizare docker-compose.yml
# Opțiunea A: Manual copy
scp staging:/var/www/CerniqAPP/infra/docker/docker-compose.yml /opt/cerniq/

# Opțiunea B: Git clone (recomandat)
cd /opt && rm -rf cerniq
git clone --depth 1 https://github.com/[org]/CerniqAPP.git cerniq-repo
ln -s /opt/cerniq-repo/infra/docker /opt/cerniq
```

### 8.2 🔴 MODIFICARE CI/CD (deploy.yml)

Workflow-ul actual NU sincronizează fișierele! Trebuie adăugat:

```yaml
- name: 🔄 Sync docker-compose and configs
  run: |
    ssh -i ~/.ssh/deploy_key $USER@$HOST << 'ENDSSH'
      cd /opt/cerniq
      
      # Backup existing
      cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d) 2>/dev/null || true
      
      # Git pull sau SCP
      git pull origin main 2>/dev/null || echo "Not a git repo"
    ENDSSH
```

### 8.3 ✅ PE GITHUB (Settings → Secrets)

| Secret | Value | Note |
|--------|-------|------|
| `STAGING_HOST` | `135.181.183.164` | IP staging |
| `STAGING_USER` | `root` | SSH user |
| `STAGING_SSH_KEY` | (from .env base64 decode) | Ed25519 key |
| `PRODUCTION_HOST` | `95.216.225.145` | IP production |
| `PRODUCTION_USER` | `root` | SSH user |
| `PRODUCTION_SSH_KEY` | (from .env base64 decode) | Ed25519 key |

### 8.4 ✅ CREARE docker-compose.production.yml

Pentru a gestiona diferențele între staging și production:

```yaml
# docker-compose.production.yml
# Production override - no staging-proxy needed (nginx handles TLS)

services:
  staging-proxy:
    deploy:
      replicas: 0  # Disable on production
      
  traefik:
    ports:
      - "127.0.0.1:64080:64080"  # Only localhost, nginx proxies
```

### 8.5 ⚠️ VERIFICARE DUPĂ MERGE

```bash
# După CI/CD deploy, verifică:
curl -sI https://cerniq.app
# Expected: 502/503 (traefik starting) sau 404 (no services yet)

# Verifică containere
ssh root@95.216.225.145 "docker ps | grep cerniq"
```

---

## 9. Recomandări & Best Practices

### 9.1 Best Practices Deja Implementate

- ✅ External networks pentru izolare
- ✅ Docker labels pentru routing (nu file provider)
- ✅ Security headers via middleware
- ✅ Auto-versioning cu semver
- ✅ Security scan cu Trivy
- ✅ Concurrency control în CI
- ✅ SSL/TLS valid pe producție

### 9.2 De Implementat

- ⬜ Git-based deployment (clone/pull în loc de docker-compose.yml static)
- ⬜ Secrets provisioning automatizat
- ⬜ docker-compose.production.yml pentru diferențe env

---

## 10. Referințe

- [ADR-0107 CI/CD Pipeline Strategy](../adr/ADR-0107-CI-CD-Pipeline-Strategy.md)
- [Deployment Guide](./deployment-guide.md)
- [Network Topology](./network-topology.md)
- [E0-S3-PR02 Traefik Implementation](../specifications/Etapa%200/etapa0-plan-implementare-complet-v2.md)

---

**Auditor:** GitHub Copilot  
**Data:** 2026-02-04  
**Versiune Document:** 1.1 (cu audit producție)
