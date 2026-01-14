# CERNIQ.APP — ETAPA 0: DOCKER SECRETS MANAGEMENT

## Ghid Complet pentru Gestionarea Secretelor

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. PRINCIPII FUNDAMENTALE

## REGULI CRITICE

1. **NICIODATĂ** variabile de environment pentru secrete în producție
2. **ÎNTOTDEAUNA** Docker secrets cu pattern `_FILE` suffix
3. **PERMISIUNI** 600 pe toate fișierele secret
4. **ROTAȚIE** trimestrială pentru API keys
5. **BACKUP** secretele separat de cod (encrypted)

---

## 2. CREARE SECRETE

## 2.1 Generare Secrete Sigure

```bash
#!/bin/bash
# Location: /var/www/CerniqAPP/infra/scripts/generate-secrets.sh

SECRETS_DIR="/var/www/CerniqAPP/secrets"
mkdir -p $SECRETS_DIR
chmod 700 $SECRETS_DIR

# PostgreSQL password (32 chars alphanumeric)
openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32 > $SECRETS_DIR/postgres_password
chmod 600 $SECRETS_DIR/postgres_password

# JWT secret (64 chars)
openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64 > $SECRETS_DIR/jwt_secret
chmod 600 $SECRETS_DIR/jwt_secret

# Cookie secret (32 chars)
openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32 > $SECRETS_DIR/cookie_secret
chmod 600 $SECRETS_DIR/cookie_secret

# Redis password (optional)
openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32 > $SECRETS_DIR/redis_password
chmod 600 $SECRETS_DIR/redis_password

echo "Secrets generated in $SECRETS_DIR"
ls -la $SECRETS_DIR
```

## 2.2 Structura Directorului Secrets

```text
/var/www/CerniqAPP/secrets/
├── postgres_password      # PostgreSQL auth
├── jwt_secret            # JWT signing key
├── cookie_secret         # Cookie encryption
├── redis_password        # Redis AUTH (optional)
├── anaf_client_secret    # ANAF OAuth
├── termene_api_key       # Termene.ro
├── hunter_api_key        # Hunter.io
├── timelines_api_key     # TimelinesAI
├── instantly_api_key     # Instantly.ai
├── xai_api_key           # xAI Grok
├── openai_api_key        # OpenAI embeddings
└── borg_passphrase       # BorgBackup encryption
```

---

## 3. CONFIGURARE DOCKER COMPOSE

## 3.1 Definire Secrets

```yaml
# docker-compose.yml
secrets:
  postgres_password:
    file: ../secrets/postgres_password
  jwt_secret:
    file: ../secrets/jwt_secret
  cookie_secret:
    file: ../secrets/cookie_secret
  redis_password:
    file: ../secrets/redis_password
  anaf_client_secret:
    file: ../secrets/anaf_client_secret
  termene_api_key:
    file: ../secrets/termene_api_key
  hunter_api_key:
    file: ../secrets/hunter_api_key
  xai_api_key:
    file: ../secrets/xai_api_key
  openai_api_key:
    file: ../secrets/openai_api_key
```

## 3.2 Utilizare în Services

```yaml
services:
  postgres:
    image: postgis/postgis:18-3.5
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password

  api:
    image: cerniq/api:latest
    environment:
      DATABASE_PASSWORD_FILE: /run/secrets/postgres_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      COOKIE_SECRET_FILE: /run/secrets/cookie_secret
    secrets:
      - postgres_password
      - jwt_secret
      - cookie_secret
      - xai_api_key
      - openai_api_key
```

---

## 4. CITIRE SECRETE ÎN APLICAȚIE

## 4.1 Node.js/TypeScript Helper

```typescript
// packages/shared-utils/src/secrets.ts
import { readFileSync, existsSync } from 'fs';

export function getSecret(name: string): string {
  // Try _FILE suffix first (Docker secrets)
  const fileEnvVar = `${name}_FILE`;
  const filePath = process.env[fileEnvVar];
  
  if (filePath && existsSync(filePath)) {
    return readFileSync(filePath, 'utf8').trim();
  }
  
  // Fallback to direct env var (development only)
  const directValue = process.env[name];
  if (directValue) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`WARNING: Using direct env var for ${name} in production!`);
    }
    return directValue;
  }
  
  throw new Error(`Secret ${name} not found. Set ${fileEnvVar} or ${name}`);
}

// Usage
const dbPassword = getSecret('DATABASE_PASSWORD');
const jwtSecret = getSecret('JWT_SECRET');
```

