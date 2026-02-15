# CERNIQ.APP — Secrets Rotation Procedure

## Overview

**Versiune:** 2.0 (OpenBao)  
**Ultima actualizare:** 5 Februarie 2026  
**Referințe:** [ADR-0033](../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md), [OpenBao Setup Guide](./openbao-setup-guide.md)

> ⚠️ **Această procedură înlocuiește versiunea anterioară (Docker secrets manual)**  
> Versiunea anterioară bazată pe ADR-0017 este deprecată.

---

## Tipuri de Secrete și Rotație

### 1. Dynamic Secrets (Automată - Zero Intervenție)

| Secret | Engine | TTL | Rotație |
|--------|--------|-----|---------|
| PostgreSQL credentials (API) | database | 1h | Automată la expirare |
| PostgreSQL credentials (Workers) | database | 1h | Automată la expirare |
| PostgreSQL credentials (Readonly) | database | 4h | Automată la expirare |
| TLS Certificates (internal) | pki_int | 720h | Automată înainte de expirare |

**Flux:**
1. OpenBao Agent solicită credențiale noi înainte de expirarea TTL
2. OpenBao generează credențiale temporare în PostgreSQL
3. Credențialele vechi sunt revocate automat după TTL
4. **→ Zero downtime, zero intervenție manuală**

### 2. Static Secrets (Trimestrială - Semi-Automată)

| Secret | Path în OpenBao | Frecvență |
|--------|-----------------|-----------|
| Redis master password | `secret/cerniq/api/config.redis_password` | Trimestrial |
| JWT signing secret | `secret/cerniq/api/config.jwt_secret` | Trimestrial |
| ANAF OAuth credentials | `secret/cerniq/shared/external.anaf_*` | La reînnoire |
| Resend API key | `secret/cerniq/shared/external.resend_api_key` | La reînnoire |
| Hunter API key | `secret/cerniq/shared/external.hunter_api_key` | La reînnoire |
| Termene API key | `secret/cerniq/shared/external.termene_api_key` | La reînnoire |
| GHCR token | `secret/cerniq/ci/deploy.ghcr_token` | Anual |

### 3. Infrastructure Secrets (Anual sau la Incident)

| Secret | Locație | Frecvență |
|--------|---------|-----------|
| OpenBao unseal keys | Hetzner Storage Box (encrypted) | La inițializare + backup |
| OpenBao root token | Offline secure storage | Doar la DR |
| SSH keys (deploy) | `secret/cerniq/ci/deploy.ssh_key` | Anual |
| Traefik dashboard | htpasswd file | Anual |

---

## Proceduri Detaliate

### A. Rotație Static Secrets (Trimestrială)

**Când:** Prima zi din Q1, Q2, Q3, Q4 sau după incident de securitate

**Script automatizat:**

```bash
# Rulează pe mașina de production
cd /var/www/CerniqAPP
./infra/scripts/openbao-rotate-static-secrets.sh
```

**Pași detaliați (dacă scriptul nu este disponibil):**

```bash
# 1. Login în OpenBao
export BAO_ADDR="${OPENBAO_ADDR:-https://s3cr3ts.neanelu.ro}"
bao login -method=token

# 2. Generează noi secrete
NEW_REDIS_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 64)
NEW_JWT_SECRET=$(openssl rand -base64 64)

# 3. Citește secretele curente
CURRENT=$(bao kv get -format=json secret/cerniq/api/config)
PG_USER=$(echo "$CURRENT" | jq -r '.data.data.pg_user')
PG_PASS=$(echo "$CURRENT" | jq -r '.data.data.pg_password')

# 4. Actualizează în OpenBao (versioning automat)
bao kv put secret/cerniq/api/config \
    pg_user="$PG_USER" \
    pg_password="$PG_PASS" \
    redis_password="$NEW_REDIS_PASS" \
    jwt_secret="$NEW_JWT_SECRET"

# 5. Actualizează Redis shared (dacă rotim parola user-ului ACL `cerniq`)
# Redis ruleaza pe orchestrator ca serviciu shared; parola/ACL nu se schimba din CT-uri.
# Operare recomandata (orchestrator):
#   - update in `/opt/redis-shared/redis.conf` linia `user cerniq on >... ~cerniq:* ...`
#   - restart controlat: `docker restart redis-shared`

# 6. OpenBao Agents vor primi automat noile secrete
# Serviciile vor fi notificate via template change
```

**Validare:**

```bash
# Verifică versiunea secretului
bao kv metadata get secret/cerniq/api/config

# Verifică că serviciile au primit secretele noi
docker exec cerniq-api cat /secrets/api.env | grep -c REDIS

# Testează conexiunea Redis
docker exec cerniq-api node -e "
  const Redis = require('ioredis');
  const r = new Redis(process.env.REDIS_URL);
  r.ping().then(() => console.log('✅ Redis OK')).catch(console.error);
"
```

