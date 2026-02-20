# CERNIQ.APP — PROBLEME DESCOPERITE & REZOLVĂRI

## Audit Complet Sprint 1–4 (Etapa 0)

**Data Audit:** 5 Februarie 2026  
**Scope:** Audit complet pe 7 direcții: Sprint 1-4 contracte, CI/CD, Docker+Secrete, Teste, Staging, Producție  
**Status:** Probleme identificate, rezolvări documentate

---

## UPDATE 2026-02 — Migrare Traefik (orchestrator)

Problemele istorice legate de "Traefik intern" (porturi locale 64xxx, dashboard pe localhost, chain Nginx->Traefik etc.) sunt rezolvate prin migrarea pe infrastructura noua:

- Ingress extern: Traefik pe orchestrator (IP public orchestrator)
- CT109/CT110 nu mai ruleaza Traefik local pentru rutare externa
- Observability/OpenBao/Redis sunt centralizate pe orchestrator si accesate prin retele interne (cu gateway `hz.247` unde e necesar)

Sectiunile despre 135.181.183.164 si 95.216.225.145 raman ca istoric/audit si sunt marcate explicit ca **LEGACY / MIGRAT PE INFRA NOUA** (CT107/108/109/110 + orchestrator). Ele nu mai reprezinta starea operationala curenta.

---

## CONTEXT MEDIU — APLICAȚII COEXISTENTE PE SERVERE

> **ATENȚIE:** Fiecare server rulează multiple proiecte. Orice modificare Cerniq **NU trebuie** să afecteze celelalte aplicații.

---

### SERVER STAGING (LEGACY / MIGRAT PE INFRA NOUA) — 135.181.183.164

| Parametru  | Valoare                              |
| ---------- | ------------------------------------ |
| **OS**     | Ubuntu 24.04.3 LTS                   |
| **CPU**    | 64 cores AMD EPYC                    |
| **RAM**    | 125 GiB total, ~101 GiB disponibil   |
| **Disk**   | 875 GB NVMe, 116 GB folosit (14%)    |
| **Docker** | 29.1.3 / Compose v5.0.1              |
| **UFW**    | ACTIV — allow 22, 80, 443, 5000-5002 |

#### Proiecte active pe staging

| Proiect                             | Containere                                                                                                                                                                       | Porturi                                                         | RAM      | Note                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------- | --------------------------------------------------- |
| **Cerniq** (8 containere)           | postgres, redis, traefik, pgbouncer, openbao, openbao-agent-api, openbao-agent-workers, staging-proxy                                                                            | 64080, 64093 (127.0.0.1), 64094                                 | ~335 MiB | Rețele: 172.29.10/20/30.0/24                        |
| **Neanelu Shopify** (12 containere) | traefik, web_admin, backend_worker, postgres, redis, otel_collector, jaeger, promtail, alertmanager, loki, prometheus, grafana, redis_commander, bull_board                      | 80, 443, 65010, 65023-65025, 65031-65032                        | ~1.5 GiB | Rețele: 172.19.0.0/16, 172.24.0.0/16, 172.25.0.0/16 |
| **GeniusSuite** (26 containere)     | traefik, 12× suite-apps (cerniq, geniuserp, mercantiq, flowxify, etc.), postgres, neo4j, kafka, temporal, supertokens, openbao, grafana, prometheus, loki, tempo, otel, promtail | 6100-6400, 8088, 8445, 8000, 8080 (127.0.0.1), 8200 (127.0.0.1) | ~3.1 GiB | Rețele: 172.20-23.0.0/16                            |
| **TLC4Pipes** (3 containere)        | frontend, backend, db                                                                                                                                                            | 8811, 8000                                                      | ~142 MiB | Rețea: 172.18.0.0/16                                |

#### Servicii host staging

| Serviciu              | Port             | Note                                                                    |
| --------------------- | ---------------- | ----------------------------------------------------------------------- |
| SSH                   | 22               | Standard                                                                |
| Nginx                 | 64443 (SSL)      | proxy_pass → cerniq_traefik                                             |
| Postfix               | 25 (localhost)   | Mail relay                                                              |
| Redis (host)          | 6379 (localhost) | Separat de Docker Redis                                                 |
| PHP-FPM 8.3           | —                | Legacy, activ                                                           |
| GitHub Actions Runner | —                | `cerniq-runner-1` activ (LEGACY); runner dedicat in infra noua: `CT108` |

#### Rețele Docker staging — NO-GO subnets

| Rețea                          | Subnet         | Proprietar  |
| ------------------------------ | -------------- | ----------- |
| cerniq_public                  | 172.29.10.0/24 | Cerniq      |
| cerniq_backend                 | 172.29.20.0/24 | Cerniq      |
| cerniq_data                    | 172.29.30.0/24 | Cerniq      |
| neanelu_network                | 172.19.0.0/16  | Neanelu     |
| neanelu_public_net             | 172.24.0.0/16  | Neanelu     |
| neanelu_frontend_network       | 172.25.0.0/16  | Neanelu     |
| docker_tlc4pipes_net           | 172.18.0.0/16  | TLC4Pipes   |
| geniuserp_net_edge             | 172.20.0.0/16  | GeniusSuite |
| geniuserp_net_suite_internal   | 172.21.0.0/16  | GeniusSuite |
| geniuserp_net_backing_services | 172.22.0.0/16  | GeniusSuite |
| geniuserp_net_observability    | 172.23.0.0/16  | GeniusSuite |

#### SSL Certificates staging

| Domeniu            | Provider      |
| ------------------ | ------------- |
| staging.cerniq.app | Let's Encrypt |
| geniuserp.app      | Let's Encrypt |
| manager.neanelu.ro | Let's Encrypt |

#### Cron staging

| Frecvență    | Task                              |
| ------------ | --------------------------------- |
| Zilnic 02:00 | Backup Hetzner Storage Box        |
| Zilnic 03:00 | Borg full system backup           |
| Zilnic 01:00 | Docker disk monitor (limită 60GB) |
| Zilnic 04:00 | rkhunter security scan            |

#### Docker resources staging

| Resursă     | Valoare                                    |
| ----------- | ------------------------------------------ |
| Images      | 110 (30.76 GB, 14.95 GB reclaimable)       |
| Containers  | 58 (toate active)                          |
| Volumes     | 147 (32.92 GB)                             |
| Build Cache | 302 entries (16.6 GB, 1.16 GB reclaimable) |

---

### SERVER PRODUCȚIE (LEGACY / MIGRAT PE INFRA NOUA) — 95.216.225.145

| Parametru  | Valoare                                                     |
| ---------- | ----------------------------------------------------------- |
| **OS**     | Ubuntu 22.04.5 LTS (Proxmox LXC, kernel 5.15)               |
| **CPU**    | 4 cores (AMD Ryzen 7 PRO 1700X, 12/16 offline)              |
| **RAM**    | 10 GiB total, ~8.4 GiB disponibil                           |
| **Disk**   | 49 GB total, **35 GB folosit (76%)** — doar **12 GB liber** |
| **Swap**   | 1 GiB (487 MiB utilizat)                                    |
| **Docker** | 28.3.3 / Compose v2.39.1                                    |
| **UFW**    | ⚠️ **INACTIV** (Proxmox LXC — poate nu funcționează)        |
| **Uptime** | 259 zile                                                    |

