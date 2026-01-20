# Deployment Guide

Acest ghid descrie procedurile de deployment pentru Cerniq.app pe infrastructura bare-metal (Hetzner) utilizând Docker Swarm sau Docker Compose.

## 1. Arhitectura de Deployment

- **Provider**: Hetzner (Dedicated Server AX series)
- **OS**: Ubuntu 24.04 LTS
- **Runtime**: Docker Engine 29.1.3
- **Proxy**: Traefik v3.6.6 (SSL via Let's Encrypt)

## 2. Cerințe Preliminare

Asigurați-vă că serverul are:

- Minim 64GB RAM (Recomandat 128GB pentru Etapele 3-4 cu LLM local)
- NVMe Storage (PostgreSQL + Vector Search)
- Porturile 80, 443 deschise public.

## 3. Procedura Standard (Docker Compose)

Aceasta este metoda preferată pentru "1-Person-Team" deployment.

### 3.1 Pregătire

```bash
# 1. Clone repo (necesită SSH key)
git clone git@github.com:your-org/cerniq-app.git /var/www/cerniq
cd /var/www/cerniq

# 2. Configurare mediu
cp .env.example .env
# Editați .env cu secretele de producție (vezi docs/specifications/Etapa 0/etapa0-docker-secrets-guide.md)
chmod 600 .env
```

### 3.2 Build & Start

```bash
# Build la imagini (opțional, dacă nu se folosește registry)
docker compose -f infra/docker/docker-compose.yml build

# Pornire stack în background
docker compose -f infra/docker/docker-compose.yml up -d

# Verificare logs
docker compose -f infra/docker/docker-compose.yml logs -f --tail=100
```

### 3.3 Zero-Downtime Update (Simplificat)

```bash
git pull origin main
docker compose -f infra/docker/docker-compose.yml pull
docker compose -f infra/docker/docker-compose.yml up -d --remove-orphans
docker image prune -f
```

## 4. Backup Strategy (Referință)

Vezi [`etapa0-backup-restore-procedures.md`](../specifications/Etapa%200/etapa0-backup-restore-procedures.md) pentru detalii despre:

- pg_dump zilnic (rotary 7 zile)
- Redis snapshotting
- Configurare Rclone pentru offsite backup.
