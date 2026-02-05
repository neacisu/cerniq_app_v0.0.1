# OpenBao Recovery Runbook

## Overview

This runbook covers disaster recovery procedures for OpenBao in the Cerniq infrastructure. Follow these procedures when OpenBao becomes unavailable or data is lost.

**Last Updated:** 2026-02-05  
**Version:** 1.0  
**References:**
- ADR-0033 OpenBao Secrets Management
- openbao-setup-guide.md
- backup-strategy.md

---

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Quick Reference](#quick-reference)
3. [Scenario: OpenBao Sealed](#scenario-openbao-sealed)
4. [Scenario: OpenBao Container Crashed](#scenario-openbao-container-crashed)
5. [Scenario: Data Corruption](#scenario-data-corruption)
6. [Scenario: Full Disaster Recovery](#scenario-full-disaster-recovery)
7. [Scenario: Lost Unseal Keys](#scenario-lost-unseal-keys)
8. [Post-Recovery Verification](#post-recovery-verification)

---

## Emergency Contacts

| Role | Contact | Phone |
|------|---------|-------|
| DevOps Lead | [TBD] | [TBD] |
| Security Team | [TBD] | [TBD] |
| Infrastructure | [TBD] | [TBD] |

---

## Quick Reference

### Key Locations

| Item | Location |
|------|----------|
| Unseal Keys | `/var/www/CerniqAPP/secrets/openbao_unseal_keys.txt` |
| Root Token | `/var/www/CerniqAPP/secrets/openbao_root_token.txt` |
| Backup Passphrase | `/var/www/CerniqAPP/secrets/openbao_backup_passphrase.txt` |
| Local Backups | `/var/backups/openbao/` |
| Remote Backups | Hetzner Storage Box: `./backups/cerniq/openbao/` |
| Config | `/var/www/CerniqAPP/infra/config/openbao/` |

### Important Commands

```bash
# Check OpenBao status
docker exec cerniq-openbao bao status

# Unseal OpenBao
docker exec cerniq-openbao bao operator unseal <KEY>

# Login with root token
export BAO_TOKEN=$(cat /var/www/CerniqAPP/secrets/openbao_root_token.txt)
docker exec -e BAO_TOKEN="$BAO_TOKEN" cerniq-openbao bao token lookup

# Create snapshot
docker exec -e BAO_TOKEN="$BAO_TOKEN" cerniq-openbao bao operator raft snapshot save /tmp/snapshot.snap

# Restore snapshot
docker exec -e BAO_TOKEN="$BAO_TOKEN" cerniq-openbao bao operator raft snapshot restore /tmp/snapshot.snap
```

---

## Scenario: OpenBao Sealed

**Symptoms:**
- Services unable to authenticate
- Error: "Vault is sealed"
- Health check failing

**RTO:** 5 minutes

### Resolution Steps

1. **Verify seal status:**
   ```bash
   docker exec cerniq-openbao bao status
   ```
   Look for `Sealed: true`

2. **Unseal with 3 of 5 keys:**
   ```bash
   # Read unseal keys
   cat /var/www/CerniqAPP/secrets/openbao_unseal_keys.txt
   
   # Apply 3 keys
   docker exec cerniq-openbao bao operator unseal <KEY_1>
   docker exec cerniq-openbao bao operator unseal <KEY_2>
   docker exec cerniq-openbao bao operator unseal <KEY_3>
   ```

3. **Verify unsealed:**
   ```bash
   docker exec cerniq-openbao bao status
   ```
   Confirm `Sealed: false`

4. **Verify services can connect:**
   ```bash
   docker logs cerniq-openbao-agent-api --tail 20
   ```

---

## Scenario: OpenBao Container Crashed

**Symptoms:**
- Container not running
- Health check timeout
- Docker restart loop

**RTO:** 15 minutes

### Resolution Steps

1. **Check container status:**
   ```bash
   docker ps -a | grep openbao
   docker logs cerniq-openbao --tail 100
   ```

2. **Check for resource issues:**
   ```bash
   docker stats --no-stream
   df -h  # Check disk space
   ```

3. **Restart container:**
   ```bash
   cd /var/www/CerniqAPP/infra/docker
   docker compose up -d openbao
   ```

4. **Wait for health check:**
   ```bash
   docker exec cerniq-openbao bao status
   ```

5. **Unseal if sealed (see above scenario)**

6. **Restart dependent agents:**
   ```bash
   docker compose restart openbao-agent-api openbao-agent-workers
   ```

---

## Scenario: Data Corruption

**Symptoms:**
- Secrets returning wrong values
- Inconsistent reads
- Raft log errors

**RTO:** 30 minutes

### Resolution Steps

1. **Stop OpenBao:**
   ```bash
   docker compose stop openbao openbao-agent-api openbao-agent-workers
   ```

2. **Backup corrupted data (for analysis):**
   ```bash
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   sudo tar -czf /var/backups/openbao-corrupted-${TIMESTAMP}.tar.gz \
     /var/lib/docker/volumes/cerniq_openbao_data/_data
   ```

3. **Find latest good backup:**
   ```bash
   # Local backups
   ls -la /var/backups/openbao/
   
   # Remote backups
   ssh -p 23 u502048@u502048.your-storagebox.de \
     "ls -la ./backups/cerniq/openbao/"
   ```

4. **Download backup (if remote):**
   ```bash
   scp -P 23 u502048@u502048.your-storagebox.de:./backups/cerniq/openbao/openbao-snapshot-TIMESTAMP.snap.gpg /tmp/
   ```

5. **Decrypt backup:**
   ```bash
   GPG_PASS=$(cat /var/www/CerniqAPP/secrets/openbao_backup_passphrase.txt)
   gpg --batch --passphrase "$GPG_PASS" -d /tmp/openbao-snapshot-TIMESTAMP.snap.gpg > /tmp/snapshot.snap
   ```

6. **Clear corrupted data:**
   ```bash
   sudo rm -rf /var/lib/docker/volumes/cerniq_openbao_data/_data/*
   ```

7. **Start OpenBao fresh:**
   ```bash
   docker compose up -d openbao
   ```

8. **Restore snapshot:**
   ```bash
   docker cp /tmp/snapshot.snap cerniq-openbao:/tmp/
   
   # Unseal first (with existing keys)
   docker exec cerniq-openbao bao operator unseal <KEY_1>
   docker exec cerniq-openbao bao operator unseal <KEY_2>
   docker exec cerniq-openbao bao operator unseal <KEY_3>
   
   # Login
   ROOT_TOKEN=$(cat /var/www/CerniqAPP/secrets/openbao_root_token.txt)
   
   # Restore
   docker exec -e BAO_TOKEN="$ROOT_TOKEN" cerniq-openbao \
     bao operator raft snapshot restore -force /tmp/snapshot.snap
   ```

9. **Restart agents:**
   ```bash
   docker compose up -d openbao-agent-api openbao-agent-workers
   ```

10. **Verify (see Post-Recovery Verification)**

---

## Scenario: Full Disaster Recovery

**When:** Complete loss of OpenBao node (new server or volume loss)

**RTO:** 1 hour

### Resolution Steps

1. **Deploy new infrastructure:**
   ```bash
   cd /var/www/CerniqAPP/infra/docker
   docker compose up -d openbao
   ```

2. **Download backup from Hetzner Storage Box:**
   ```bash
   # Find latest backup
   ssh -p 23 u502048@u502048.your-storagebox.de \
     "ls -la ./backups/cerniq/openbao/ | tail -5"
   
   # Download
   scp -P 23 u502048@u502048.your-storagebox.de:./backups/cerniq/openbao/openbao-snapshot-LATEST.snap.gpg /tmp/
   ```

3. **Retrieve unseal keys:**
   - Use GPG encrypted backup from Storage Box
   - OR contact key holders (distributed among team)
   
   ```bash
   # Download encrypted keys
   scp -P 23 u502048@u502048.your-storagebox.de:./backups/cerniq/openbao/openbao_keys_*.gpg /tmp/
   
   # Decrypt (need the original passphrase)
   gpg --batch --passphrase "PASSPHRASE" -d /tmp/openbao_keys_*.gpg > /tmp/unseal_keys.txt
   ```

4. **Decrypt backup snapshot:**
   ```bash
   gpg --batch --passphrase "PASSPHRASE" -d /tmp/openbao-snapshot-LATEST.snap.gpg > /tmp/snapshot.snap
   ```

5. **Initialize fresh (if needed):**
   ```bash
   # Check if initialized
   docker exec cerniq-openbao bao status
   
   # If NOT initialized, DO NOT re-initialize!
   # Restore from backup instead
   ```

6. **Unseal OpenBao:**
   ```bash
   docker exec cerniq-openbao bao operator unseal <KEY_1>
   docker exec cerniq-openbao bao operator unseal <KEY_2>
   docker exec cerniq-openbao bao operator unseal <KEY_3>
   ```

7. **Restore snapshot:**
   ```bash
   docker cp /tmp/snapshot.snap cerniq-openbao:/tmp/
   docker exec -e BAO_TOKEN="$ROOT_TOKEN" cerniq-openbao \
     bao operator raft snapshot restore -force /tmp/snapshot.snap
   ```

8. **Restore secrets files:**
   ```bash
   cat /tmp/unseal_keys.txt > /var/www/CerniqAPP/secrets/openbao_unseal_keys.txt
   chmod 600 /var/www/CerniqAPP/secrets/openbao_unseal_keys.txt
   ```

9. **Start dependent services:**
   ```bash
   docker compose up -d
   ```

10. **Verify (see Post-Recovery Verification)**

---

## Scenario: Lost Unseal Keys

**Severity:** CRITICAL - Data may be unrecoverable

**RTO:** Variable (depends on backup availability)

### Resolution Steps

1. **DO NOT PANIC** - Check all backup locations:
   
   - [ ] `/var/www/CerniqAPP/secrets/openbao_unseal_keys.txt`
   - [ ] Hetzner Storage Box: `./backups/cerniq/openbao/openbao_keys_*.gpg`
   - [ ] Distributed key holders (if applicable)
   - [ ] Password manager / secure vault

2. **If keys found in backup:**
   ```bash
   # Decrypt
   gpg --batch --passphrase "PASSPHRASE" -d openbao_keys_*.gpg > unseal_keys.txt
   
   # Proceed with unseal
   ```

3. **If keys truly lost:**
   
   ⚠️ **ALL SECRETS ARE UNRECOVERABLE**
   
   You must:
   1. Re-initialize OpenBao from scratch
   2. Regenerate ALL secrets
   3. Update ALL services with new credentials
   4. Rotate ALL external API keys
   
   ```bash
   # Clear old data
   docker compose stop openbao openbao-agent-api openbao-agent-workers
   docker volume rm cerniq_openbao_data
   
   # Re-initialize
   /var/www/CerniqAPP/infra/scripts/openbao-init.sh
   
   # Re-create secrets manually
   # Update external API keys in OpenBao
   # Restart all services
   ```

---

## Post-Recovery Verification

Always perform these checks after any recovery:

### 1. OpenBao Health

```bash
# Status check
docker exec cerniq-openbao bao status

# Expected output:
# - Sealed: false
# - HA Enabled: true (if cluster)
```

### 2. Secret Access Test

```bash
ROOT_TOKEN=$(cat /var/www/CerniqAPP/secrets/openbao_root_token.txt)

# KV secrets
docker exec -e BAO_TOKEN="$ROOT_TOKEN" cerniq-openbao \
  bao kv get secret/cerniq/api/config

# PKI health
docker exec -e BAO_TOKEN="$ROOT_TOKEN" cerniq-openbao \
  bao read pki/cert/ca

# Transit key
docker exec -e BAO_TOKEN="$ROOT_TOKEN" cerniq-openbao \
  bao read transit/keys/pii
```

### 3. AppRole Authentication

```bash
API_ROLE=$(cat /var/www/CerniqAPP/secrets/api_role_id)
API_SECRET=$(cat /var/www/CerniqAPP/secrets/api_secret_id)

docker exec cerniq-openbao bao write auth/approle/login \
  role_id="$API_ROLE" \
  secret_id="$API_SECRET"
```

### 4. Agent Connectivity

```bash
# Check agent logs
docker logs cerniq-openbao-agent-api --tail 20
docker logs cerniq-openbao-agent-workers --tail 20

# Verify secret files exist
docker exec cerniq-api ls -la /secrets/
docker exec cerniq-worker-ai ls -la /secrets/
```

### 5. Application Connectivity

```bash
# API health check
curl -s http://localhost:64100/health | jq .

# Check for vault errors in logs
docker logs cerniq-api --tail 50 | grep -i "vault\|secret\|openbao"
```

---

## Prevention Measures

1. **Daily backups** - Verify cron job is running:
   ```bash
   crontab -l | grep openbao-backup
   ```

2. **Monitor seal status** - Add to monitoring:
   ```bash
   # In monitoring script
   curl -s http://localhost:64090/v1/sys/seal-status | jq .sealed
   ```

3. **Key distribution** - Distribute unseal keys among 5 team members (3 required to unseal)

4. **Test recovery** - Quarterly disaster recovery drill

---

## Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-02-05 | 1.0 | System | Initial runbook |