#### Proiecte active pe producție

| Proiect                     | Containere                                                                                                                    | Porturi                                                          | RAM      | Note                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| **Cerniq** (8 containere)   | postgres, redis, traefik, pgbouncer, openbao, openbao-agent-api (unhealthy), openbao-agent-workers (unhealthy), staging-proxy | 64080, 64081 (127.0.0.1), 64090 (127.0.0.1)                      | ~552 MiB | Rețele: 172.29.10.0/24, 172.29.20.0/24, 172.29.30.0/24 |
| **WAppBuss** (4 containere) | backend, frontend, postgres:15, redis:7                                                                                       | 3060, 3061, **3062 (PG!)**, **3063 (Redis!)** — toate pe 0.0.0.0 | ~131 MiB | Rețea: 172.18.0.0/16; **DB+Redis expuse pe internet!** |
| **IWMS** (nativ, PM2)       | uvicorn (Python), vite (Node)                                                                                                 | **3000**, **3002** — pe 0.0.0.0                                  | ~577 MiB | DB: `gestiune_marfa` pe host PG :5433                  |
| **WMS v1** (systemd)        | vite frontend                                                                                                                 | **5173** — pe 0.0.0.0                                            | ~110 MiB | DB: SQLite, systemd service                            |

#### Aplicații inactive/legacy pe producție (candidați ștergere)

| Proiect               | Disk        | Note                                               |
| --------------------- | ----------- | -------------------------------------------------- |
| GeniusERPv5.4.1       | 2.6 GB      | /var/www/GeniusERPv5.4.1 — de arhivat              |
| GeniusERP             | 582 MB      | /var/www/GeniusERP — de arhivat                    |
| seceta                | 399 MB      | /var/www/seceta — de arhivat                       |
| Neanelu/Medusa        | —           | Multiple DB-uri în host PG, fără containere active |
| **Total recuperabil** | **~3.6 GB** | + 1.27 GB Docker build cache                       |

#### Servicii host producție

| Serviciu             | Port             | Note                                                                           |
| -------------------- | ---------------- | ------------------------------------------------------------------------------ |
| SSH                  | 22               | Standard                                                                       |
| Nginx                | 80, 443          | Reverse proxy: cerniq.app → :64080, IWMS → :3000/:3002, WAppBuss → :3060/:3061 |
| PostgreSQL 17 (host) | 5433 (localhost) | DB-uri: gestiune_marfa (IWMS), geniuserp2025, medusa-\*, seceta_db             |
| Postfix              | 25 (localhost)   | Mail relay                                                                     |
| Fail2ban             | —                | Activ                                                                          |
| PM2                  | —                | Gestionează IWMS (dev user)                                                    |
| wms-frontend.service | —                | Systemd service WMS v1                                                         |
| Certbot cron         | —                | Reînnoire SSL cerniq.app (exp. 4 Mai 2026)                                     |
| acme.sh cron         | —                | Reînnoire SSL dev.neanelu.ro                                                   |

#### Rețele Docker producție — NO-GO subnets

| Rețea            | Subnet         | Proprietar |
| ---------------- | -------------- | ---------- |
| cerniq_public    | 172.29.10.0/24 | Cerniq     |
| cerniq_backend   | 172.29.20.0/24 | Cerniq     |
| cerniq_data      | 172.29.30.0/24 | Cerniq     |
| wappbuss_default | 172.18.0.0/16  | WAppBuss   |

#### Resource overcommit producție (**CRITICĂ**)

Compose YAML anchors alocă limite care **depășesc RAM-ul total de 10 GiB**:

| Serviciu           | Limită Compose | Utilizare reală |
| ------------------ | -------------- | --------------- |
| cerniq-postgres    | 16 GiB (**!**) | 246 MiB         |
| cerniq-redis       | 4 GiB          | 27 MiB          |
| cerniq-traefik     | 512 MiB        | 182 MiB         |
| cerniq-openbao     | 512 MiB        | 42 MiB          |
| cerniq-agents (2×) | 128 MiB × 2    | 30 MiB          |
| cerniq-pgbouncer   | 256 MiB        | 11 MiB          |
| **Total alocat**   | **~21.5 GiB**  | **~538 MiB**    |
| **RAM disponibil** | **10 GiB**     | —               |

> **FIX NECESAR:** Trebuie activat compose overlay `docker-compose.prod.yml` cu `x-resource-postgres-production` (4 GiB), `x-resource-redis-production` etc.  
> Limita PG de 16G va cauza OOM kills sub sarcină pe producție.
> **Implementare:** Exclusiv prin CI/CD (push în `main`). Nu se rulează manual pe producție.

#### Disk breakdown producție

| Path                     | Size                        |
| ------------------------ | --------------------------- |
| /var/www/GeniusERPv5.4.1 | 2.6 GB                      |
| /var/www/IWMS            | 1.1 GB                      |
| /home/iwms-user          | 1.1 GB                      |
| /home/gestiune           | 760 MB                      |
| /var/www/GeniusERP       | 582 MB                      |
| /var/www/seceta          | 399 MB                      |
| /var/www/wms             | 374 MB                      |
| /home/dev                | 346 MB                      |
| Docker images            | 3.0 GB (454 MB reclaimable) |
| Docker build cache       | 1.27 GB (fully reclaimable) |
| Docker volumes           | 236 MB                      |

#### Cron producție

| Frecvență  | Task                              |
| ---------- | --------------------------------- |
| Orar       | Critical PG dumps                 |
| Zilnic     | Full PG dumps                     |
| Săptămânal | Base backups                      |
| Orar       | Redis snapshots                   |
| Zilnic     | Borg backup → Hetzner Storage Box |
| Lunar      | Restore test automat              |

---

### CONSTRÂNGERI CRITICE PENTRU IMPLEMENTARE

> Toate fixurile din acest document **TREBUIE** să respecte aceste constrângeri:

#### Producție — reguli stricte

1. **RAM limitat la 10 GiB** — totalul limitelor Docker + IWMS (~577M) + WMS (~110M) + WAppBuss (~131M) + host PG nu trebuie să depășească 10 GiB
2. **Disk la 76%** — nu instala nimic nou fără curățare prealabilă (docker system prune, arhivare legacy apps)
3. **Nu modifica porturile:** 3060-3063 (WAppBuss), 3000/3002 (IWMS), 5173 (WMS), 5433 (host PG)
4. **Nu modifica rețelele:** wappbuss_default (172.18.0.0/16)
5. **Nu modifica Nginx vhosts:** cerniq.app, IWMS, WAppBuss — fiecare are configurație separată
6. **UFW:** Pe Proxmox LXC s-ar putea să nu funcționeze — testează `ufw enable` manual înainte de script
7. **Certbot/acme.sh:** Nu modifica — SSL se reînnoiește automat
8. **PM2 / systemd WMS:** Nu modifica — IWMS și WMS rulează independent de Docker
9. **Rețele Docker standardizate**: 172.29.10/20/30.0/24 pe staging și producție
10. **Implementare producție:** Orice schimbare se face **exclusiv prin CI/CD**, declanșată de push în `main`.

#### Staging — reguli stricte

