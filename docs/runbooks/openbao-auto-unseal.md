# OpenBao Auto-Unseal Runbook

| Field           | Value                                |
| --------------- | ------------------------------------ |
| Version         | 1.0.0                                |
| Last Updated    | 2026-03-22                           |
| OpenBao Version | 2.5.0                                |
| Config Path     | infra/config/openbao/openbao.hcl     |

---

## Problem Statement

Without auto-unseal, every OpenBao server restart requires manual intervention to unseal the vault using Shamir key shares. During this window:
- All 3 OpenBao agents (api, workers, infra) cannot renew tokens or fetch secrets
- All dependent services (API, workers, PgBouncer) fail to start or lose credentials
- Total downtime for 313+ workers until manual unsealing

---

## Solution: AES-GCM Auto-Unseal

The `aes-gcm` seal backend uses an AES-256 key from an environment variable to automatically unseal OpenBao on startup. No external service dependency.

### Prerequisites

1. Generate a 32-byte AES key:

```bash
openssl rand -base64 32
```

2. Store the key securely (NOT in the same volume as OpenBao data):

```bash
# On the orchestrator host
echo "YOUR_BASE64_KEY" > /etc/openbao/seal-key
chmod 600 /etc/openbao/seal-key
chown openbao:openbao /etc/openbao/seal-key
```

### Configuration

The `seal "aes-gcm"` stanza has been added to `infra/config/openbao/openbao.hcl`:

```hcl
seal "aes-gcm" {
  key = "env://OPENBAO_SEAL_KEY"
}
```

### Docker Compose Integration

Add the environment variable to the OpenBao server service:

```yaml
openbao-server:
  image: quay.io/openbao/openbao:2.5.0
  environment:
    OPENBAO_SEAL_KEY: "${OPENBAO_SEAL_KEY}"
  # ... rest of config
```

Set the key via `.env` file or Docker secrets:

```bash
# .env file (chmod 600)
OPENBAO_SEAL_KEY=<output of openssl rand -base64 32>
```

### Migration from Shamir to Auto-Unseal

If OpenBao was already initialized with Shamir sealing:

```bash
# 1. Unseal with existing Shamir keys first
bao operator unseal <KEY_1>
bao operator unseal <KEY_2>
bao operator unseal <KEY_3>

# 2. Perform seal migration
bao operator unseal -migrate

# 3. Verify auto-unseal is active
bao status
# Should show: Seal Type = aes-gcm
```

### Verification

After restart:

```bash
# Check seal status
bao status

# Expected output:
# Seal Type          aes-gcm
# Initialized        true
# Sealed             false  <-- auto-unsealed
```

---

## Alternative: Transit Auto-Unseal (Production HA)

For multi-datacenter or HA deployments, use a secondary OpenBao instance as the seal backend.

### Setup

1. Deploy secondary OpenBao with transit secret engine enabled:

```bash
bao secrets enable transit
bao write -f transit/keys/autounseal
```

2. Create a policy for the primary to use:

```hcl
path "transit/encrypt/autounseal" { capabilities = ["update"] }
path "transit/decrypt/autounseal" { capabilities = ["update"] }
```

3. Generate a token:

```bash
bao token create -policy=autounseal -orphan -period=24h
```

4. Configure primary OpenBao:

```hcl
seal "transit" {
  address    = "https://secondary-openbao:8200"
  token      = "s.TRANSIT_TOKEN"
  key_name   = "autounseal"
  mount_path = "transit/"
}
```

---

## Security Considerations

| Concern                  | Mitigation                                       |
| ------------------------ | ------------------------------------------------ |
| Seal key exposure        | Store in separate location from OpenBao data     |
| Key rotation             | Generate new key, perform seal migration          |
| Backup recovery          | Seal key must be available during restore         |
| Container escape         | Env vars visible in /proc; use Docker secrets     |

### Key Rotation Procedure

1. Generate new AES key: `openssl rand -base64 32`
2. Stop OpenBao gracefully: `bao operator step-down`
3. Update `OPENBAO_SEAL_KEY` environment variable
4. Restart OpenBao
5. Run `bao operator unseal -migrate` with old unseal keys
6. Verify: `bao status`

---

## Troubleshooting

| Symptom                    | Cause                              | Fix                          |
| -------------------------- | ---------------------------------- | ---------------------------- |
| Sealed after restart       | OPENBAO_SEAL_KEY not set           | Check env var availability   |
| "invalid seal configuration" | Key length incorrect            | Ensure 32-byte base64 key    |
| Agents failing healthcheck | OpenBao still sealed               | Check seal status, key       |
| "seal migration required"  | Changed seal type without migrate  | Run `bao operator unseal -migrate` |