### B. Rotație AppRole Secret IDs (Lunară)

**Când:** Prima zi a fiecărei luni

```bash
# Rotește secret_id pentru API
NEW_API_SECRET=$(bao write -f -field=secret_id auth/approle/role/api/secret-id)
echo "$NEW_API_SECRET" > /opt/cerniq/secrets/api_secret_id
chmod 600 /opt/cerniq/secrets/api_secret_id

# Rotește secret_id pentru Workers
NEW_WORKERS_SECRET=$(bao write -f -field=secret_id auth/approle/role/workers/secret-id)
echo "$NEW_WORKERS_SECRET" > /opt/cerniq/secrets/workers_secret_id
chmod 600 /opt/cerniq/secrets/workers_secret_id

# OpenBao Agent va prelua automat noul secret_id la următoarea autentificare
```

### C. Rotație Provider API Keys (La Cerere)

**Când:** La primirea noilor credențiale de la provider

```bash
# Exemplu: actualizare Resend API key
bao kv patch secret/cerniq/shared/external resend_api_key="re_abc123_new"

# Exemplu: actualizare ANAF OAuth
bao kv patch secret/cerniq/shared/external \
    anaf_client_id="new_client_id" \
    anaf_client_secret="new_client_secret"
```

### D. Rotație Urgentă (După Incident)

**Când:** Suspiciune de compromitere

```bash
#!/bin/bash
# EMERGENCY ROTATION - Rulează imediat după incident

echo "🚨 EMERGENCY ROTATION INITIATED"

# 1. Revocă toate lease-urile active
bao lease revoke -prefix cerniq-db/creds/
bao lease revoke -prefix pki_int/issue/

# 2. Rotește TOATE secretele statice
./infra/scripts/openbao-rotate-static-secrets.sh --emergency

# 3. Regenerează toate secret_ids
for role in api workers cicd; do
    bao write -f auth/approle/role/$role/secret-id
done

# 4. Invalidează sesiunile active (JWT)
# Noua JWT_SECRET invalidează automat toate token-urile existente

# 5. Logheaza incidentul
echo "$(date): Emergency rotation completed" >> /var/log/cerniq/security-incidents.log

# 6. Notifică echipa
curl -X POST "$SLACK_WEBHOOK" -d '{"text":"🚨 Emergency secrets rotation completed"}'
```

---

## Calendar Rotație

| Frecvență | Secrete | Metoda | Automatizare |
|-----------|---------|--------|--------------|
| Continuă | Database credentials | Dynamic secrets | ✅ 100% automată |
| Continuă | TLS certificates | PKI auto-renewal | ✅ 100% automată |
| Lunar | AppRole secret_ids | Script | 🔄 Semi-automată |
| Trimestrial | Redis, JWT | Script | 🔄 Semi-automată |
| Anual | SSH keys, Traefik | Manual | ⚙️ Manuală |
| La incident | TOATE | Emergency script | 🚨 Urgentă |

---

## Monitorizare și Alerting

### Metrici Prometheus

```yaml
# Alert: Secret aproape de expirare
- alert: SecretLeaseExpiringSoon
  expr: vault_secret_lease_expiration_time < (time() + 3600)
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Secret lease expiring in < 1 hour"

# Alert: Rotație eșuată
- alert: SecretRotationFailed
  expr: increase(vault_secret_rotation_failures_total[1h]) > 0
  labels:
    severity: critical
```

### Audit Trail

Toate operațiile de rotație sunt logate în:
- `/openbao/data/audit.log` (OpenBao audit)
- `/var/log/cerniq/secrets-rotation.log` (script logs)

---

## Rollback

### Rollback Static Secret

```bash
# Listează versiunile disponibile
bao kv metadata get secret/cerniq/api/config

# Rollback la versiune anterioară
bao kv rollback -version=3 secret/cerniq/api/config
```

### Rollback Dynamic Database Credentials

Nu este necesar - credențialele vechi expiră automat, noile sunt generate instant.

---

## Referințe

- [ADR-0033: OpenBao Secrets Management](../adr/ADR%20Etapa%200/ADR-0033-OpenBao-Secrets-Management.md)
- [OpenBao Setup Guide](./openbao-setup-guide.md)
- [Backup Strategy](./backup-strategy.md)
- [Security Policy](../governance/security-policy.md)
- Plan implementare: F0.8.2.T002, F0.8.2.T003

---

**Document History:**
- v2.0 (5 Feb 2026): Rescris complet pentru OpenBao
- v1.0 (Jan 2026): Versiune inițială cu Docker secrets (deprecată)