1. **58 containere active** — 4 proiecte coexistente (Cerniq, Neanelu, GeniusSuite, TLC4Pipes)
2. **Nu modifica rețelele:** neanelu*\* (172.19/24/25.0.0/16), geniuserp*\* (172.20-23.0.0/16), docker_tlc4pipes_net (172.18.0.0/16)
3. **Neanelu Traefik** gestionează porturile 80/443 — Cerniq Traefik ascultă pe 64080 **în spatele** Nginx :64443
4. **Nu modifica UFW staging** — regulile existente (22, 80, 443, 5000-5002) sunt corecte
5. **GitHub Actions Runner** — serviciu `actions.runner.*.service` activ, nu opri/reporni
6. **Host Redis** (port 6379 localhost) — nu confunda cu Docker cerniq-redis

---

## CUPRINS

1. [CRITICE — PRODUCȚIE](#1-critice--producție)
2. [CRITICE — STAGING](#2-critice--staging)
3. [CRITICE — REPO/CI/CD](#3-critice--repocicd)
4. [DOCUMENTAȚIE — ADR-uri stale](#4-documentație--adr-uri-stale)
5. [CI/CD — Gapuri pipeline](#5-cicd--gapuri-pipeline)
6. [TESTE — Gapuri infrastructure](#6-teste--gapuri-infrastructură)
7. [SECURITATE — Staging & General](#7-securitate--staging--general)
8. [ORDINE IMPLEMENTARE](#8-ordine-implementare)

---

## 1. CRITICE — PRODUCȚIE

### C1. UFW Firewall INACTIV pe producție

**Severitate:** 🔴 CRITICĂ  
**Server:** 95.216.225.145 — LEGACY / MIGRAT PE INFRA NOUA (producție)  
**Problema:** Firewall-ul UFW este **dezactivat**. Porturile 3060-3063 (WappBuss PostgreSQL + Redis) sunt expuse direct pe internet. Oricine poate accesa baza de date WappBuss fără autentificare de rețea.

**Descoperire:**

```
root@erp:~# ufw status
Status: inactive
```

Porturi expuse public fără protecție:
| Port | Serviciu | Risc |
|------|----------|------|
| 3062 | WappBuss PostgreSQL | DB pe internet |
| 3063 | WappBuss Redis | Cache pe internet |
| 5173 | Vite dev server | Dev server pe producție |
| 3000, 3002 | Node/Python servers | Aplicații neprotejate |

**Rezolvare (adaptat producție LXC + proiecte coexistente):**
**Implementare:** Exclusiv prin CI/CD (push în `main`). Nu se rulează manual pe producție.

1. **Confirmă că UFW funcționează în LXC** (pe Proxmox uneori nu aplică reguli). Dacă `ufw enable` nu modifică traficul, folosește firewall pe host Proxmox.
2. **Nu bloca porturile proiectelor existente** înainte de a valida accesul:

- IWMS: 3000/3002
- WMS v1: 5173
- WAppBuss: 3060/3061 (frontend/backend)

3. **Blochează doar DB/Redis expuse** (3062/3063) după ce confirmi că WAppBuss nu le folosește extern.

```bash
# Rulat automat prin CI/CD pe runner-ul de producție
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
# Menține temporar porturile de aplicații până confirmi dependințele
ufw allow 3000/tcp
ufw allow 3002/tcp
ufw allow 5173/tcp
ufw allow 3060/tcp
ufw allow 3061/tcp

# După validare, blochează DB/Redis expuse
ufw deny 3062/tcp
ufw deny 3063/tcp

ufw enable
ufw status verbose
```

**Notă:** Dacă UFW nu aplică reguli în LXC, mută filtrarea pe firewall-ul Proxmox și în Nginx (deny IP) pentru 3062/3063.

**Implementare exclusiv prin CI/CD (push în main):**

- Actualizează `.github/workflows/deploy.yml` cu pașii UFW pentru producție și rulează doar prin pipeline (self-hosted runner).
- Nu rula manual comenzi pe producție; orice modificare UFW se face doar prin deploy-ul automat declanșat de push în `main`.

**Fișiere de actualizat:**

- `infra/scripts/setup-firewall.sh` — verifică că include reguli pentru producție
- `.github/workflows/deploy.yml` — adaugă step de activare UFW în deploy producție

---

### C2. OpenBao Agents crash loop pe producție (403 Forbidden)

**Severitate:** 🔴 CRITICĂ  
**Server:** 95.216.225.145 — LEGACY / MIGRAT PE INFRA NOUA (producție)  
**Problema:** Ambii OpenBao Agents (`cerniq-openbao-agent-api` și `cerniq-openbao-agent-workers`) sunt UNHEALTHY cu 15-16 restartări. Eroarea: `403 permission denied` la accesul `database/creds/api-role`.

**Descoperire:**

```
cerniq-openbao-agent-api       Up 3 hours (unhealthy)    16 restarts
cerniq-openbao-agent-workers   Up 3 hours (unhealthy)    15 restarts

Error: 1 error occurred:
  * error preflight capability check: Error making API request. Code: 403
  URL: PUT https://openbao:8200/v1/sys/capabilities-self
  Message: permission denied
```

**Cauza root:** Politicile OpenBao nu au fost configurate pe producție. Scripturile `openbao-setup-engines.sh` și `openbao-setup-approle.sh` nu au fost rulate după init.

**Rezolvare (adaptat producție):**
**Implementare:** Exclusiv prin CI/CD (push în `main`). Nu se rulează manual pe producție.

```bash
# Rulat automat prin CI/CD pe runner-ul de producție
cd /opt/cerniq

# 1. Setare OPENBAO_ADDR
export OPENBAO_ADDR="http://127.0.0.1:64090"
export OPENBAO_TOKEN=$(cat secrets/openbao_root_token.txt)

# 2. Configurare engines
bash scripts/openbao-setup-engines.sh

# 3. Configurare AppRole
bash scripts/openbao-setup-approle.sh

# 4. Populare secrete KV
docker exec -e BAO_ADDR=http://127.0.0.1:8200 \
  -e BAO_TOKEN=$OPENBAO_TOKEN \
  cerniq-openbao bao kv put secret/cerniq/database \
    pg_user=c3rn1q \
    pg_password=$(cat secrets/postgres_password.txt) \
    pg_host=pgbouncer \
    pg_port=64033 \
    pg_database=cerniq

docker exec -e BAO_ADDR=http://127.0.0.1:8200 \
  -e BAO_TOKEN=$OPENBAO_TOKEN \
  cerniq-openbao bao kv put secret/cerniq/redis \
    password=$(cat secrets/redis_password.txt) \
    host=redis \
    port=64039

# 5. Restart agents
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart openbao-agent-api openbao-agent-workers
```

**Notă:** Rulează scripturile OpenBao **doar** în intervale cu trafic minim pentru a evita impact asupra IWMS/WAppBuss (resurse limitate).

**Implementare exclusiv prin CI/CD (push în main):**

- Adaugă în `.github/workflows/deploy.yml` un pas explicit pentru `scripts/openbao-setup-engines.sh` și `scripts/openbao-setup-approle.sh` în targetul production.
- Rularea se face automat la push în `main`; nu executa manual aceste scripturi pe producție.

**Fișiere de verificat:**

- `infra/config/openbao/policies/api-policy.hcl` — trebuie să includă `database/creds/api-role`
- `infra/config/openbao/policies/workers-policy.hcl` — trebuie să includă `database/creds/workers-role`
- `.github/workflows/deploy.yml` — verifică că deploy production rulează setup OpenBao complet

---

### C3. postgresql.conf de STAGING folosit pe PRODUCȚIE

**Severitate:** 🔴 CRITICĂ  
**Server:** 95.216.225.145 — LEGACY / MIGRAT PE INFRA NOUA (producție, 10GB RAM, 4 cores)  
**Problema:** Fișierul `postgresql.conf` deploiat pe producție este cel de staging (configurat pentru 125GB RAM / 64 cores). `shared_buffers = 4GB` și `effective_cache_size = 12GB` pe un server cu doar 10GB RAM total.

**Descoperire:**

```
# Header din fișier:
# PostgreSQL 18.1 Configuration for Cerniq.app - STAGING
# Environment: Staging (125GB RAM, 64 cores AMD EPYC)
# Allocated: 16GB RAM for PostgreSQL
```

**Rezolvare (adaptat producție 10GB RAM):**
**Implementare:** Exclusiv prin CI/CD (push în `main`). Nu se rulează manual pe producție.

1. Deploy.yml trebuie să copieze `postgresql.production.conf` pe producție în loc de `postgresql.conf`
2. Fișierul `postgresql.production.conf` are setări corecte pentru 10GB RAM, dar are un bug: `port = 5432` trebuie schimbat la `port = 64032`
3. Nu mări `shared_buffers` sau `work_mem` peste valorile din fișierul production; serverul găzduiește și IWMS/WMS/WAppBuss.

```bash
# Fix în repo:
# infra/config/postgres/postgresql.production.conf linia 4:
# SCHIMBĂ: port = 5432
# CU:      port = 64032
```

**Fișiere de actualizat:**

- `infra/config/postgres/postgresql.production.conf` — fix port 5432 → 64032
- `.github/workflows/deploy.yml` — secțiunea de config sync production trebuie să copieze `postgresql.production.conf` ca `postgresql.conf`

**Implementare exclusiv prin CI/CD (push în main):**

- Schimbarea fișierului și sincronizarea pe producție se fac doar prin deploy automat (push în `main`).
- Nu copia manual fișiere pe producție; folosește doar pasul de sync din pipeline.

---

### C4. docker-compose.prod.yml NU este aplicat pe producție

**Severitate:** 🔴 CRITICĂ  
**Server:** 95.216.225.145 — LEGACY / MIGRAT PE INFRA NOUA (producție)  
**Problema:** Containerele rulează doar cu `docker-compose.yml` (fără override-ul prod). Asta înseamnă:

- PostgreSQL are limita 16GB memory pe server cu 10GB RAM
- Redis are maxmemory 8GB — combinat cu PG depășește RAM-ul fizic
- Swap usage deja la 48.7%

**Descoperire:**

```bash
docker inspect cerniq-postgres --format '{{json .Config.Labels}}' | jq '.["com.docker.compose.project.config_files"]'
# Output: "/opt/cerniq/docker-compose.yml"
# LIPSĂ: docker-compose.prod.yml
```

**Rezolvare (adaptat producție cu RAM limitat):**
**Implementare:** Exclusiv prin CI/CD (push în `main`). Nu se rulează manual pe producție.

```bash
# Rulat automat prin CI/CD pe runner-ul de producție
cd /opt/cerniq
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
```

**Notă:** Verifică după recreare că `Memory` limits nu depășesc 10GB total. Scop: PG 4G, Redis 1-2G, restul sub 1G.

**Implementare exclusiv prin CI/CD (push în main):**

- Deploy-ul trebuie să ruleze `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate` din pipeline.
- Nu rula manual `docker compose` pe producție; rulează doar prin workflow-ul de deploy la push în `main`.

**Fișiere de actualizat:**

- `.github/workflows/deploy.yml` — verifică că deploy production folosește `-f docker-compose.yml -f docker-compose.prod.yml`

---

### C5. Backup-uri NE-programate pe producție

**Severitate:** 🔴 CRITICĂ  
**Server:** 95.216.225.145 — LEGACY / MIGRAT PE INFRA NOUA (producție)  
**Problema:** Scripturile de backup există în `/opt/cerniq/scripts/` dar **nu sunt în crontab**. Zero backup-uri automate active. Log-ul de backup e gol.

**Descoperire:**

```bash
crontab -l | grep -i backup
# NIMIC

cat /var/log/borg_backup.log
# EMPTY
```

**Rezolvare (adaptat producție cu disk 76% utilizat):**
**Implementare:** Exclusiv prin CI/CD (push în `main`). Nu se rulează manual pe producție.

```bash
# Rulat automat prin CI/CD pe runner-ul de producție
cp /opt/cerniq/config/cron/cerniq-backup /etc/cron.d/cerniq-backup
chmod 644 /etc/cron.d/cerniq-backup
chown root:root /etc/cron.d/cerniq-backup
systemctl restart cron

# Verificare:
crontab -l
```

**Notă:** Înainte de a porni Borg full backup, eliberează spațiu (șterge cache Docker + arhivează aplicații legacy) pentru a evita umplerea discului.

**Implementare exclusiv prin CI/CD (push în main):**

- Adaugă în `.github/workflows/deploy.yml` step de copiere a cron-ului în `/etc/cron.d/` și restart cron.
- Nu edita crontab manual pe producție; folosește doar deploy-ul automat la push în `main`.

Conținutul cron-ului (din `infra/config/cron/cerniq-backup`):

```
# Zilnic 04:00 — Borg backup complet
0 4 * * * root /opt/cerniq/scripts/borg_backup_daily.sh

# Duminici 05:00 — Borg check integritate
0 5 * * 0 root /opt/cerniq/scripts/borg_check.sh

# Orar — Redis backup
0 * * * * root /opt/cerniq/scripts/redis_backup_hourly.sh

# Zilnic 03:30 — pg_dump
30 3 * * * root /opt/cerniq/scripts/pg_dump_daily.sh

# Lunar, ziua 1, 07:00 — Restore test
0 7 1 * * root /opt/cerniq/scripts/backup_restore_test.sh
```

**Fișiere de actualizat:**

- `.github/workflows/deploy.yml` — secțiunea deploy production trebuie să copieze cron-ul la `/etc/cron.d/`

---

### C6. Port mismatch pe producție (compose zice 64032, containere ascultă pe 5432)

**Severitate:** 🔴 CRITICĂ  
**Server:** 95.216.225.145 — LEGACY / MIGRAT PE INFRA NOUA (producție)  
**Problema:** Docker-compose.yml actualizat la port 64032 dar containerele active folosesc portul 5432 (din versiunea anterioară). Un `docker compose up -d` va sparge conectivitatea DB.

**Descoperire:**

```
# În compose (actualizat):
LISTEN_PORT: 64033        # PgBouncer
port = 64032              # PostgreSQL

# Containere active (vechi):
pg_isready -p 5432        # healthcheck rulează pe 5432
DB_PORT: 5432             # PgBouncer conectare la PG
```

**Rezolvare (adaptat producție + risc minim):**
**Implementare:** Exclusiv prin CI/CD (push în `main`). Nu se rulează manual pe producție.
Trebuie recreat cu atenție — nu poți face direct `up -d` pentru că va sparge tot:

```bash
# Rulat automat prin CI/CD pe runner-ul de producție
cd /opt/cerniq

# 1. Backup date înainte de orice
docker exec cerniq-postgres pg_dump -U c3rn1q -d cerniq -F c -f /tmp/backup_before_port_change.dump

# 2. postgresql.production.conf trebuie port = 64032 (fix C3)

# 3. Stop, recreate ALL cu override-ul prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Verificare
docker exec cerniq-postgres pg_isready -h localhost -p 64032 -U c3rn1q
```

**Notă:** Fereastra de downtime trebuie coordonată cu echipele IWMS/WAppBuss (server comun). Rulează noaptea/local low-traffic.

**Implementare exclusiv prin CI/CD (push în main):**

- Operațiunea combinată C3+C4+C6 se face doar prin pipeline-ul de production (push în `main`).
- Workflow-ul trebuie să includă backup pre-recreate și recreate complet; nu rula manual pe producție.

⚠️ **IMPORTANT:** C3, C4 și C6 trebuie rezolvate ÎMPREUNĂ într-o singură operațiune de recreare.

---

## 2. CRITICE — STAGING

### C7. Containere pornite din directoare diferite (split working directory)

**Severitate:** 🟠 HIGH  
**Server:** Staging 135.181.183.164 — LEGACY / MIGRAT PE INFRA NOUA  
**Problema:** Postgres + PgBouncer rulează din `/opt/cerniq` (prod override), dar celelalte 6 containere rulează din `/var/www/CerniqAPP/infra/docker` (repo direct). Asta înseamnă că 6 containere NU folosesc docker-compose.prod.yml.

**Descoperire:**

```
cerniq-postgres    → WorkingDir: /opt/cerniq (CORECT)
cerniq-pgbouncer   → WorkingDir: /opt/cerniq (CORECT)
cerniq-redis       → WorkingDir: /var/www/CerniqAPP/infra/docker (GREȘIT)
cerniq-traefik     → WorkingDir: /var/www/CerniqAPP/infra/docker (GREȘIT)
cerniq-openbao     → WorkingDir: /var/www/CerniqAPP/infra/docker (GREȘIT)
... (încă 3)
```

**Rezolvare (adaptat staging cu alte proiecte active):**

```bash
cd /opt/cerniq
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
```

**Notă:** Verifică înainte că porturile 80/443 rămân gestionate de `neanelu_traefik` și că Nginx proxy (64443) rămâne neschimbat.

Toate containerele trebuie pornite din `/opt/cerniq` cu ambele compose files.

---

### C8. Traefik config LIPSĂ din /opt/cerniq/config/traefik/

**Severitate:** 🟠 HIGH  
**Server:** Staging 135.181.183.164 — LEGACY / MIGRAT PE INFRA NOUA  
**Problema:** Directorul `/opt/cerniq/config/traefik/` nu conține `traefik.yml` și `dynamic/middlewares.yml`. Traefik funcționează doar pentru că a fost pornit din repo. Dacă se repornește din `/opt/cerniq`, va eșua.

**Rezolvare (adaptat staging cu Neanelu Traefik activ):**

```bash
# Copiere config traefik la locația corectă
mkdir -p /opt/cerniq/config/traefik/dynamic
cp /var/www/CerniqAPP/infra/docker/traefik/traefik.yml /opt/cerniq/config/traefik/
cp /var/www/CerniqAPP/infra/docker/traefik/dynamic/middlewares.yml /opt/cerniq/config/traefik/dynamic/
```

**Notă:** Nu modifica `neanelu_traefik` și nu schimba binding-ul 80/443. Cerniq Traefik rămâne doar pe 64080.

**Fișiere de actualizat:**

- `.github/workflows/deploy.yml` — secțiunea staging config sync trebuie să copieze și traefik configs
- `infra/docker/docker-compose.prod.yml` — verifică mount-urile traefik să pointeze la `./config/traefik/`

---

### C9. OpenBao templates pe staging au port PgBouncer GREȘIT

**Severitate:** 🟠 HIGH  
**Server:** Staging 135.181.183.164 — LEGACY / MIGRAT PE INFRA NOUA
**Problema:** Template-urile OpenBao deployed conțin `pgbouncer:6432` dar PgBouncer ascultă pe `64033`. Când API/workers vor porni, vor primi un DATABASE_URL greșit.

**Descoperire:**

```
# Pe staging deployed:
DATABASE_URL=postgresql://...@pgbouncer:6432/cerniq

# În repo (corect):
DATABASE_URL=postgresql://...@pgbouncer:64033/cerniq
```

**Rezolvare (adaptat staging):**

```bash
# Resync templates din repo
cp /var/www/CerniqAPP/infra/config/openbao/templates/api-env.tpl /opt/cerniq/config/openbao/templates/
cp /var/www/CerniqAPP/infra/config/openbao/templates/workers-env.tpl /opt/cerniq/config/openbao/templates/

# Restart agents
cd /opt/cerniq
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart openbao-agent-api openbao-agent-workers
```

**Notă:** Nu reporni alte proiecte (Neanelu/GeniusSuite/TLC4Pipes). Limitează restartul strict la agenti OpenBao.

---

## 3. CRITICE — REPO/CI/CD

### C10. Trivy image scan NU blocant în deploy.yml

**Severitate:** 🟠 HIGH  
**Fișier:** `.github/workflows/deploy.yml`  
**Problema:** Scanarea Trivy a imaginilor Docker în pipeline-ul de deploy are `exit-code: '0'` și `continue-on-error: true`. Vulnerabilitățile HIGH/CRITICAL nu blochează deploy-ul.

**Descoperire:**

```yaml
# deploy.yml linia ~200:
- name: Security scan
  run: |
    trivy image ... --exit-code 0 --severity HIGH,CRITICAL
  continue-on-error: true
```

**Rezolvare:**

```yaml
# Schimbă exit-code la 1 și elimină continue-on-error:
- name: Security scan
  run: |
    trivy image ... --exit-code 1 --severity HIGH,CRITICAL
```

**Notă (impact mediu):** Rulează doar în CI. In infrastructura noua, self-hosted runner-ul este pe `CT108` (dedicat), nu pe staging legacy.

**Fișiere de actualizat:**

- `.github/workflows/deploy.yml` — Trivy exit-code 0 → 1, elimină continue-on-error

---

### C11. Plaintext password în infra/docker/.env

**Severitate:** 🟠 HIGH  
**Fișier:** `infra/docker/.env`  
**Problema:** Conține `POSTGRES_PASSWORD=ZxyHcMlDTjiA4Nv46RYMS2MTcx5lXayJfrC02EEI6WwYZ2uwERrTYnix81221vc` în clar. Deși `.env` e gitignored și variabila nu e folosită (compose folosește `POSTGRES_PASSWORD_FILE`), e o parolă reziduală pe disc.

**Rezolvare:**

```bash
# Elimină linia cu POSTGRES_PASSWORD din .env sau șterge fișierul dacă nu are alt conținut util
sed -i '/POSTGRES_PASSWORD/d' /var/www/CerniqAPP/infra/docker/.env
```

**Notă (impact mediu):** Modificare doar în repo. Nu șterge alte fișiere `.env` din proiectele coexistente (Neanelu/GeniusSuite/TLC4Pipes).

---

### C12. validate-postgres.sh: DB_USER greșit

**Severitate:** 🟠 HIGH  
**Fișier:** `infra/scripts/validate-postgres.sh`, linia 12  
**Problema:** `DB_USER="cerniq"` când user-ul corect este `c3rn1q`. Scriptul va eșua la conectare.

**Rezolvare:**

```bash
# validate-postgres.sh linia 12:
# SCHIMBĂ: DB_USER="cerniq"
# CU:      DB_USER="c3rn1q"
```

**Notă (impact mediu):** Folosește scriptul doar în CI/staging. In infra noua, staging/prod sunt CT-uri dedicate (CT110/CT109), dar evita rularea testelor agresive in ore de varf.

**Fișiere de actualizat:**

- `infra/scripts/validate-postgres.sh` — linia 12: `DB_USER="c3rn1q"`

---

### C13. init.sql: password hardcodat pentru cerniq_vault

**Severitate:** 🟡 MEDIUM  
**Fișier:** `infra/config/postgres/init.sql`, linia ~73  
**Problema:** `CREATE ROLE cerniq_vault WITH LOGIN PASSWORD 'vault_initial_password_change_me'` — parolă hardcodată într-un fișier committat.

**Rezolvare:**
Acceptabil ca password inițial dacă este schimbat de OpenBao la prima configurare. Adaugă comentariu explicit:

```sql
-- IMPORTANT: Această parolă inițială este rotită automat de OpenBao Database Engine
-- la prima execuție a openbao-setup-database.sh. NU folosiți manual.
CREATE ROLE cerniq_vault WITH LOGIN PASSWORD 'vault_initial_password_change_me';
```

**Notă (impact mediu):** Doar documentare în repo. Nu reporni Postgres pe producție doar pentru acest comentariu.

---

## 4. DOCUMENTAȚIE — ADR-uri stale

### D1. ADR-0015: Subnete greșite

**Fișier:** `docs/adr/ADR Etapa 0/ADR-0015-Docker-Containerization-Strategy.md`  
**Problema:** Documentează subnete `172.20.0.0/24`, `172.21.0.0/24`, `172.22.0.0/24` dar implementarea folosește `172.29.10.0/24`, `172.29.20.0/24`, `172.29.30.0/24`.

**Rezolvare:** Actualizează ADR-0015 cu subnet-urile reale:

- `cerniq_public` — `172.29.10.0/24`
- `cerniq_backend` — `172.29.20.0/24`
- `cerniq_data` — `172.29.30.0/24`

**Notă (impact mediu):** Menționează explicit că **staging și producția** folosesc 172.29.10/20/30.0/24. Documentația NU trebuie interpretată ca instrucțiune de schimbare a rețelelor live.

---

### D2. ADR-0022: Port PgBouncer greșit

**Fișier:** `docs/adr/ADR Etapa 0/ADR-0022-*.md`  
**Problema:** Documentează PgBouncer pe portul `64042` dar implementarea folosește `64033`.

**Rezolvare:** Actualizează portul PgBouncer la `64033` în ADR-0022.

**Notă (impact mediu):** Update doar în documentație. Nu schimba porturile runtime pe celelalte proiecte.

---

### D3. ADR-0004: max_connections și io_method

**Fișier:** `docs/adr/ADR Etapa 0/ADR-0004-*.md`  
**Problema:**

- ADR specifică `max_connections = 200` dar postgresql.conf are `100`
- ADR specifică `io_method = io_uring` dar implementarea folosește `worker` (limitare Docker)

**Rezolvare:** Adaugă note in ADR-0004:

- Staging: `max_connections = 100` (suficient pentru load actual)
- `io_method = worker` din cauza lipsei suport `io_uring` în containerele Docker
- Producție: `max_connections = 50` (server mic, 4 cores)

**Notă (impact mediu):** Clarifică că setările diferă între staging și producție din cauza resurselor limitate și a coexistenței altor proiecte pe producție.

---

### D4. Port Matrix: subnete și port-uri greșite

**Fișier:** `docs/specifications/Etapa 0/etapa0-port-matrix.md`  
**Problema:**

- Secțiunea Docker Network Configuration arată subnete 172.20/21/22 în loc de 172.29.10/20/30
- SigNoz listat pe port 64080 (conflict cu Traefik)
- PgBouncer (64033) nu e în tabel
- OpenBao (64090) nu e explicit în tabelul Service-to-Port Mapping

**Rezolvare:** Actualizează port-matrix cu valorile reale din docker-compose.yml.

**Notă (impact mediu):** Include porturile celorlalte proiecte pe producție (3000/3002, 3060-3063, 5173) ca „reserved/external” ca să evităm coliziuni viitoare.

---

### D5. Versiune Traefik — comentarii stale

**Fișiere:**

- `infra/docker/traefik/traefik.yml` — header zice `v3.3.5`
- `infra/scripts/trivy-scan.sh` — referă `traefik:v3.3.3`

**Problema:** Versiunea reală e `traefik:v3.6` (din docker-compose.yml). Comentariile sunt vechi.

**Rezolvare:** Actualizează versiunea la `v3.6` (sau `v3.6.7` — versiunea exactă care rulează) în:

- `infra/docker/traefik/traefik.yml` header
- `infra/scripts/trivy-scan.sh` lista de imagini

**Notă (impact mediu):** Doar actualizare de comentarii și scan list. Nu schimbă imaginile runtime până nu există fereastră de mentenanță.

---

### D6. openbao.hcl: typo port

**Fișier:** `infra/config/openbao/openbao.hcl`  
**Problema:** Comentariu zice "exposed as 64200" dar portul real e `64090`.

**Rezolvare:** Fix comentariu: `# Port 8200 internal - exposed as 64090 on localhost only via Docker`

**Notă (impact mediu):** Nu necesită redeploy sau restart.

---

## 5. CI/CD — Gapuri pipeline

### CI1. Security scans rulează doar pe PRs la develop

**Fișier:** `.github/workflows/ci-pr.yml`  
**Problema:** Job-ul `security` (Trivy + pnpm audit) se execută doar pe `pull_request` cu `base_ref == 'develop'`. PRs la `main` NU au scanare de securitate.

**Rezolvare:**

```yaml
# Schimbă condiția:
if: github.event_name == 'pull_request'
# În loc de:
if: github.event_name == 'pull_request' && github.base_ref == 'develop'
```

**Notă (impact mediu):** In infra noua, rulările au loc pe runner-ul dedicat `CT108`; scanările grele (Trivy) raman recomandate in afara orelor de varf.

---

### CI2. Production smoke test failures NU blochează deploy

**Fișier:** `.github/workflows/deploy.yml`  
**Problema:** În secțiunea smoke tests producție, `exit 1` este comentat. Dacă un smoke test eșuează, deploy-ul continuă.

**Rezolvare:** De-comentat `exit 1` în smoke tests producție. Eșecurile trebuie să oprească pipeline-ul.

**Notă (impact mediu):** Smoke tests trebuie să fie read-only și să nu atingă aplicațiile non-Cerniq de pe producție (IWMS/WAppBuss).
**Implementare:** Exclusiv prin CI/CD (push în `main`). Nu se rulează manual pe producție.

---

### CI3. Workers lipsesc din deploy.yml v2.0 build matrix

**Fișier:** `.github/workflows/deploy.yml`  
**Problema:** Versiunea v2.0 construiește doar 3 imagini (api, web, web-admin). Worker images (worker-ai, worker-enrichment, worker-outreach) au fost eliminate.

**Rezolvare:** Adaugă workers înapoi în build matrix sau documentează decizia de excludere explicită (dacă workers nu se deploy-ează ca containere Docker separate).

**Notă (impact mediu):** Dacă workers sunt adăugați, verifică resursele pe producție (10GB RAM) și evită lansarea lor înainte de a ajusta limits.
**Implementare:** Exclusiv prin CI/CD (push în `main`) pentru orice schimbare care afectează deploy-ul pe producție.

---

### CI4. Prettier check lipsă din CI

**Fișier:** `.github/workflows/ci-pr.yml`  
**Problema:** ESLint rulează dar Prettier nu. Nu se verifică formatarea codului.

**Rezolvare:** Adaugă step `pnpm format:check` în job-ul `lint`, sau integrează Prettier în ESLint config.

**Notă (impact mediu):** Rulează doar în CI; nu e nevoie să rulezi pe servere.

---

### CI5. ShellCheck lipsă

**Fișier:** `.github/workflows/ci-pr.yml`  
**Problema:** Scripturile bash sunt validate doar cu `bash -n` (syntax check). ShellCheck (best practices, bugs potențiale) nu rulează.

**Rezolvare:**

```yaml
- name: ShellCheck
  run: |
    apt-get install -y shellcheck
    find infra/scripts -name '*.sh' -exec shellcheck {} +
```

**Notă (impact mediu):** Folosește caching în CI dacă e posibil; staging runner are și alte proiecte.

---

### CI6. dependabot.yml / Renovate lipsă

**Fișier:** `.github/dependabot.yml`  
**Problema:** Nu există mecanism automat de actualizare dependențe.

**Rezolvare:** Creează `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "docker"
    directory: "/infra/docker"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

**Notă (impact mediu):** Dependabot doar propune PR-uri; nu afectați serverele fără aprobări și ferestre dedicate.

---

### CI7. Test results JSON nu sunt uploadate ca artifacts

**Fișier:** `.github/workflows/ci-pr.yml`  
**Problema:** Coverage merge la Codecov dar rezultatele testelor (vitest-results.json) nu sunt salvate ca GitHub artifacts. Imposibil de urmărit trenduri.

**Rezolvare:**

```yaml
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results/
    retention-days: 30
```

**Notă (impact mediu):** Upload doar din CI. Nu copia rezultate pe producție.

---

## 6. TESTE — Gapuri infrastructură

### T1. Zero unit tests

**Director:** `tests/unit/`  
**Problema:** Directorul e GOL. Master plan-ul cere ~2000+ unit tests (70% din piramida de testare).

**Rezolvare:** Unit tests vor fi create pe măsură ce se implementează business logic (Etapele 1+). Pentru Etapa 0 (infrastructură), E2E tests sunt suficiente. Documentează decizia.

**Notă (impact mediu):** Nu rula suite de teste pe producție; folosește CI și staging.

---

### T2. Zero integration tests

**Director:** `tests/integration/`  
**Problema:** Directorul e GOL.

**Rezolvare:** La fel ca T1 — integration tests apar cu cod de aplicație. Etapa 0 testează infrastructura prin E2E.

**Notă (impact mediu):** Integrarea va fi testată pe staging, nu pe producție, pentru a nu afecta celelalte proiecte.

---

### T3. Rezultate test stale (doar 2/7 fișiere)

**Fișier:** `test-results/vitest-results.json`  
**Problema:** Conține rezultate doar din 2 fișiere de test (131 assertions). Celelalte 5 fișiere au fost adăugate ulterior.

**Rezolvare:**

```bash
pnpm test:ci
# Regenerează test-results/vitest-results.json cu toate cele 7 fișiere
```

**Notă (impact mediu):** Rulează local sau în CI; nu executa pe serverul de producție.

---

### T4. Coverage niciodată generată local

**Director:** `./coverage/` — nu există  
**Problema:** `pnpm test:coverage` nu a fost rulat niciodată local.

**Rezolvare:**

```bash
pnpm test:coverage
# Generează ./coverage/ cu raport HTML și JSON
```

**Notă (impact mediu):** Rulează local/CI; nu pe staging în timpul traficului altor proiecte.

---

### T5. Package-uri workspace fără package.json

**Directoare:** `apps/api/`, `apps/web/`, `packages/db/`, etc.  
**Problema:** Niciun sub-package din monorepo nu are propriul `package.json`. pnpm workspace globs (`apps/*`, `packages/*`, `workers/*`) nu rezolvă nimic.

**Rezolvare:** Fiecare package trebuie să aibă cel puțin:

```json
{
  "name": "@cerniq/api",
  "version": "0.0.1",
  "private": true
}
```

Aceasta e o sarcină pentru Sprint 5-6 (F0.6 Monorepo Setup, F0.9 API Boilerplate).

**Notă (impact mediu):** Modificare strict în repo; nu afectează aplicațiile coexistente.

---

### T6. CI folosește test:coverage dar test:ci e mai potrivit

**Fișier:** `.github/workflows/ci-pr.yml`  
**Problema:** CI rulează `pnpm test:coverage` dar `test:ci` generează și JSON output structured. Ar trebui combinat.

**Rezolvare:**

```json
{
  "test:ci": "vitest run --coverage --reporter=json --reporter=verbose --outputFile=test-results/results.json"
}
```

Și în CI:

```yaml
- run: pnpm test:ci
```

**Notă (impact mediu):** Asigură că runner-ul are suficiente resurse; evită rulări concurente cu build-uri heavy pentru GeniusSuite/Neanelu pe aceeași mașină.

---

## 7. SECURITATE — Staging & General

### S1. Docker metrics pe 0.0.0.0:64094

**Fișier:** `/etc/docker/daemon.json`  
**Server:** Staging  
**Problema:** `metrics-addr: "0.0.0.0:64094"` expune metrici Docker pe toate interfețele. Docker bypass-ează UFW via iptables.

**Rezolvare:**

```json
{
  "metrics-addr": "127.0.0.1:64094"
}
```

**Fișiere de actualizat:**

- `infra/config/docker/daemon.json` (dacă există în repo)
- Server: `/etc/docker/daemon.json` + `systemctl restart docker`

**Notă (impact mediu):** Restart-ul Docker afectează **toate** proiectele de pe staging (Neanelu, GeniusSuite, TLC4Pipes). Programează fereastră de mentenanță și anunță echipele.

---

### S2. Fișiere secrete cu permisiuni 0644 (world-readable)

**Server:** Staging (`/opt/cerniq/secrets/`)  
**Problema:** `postgres_password.txt`, `api_role_id`, etc. sunt readable de oricine (0644).

**Rezolvare:**

```bash
chmod 600 /opt/cerniq/secrets/*.txt
chmod 600 /opt/cerniq/secrets/*_id
chown root:root /opt/cerniq/secrets/*
```

**Notă (impact mediu):** Aplică doar în `/opt/cerniq/secrets/`, nu atinge secretele altor proiecte.

**Fișiere de actualizat:**

- `.github/workflows/deploy.yml` — adaugă `chmod 600` pe secrets după sync

---

### S3. UFW permite ports 5000-5002 nefolosite pe staging

**Server:** Staging  
**Problema:** Reguli UFW pentru porturi care nu aparțin Cerniq.

**Rezolvare:**

```bash
ufw delete allow 5000:5002/tcp
```

**Notă (impact mediu):** Verifică înainte că niciun proiect local nu folosește 5000-5002 (ex. Neanelu/GeniusSuite). Dacă există dependențe, păstrează regulile și documentează.

---

### S4. PgBouncer: tag `latest` (trebuie pinned)

**Fișier:** `infra/docker/docker-compose.yml`  
**Problema:** `image: edoburu/pgbouncer:latest` — nu e reproducibil.

**Rezolvare:**

```yaml
image: edoburu/pgbouncer:1.25.1
```

**Notă (impact mediu):** Schimbarea imaginii se aplică doar la recreate; evită restarturi neplanificate pe servere comune.

---

### S5. staging-proxy fără healthcheck

**Fișier:** `infra/docker/docker-compose.yml`  
**Problema:** Containerul `cerniq-staging-proxy` (nginx) nu are healthcheck definit.

**Rezolvare:**

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:80/"]
  interval: 30s
  timeout: 5s
  retries: 3
```

**Notă (impact mediu):** Healthcheck-ul afectează doar containerul Cerniq; nu modifica proiectele coexistente.

---

### S6. Root token OpenBao păstrat pe disc

**Fișier:** `secrets/openbao_root_token.txt`  
**Problema:** Root token-ul ar trebui revocat după setup inițial; AppRole se folosește exclusiv.

**Rezolvare:** După ce toate serviciile funcționează corect cu AppRole:

```bash
bao token revoke $(cat secrets/openbao_root_token.txt)
rm secrets/openbao_root_token.txt
```

⚠️ **Atenție:** Acest lucru trebuie făcut DOAR după ce s-a confirmat că AppRole auth funcționează corect și backup-uri OpenBao sunt operaționale (altfel pierzi acces permanent).

**Notă (impact mediu):** Rulează doar după ce atât staging cât și producția sunt stabile; altfel riști să blochezi recuperarea secretelor pe servere partajate.

---

### S7. Toate 5 unseal keys în același fișier pe același server

**Fișier:** `secrets/openbao_unseal_keys.txt`  
**Problema:** Shamir secret sharing presupune distribuirea cheilor la persoane/locații diferite. Toate 5 pe același server anulează beneficiul.

**Rezolvare (pe termen lung):**

- Cheia 1: pe staging server
- Cheia 2: pe producție server
- Cheia 3: în password manager (1Password/Bitwarden)
- Cheia 4: la team lead (offline)
- Cheia 5: backup encrypted pe Hetzner Storage Box

**Rezolvare (pe termen scurt — acceptabilă pentru Etapa 0):** Documentează riscul și planul de distribuire.

**Notă (impact mediu):** Distribuția cheilor trebuie coordonată între echipele care administrează și celelalte proiecte de pe server.

---

### S8. workers-env.tpl semnalizează `pkill -HUP python` dar workers sunt Node.js

**Fișier:** `infra/config/openbao/agent-workers.hcl`, linia ~63  
**Problema:** Template reload command trimite SIGHUP la Python, dar workers sunt Node.js/BullMQ.

**Rezolvare:**

```hcl
# SCHIMBĂ: command = "pkill -HUP python || true"
# CU:      command = "pkill -HUP node || true"
```

**Notă (impact mediu):** Modificare doar în repo; nu afectează alte proiecte. Aplică la următorul deploy planificat.

---

## 8. ORDINE IMPLEMENTARE

### Faza 1: CRITICE PRODUCȚIE (imediat)

**Toate acțiunile din Faza 1 se execută exclusiv prin CI/CD la push în `main`.**

| Pas | Problemă | Acțiune                                                               |
| --- | -------- | --------------------------------------------------------------------- |
| 1.1 | C1       | Activare UFW pe producție (CI/CD)                                     |
| 1.2 | C3       | Fix postgresql.production.conf port 5432→64032 (CI/CD)                |
| 1.3 | C4+C6    | Recreare containere producție cu `-f docker-compose.prod.yml` (CI/CD) |
| 1.4 | C2       | Configurare OpenBao engines+policies pe producție (CI/CD)             |
| 1.5 | C5       | Instalare cron backup-uri pe producție (CI/CD)                        |

### Faza 2: CRITICE STAGING (după producție)

| Pas | Problemă | Acțiune                                               |
| --- | -------- | ----------------------------------------------------- |
| 2.1 | C8       | Copiere config traefik la /opt/cerniq/config/traefik/ |
| 2.2 | C9       | Resync OpenBao templates (port pgbouncer)             |
| 2.3 | C7       | Recreare toate containerele din /opt/cerniq           |

### Faza 3: REPO FIXES (după servere stabile)

| Pas | Problemă | Acțiune                                   |
| --- | -------- | ----------------------------------------- |
| 3.1 | C10      | Trivy exit-code 0→1 în deploy.yml (CI/CD) |
| 3.2 | C12      | validate-postgres.sh DB_USER fix (CI/CD)  |
| 3.3 | C11      | Eliminare password din .env (CI/CD)       |
| 3.4 | S4       | Pin PgBouncer version (CI/CD)             |
| 3.5 | S5       | Healthcheck staging-proxy (CI/CD)         |
| 3.6 | S8       | Fix pkill python→node (CI/CD)             |
| 3.7 | D6       | Fix openbao.hcl typo port (CI/CD)         |

### Faza 4: CI/CD IMPROVEMENTS

| Pas | Problemă | Acțiune                                          |
| --- | -------- | ------------------------------------------------ |
| 4.1 | CI1      | Extinde security scans la PRs main (CI/CD)       |
| 4.2 | CI2      | Decomentare exit 1 smoke tests producție (CI/CD) |
| 4.3 | CI7      | Upload test artifacts (CI/CD)                    |
| 4.4 | CI4      | Prettier check (CI/CD)                           |
| 4.5 | CI5      | ShellCheck (CI/CD)                               |
| 4.6 | CI6      | dependabot.yml (CI/CD)                           |
| 4.7 | T6       | Combinare test:ci cu coverage (CI/CD)            |

### Faza 5: DOCUMENTAȚIE

| Pas | Problemă | Acțiune                              |
| --- | -------- | ------------------------------------ |
| 5.1 | D1       | ADR-0015 subnete                     |
| 5.2 | D2       | ADR-0022 port PgBouncer              |
| 5.3 | D3       | ADR-0004 max_connections + io_method |
| 5.4 | D4       | Port matrix                          |
| 5.5 | D5       | Versiune Traefik                     |

### Faza 6: SECURITATE (low-urgency)

| Pas | Problemă | Acțiune                         |
| --- | -------- | ------------------------------- |
| 6.1 | S1       | daemon.json metrics binding     |
| 6.2 | S2       | Permisiuni secrete 600          |
| 6.3 | S3       | UFW ports 5000-5002             |
| 6.4 | S6       | Plan revocare root token        |
| 6.5 | S7       | Plan distribuire unseal keys    |
| 6.6 | C13      | Documentare password init vault |

---

**TOTAL:** 13 probleme critice, 7 documentații stale, 7 gapuri CI/CD, 6 gapuri teste, 8 probleme securitate  
**ESTIMARE:** ~2-3 zile implementare completă (Faza 1 urgentă = câteva ore)
