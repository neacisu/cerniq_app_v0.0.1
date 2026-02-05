# Pre-Release Security Checklist

## Overview

This checklist must be completed before any production release of Cerniq. All items must pass before deployment is authorized.

**Document Version:** 1.0  
**Last Updated:** 2026-02-05  
**References:**
- ADR-0033 OpenBao Secrets Management
- security-policy.md
- backup-strategy.md

---

## Release Information

| Field | Value |
|-------|-------|
| Release Version | __________________ |
| Release Date | __________________ |
| Checklist Completed By | __________________ |
| Reviewed By | __________________ |
| Approved By | __________________ |

---

## 1. Code Security

### 1.1 Static Analysis
- [ ] **SAST scan passed** - No HIGH/CRITICAL findings
  - Tool: ESLint security plugin / Semgrep
  - Command: `pnpm lint`

- [ ] **Secret scanning passed** - No secrets in codebase
  - Tool: Trivy / git-secrets
  - Command: `./infra/scripts/trivy-scan.sh --filesystem`

- [ ] **Dependency audit passed** - No known vulnerabilities
  - Command: `pnpm audit --audit-level=high`

### 1.2 Code Review
- [ ] **PR reviewed by 2+ developers**
- [ ] **Security-sensitive changes reviewed by security lead**
- [ ] **No hardcoded credentials or API keys**
- [ ] **No debug/test credentials in production config**

---

## 2. Container Security

### 2.1 Image Scanning
- [ ] **All images scanned with Trivy**
  - Command: `./infra/scripts/trivy-scan.sh --ci`

- [ ] **No CRITICAL vulnerabilities**
- [ ] **HIGH vulnerabilities assessed and accepted/mitigated**

### 2.2 Container Hardening
- [ ] **All containers run as non-root** (where possible)
- [ ] **`no-new-privileges` set on all containers**
- [ ] **Capabilities dropped** (ALL dropped, minimal added)
- [ ] **Read-only filesystem** where applicable
- [ ] **Resource limits defined** (memory, CPU)

### 2.3 Image Provenance
- [ ] **Images from trusted registries only**
  - Allowed: ghcr.io/cerniq/, quay.io/, docker.io official
- [ ] **Image digests pinned** (not just tags)
- [ ] **No `latest` tags in production**

---

## 3. Secrets Management

### 3.1 OpenBao Configuration
- [ ] **OpenBao initialized and unsealed**
- [ ] **Unseal keys securely distributed** (5 shares, 3 threshold)
- [ ] **Root token secured** (not stored in git/env)
- [ ] **AppRole authentication configured**
- [ ] **Policies follow least privilege**

### 3.2 Secret Rotation
- [ ] **Database credentials rotated** (if not dynamic)
- [ ] **JWT signing key rotated** (quarterly)
- [ ] **External API keys validated**
- [ ] **AppRole secret_ids rotated** (monthly)

### 3.3 Encryption
- [ ] **TLS enabled for all external endpoints**
- [ ] **PII encryption enabled** (Transit engine)
- [ ] **Database connections encrypted**

---

## 4. Network Security

### 4.1 Firewall Configuration
- [ ] **UFW enabled and configured**
  - Command: `sudo ufw status verbose`

- [ ] **SSH restricted to admin IPs only**
  - Allowed IPs documented: ________________

- [ ] **Only ports 80/443 publicly accessible**
- [ ] **Docker networks isolated** (backend, data, public)

### 4.2 Rate Limiting
- [ ] **Traefik rate limiting configured**
- [ ] **API rate limits per endpoint**
- [ ] **fail2ban enabled for SSH**

---

## 5. Infrastructure Security

### 5.1 Host Security
- [ ] **OS patched to latest security updates**
  - Command: `apt update && apt upgrade`

- [ ] **SSH key-only authentication** (no passwords)
- [ ] **Root login disabled**
- [ ] **Automatic security updates enabled** (unattended-upgrades)

### 5.2 Docker Security
- [ ] **Docker daemon secured**
- [ ] **Docker socket not exposed**
- [ ] **User namespaces enabled** (optional)

---

## 6. Monitoring & Logging

### 6.1 Observability
- [ ] **Health checks enabled** for all services
- [ ] **Metrics endpoint accessible** (internal only)
- [ ] **Alerts configured** for critical services

### 6.2 Audit Logging
- [ ] **OpenBao audit logging enabled**
- [ ] **Application logs capturing auth events**
- [ ] **Log retention configured** (30 days minimum)

### 6.3 Security Monitoring
- [ ] **Failed login alerts configured**
- [ ] **Unusual traffic patterns monitored**
- [ ] **Container restart alerts**

---

## 7. Backup & Recovery

### 7.1 Backup Configuration
- [ ] **Database backup configured** (daily)
- [ ] **OpenBao backup configured** (daily)
- [ ] **Backups encrypted** (GPG)
- [ ] **Backups offsite** (Hetzner Storage Box)

### 7.2 Recovery Testing
- [ ] **Database restore tested** (last 30 days)
- [ ] **OpenBao restore tested** (last 30 days)
- [ ] **Recovery runbooks updated**

---

## 8. Compliance & Documentation

### 8.1 Documentation
- [ ] **Architecture diagrams current**
- [ ] **Runbooks updated**
- [ ] **API documentation current**
- [ ] **Changelog updated**

### 8.2 Access Control
- [ ] **User access list reviewed**
- [ ] **Service account permissions audited**
- [ ] **Unused accounts disabled**

---

## 9. Pre-Deployment Verification

### 9.1 Staging Validation
- [ ] **Deployed to staging environment**
- [ ] **E2E tests passed**
- [ ] **Performance tests passed**
- [ ] **Security tests passed**

### 9.2 Rollback Plan
- [ ] **Rollback procedure documented**
- [ ] **Previous version available**
- [ ] **Database migration reversible** (if applicable)

---

## Sign-Off

### Developer
- **Name:** ___________________
- **Date:** ___________________
- **Signature:** ___________________

### Security Review (if applicable)
- **Name:** ___________________
- **Date:** ___________________
- **Signature:** ___________________

### Release Manager
- **Name:** ___________________
- **Date:** ___________________
- **Signature:** ___________________

---

## Notes

_Add any additional notes, exceptions, or risk acceptances here:_

```
[NOTES]


```

---

## Checklist Commands Summary

```bash
# 1. Run all linting
pnpm lint

# 2. Run dependency audit
pnpm audit --audit-level=high

# 3. Run Trivy scans
./infra/scripts/trivy-scan.sh --all

# 4. Check firewall status
sudo ufw status verbose

# 5. Check fail2ban status
sudo fail2ban-client status

# 6. Verify OpenBao status
docker exec cerniq-openbao bao status

# 7. Test database backup restore
./infra/scripts/test-backup-restore.sh --dry-run

# 8. Run E2E tests
pnpm test:e2e

# 9. Deploy to staging
./infra/scripts/deploy-staging.sh

# 10. Verify staging health
curl -s https://staging.cerniq.app/api/health | jq .
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | System | Initial checklist |