## 4.2 Python Helper

```python
# workers/shared/secrets.py
import os
from pathlib import Path

def get_secret(name: str) -> str:
    """Get secret from file or environment variable."""
    # Try _FILE suffix first
    file_env = f"{name}_FILE"
    file_path = os.environ.get(file_env)
    
    if file_path and Path(file_path).exists():
        return Path(file_path).read_text().strip()
    
    # Fallback to direct env var
    direct_value = os.environ.get(name)
    if direct_value:
        if os.environ.get('NODE_ENV') == 'production':
            print(f"WARNING: Using direct env var for {name} in production!")
        return direct_value
    
    raise ValueError(f"Secret {name} not found. Set {file_env} or {name}")

# Usage
db_password = get_secret('DATABASE_PASSWORD')
```

---

## 5. ROTAȚIE SECRETE

## 5.1 Procedură Rotație PostgreSQL Password

```bash
#!/bin/bash
# Rotate PostgreSQL password with zero downtime

# 1. Generate new password
NEW_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# 2. Update in PostgreSQL
docker exec cerniq-postgres psql -U postgres -c \
  "ALTER USER cerniq WITH PASSWORD '$NEW_PASS';"

# 3. Update secret file
echo -n "$NEW_PASS" > /var/www/CerniqAPP/secrets/postgres_password
chmod 600 /var/www/CerniqAPP/secrets/postgres_password

# 4. Restart API to pick up new secret
docker compose restart api

# 5. Verify connectivity
sleep 10
curl http://localhost:64000/health/ready
```

## 5.2 Schedule Rotație

| Secret | Frecvență | Procedură |
| ------ | --------- | --------- |
| postgres_password | Trimestrial | Script + restart |
| jwt_secret | Trimestrial | Script + restart |
| API keys externe | La cerere provider | Update file + restart |
| borg_passphrase | NICIODATĂ (pierdere backup) | - |

---

## 6. BACKUP SECRETE

## 6.1 Export Encrypted

```bash
#!/bin/bash
# Backup secrets encrypted with GPG

SECRETS_DIR="/var/www/CerniqAPP/secrets"
BACKUP_DIR="/var/backups/secrets"
GPG_RECIPIENT="admin@cerniq.app"

mkdir -p $BACKUP_DIR

# Create tarball and encrypt
tar czf - -C $SECRETS_DIR . | \
  gpg --encrypt --recipient $GPG_RECIPIENT \
  > $BACKUP_DIR/secrets-$(date +%Y%m%d).tar.gz.gpg

# Upload to secure location (NOT same as code backups)
# scp $BACKUP_DIR/secrets-*.gpg secure-backup-server:/secrets/
```

## 6.2 Restore from Backup

```bash
#!/bin/bash
# Restore secrets from encrypted backup

BACKUP_FILE=$1
SECRETS_DIR="/var/www/CerniqAPP/secrets"

# Decrypt and extract
gpg --decrypt $BACKUP_FILE | tar xzf - -C $SECRETS_DIR

# Fix permissions
chmod 700 $SECRETS_DIR
chmod 600 $SECRETS_DIR/*
```

---

## 7. VERIFICARE SECURITATE

```bash
#!/bin/bash
# Security audit for secrets

echo "=== SECRETS SECURITY AUDIT ==="

SECRETS_DIR="/var/www/CerniqAPP/secrets"

# Check directory permissions
echo "Directory permissions:"
ls -la $SECRETS_DIR | head -1
# Should be: drwx------ (700)

# Check file permissions
echo ""
echo "File permissions:"
for f in $SECRETS_DIR/*; do
  PERMS=$(stat -c %a $f)
  if [ "$PERMS" != "600" ]; then
    echo "WARNING: $f has permissions $PERMS (should be 600)"
  else
    echo "OK: $f"
  fi
done

# Check not in git
echo ""
echo "Git status:"
cd /var/www/CerniqAPP
if git status --porcelain secrets/ 2>/dev/null | grep -q .; then
  echo "WARNING: Secrets may be tracked by git!"
else
  echo "OK: Secrets not in git"
fi

# Check .gitignore
if grep -q "secrets/" .gitignore; then
  echo "OK: secrets/ in .gitignore"
else
  echo "WARNING: Add 'secrets/' to .gitignore!"
fi
```

---

**Document generat:** 15 Ianuarie 2026
