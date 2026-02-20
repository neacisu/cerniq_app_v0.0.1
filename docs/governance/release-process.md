# CERNIQ.APP — Release Process

## Governance Document

### Versiunea 1.0 | 18 Ianuarie 2026

---

## Release Workflow

### 1. Feature Branches

```text
main (protected)
  └── feature/CERNIQ-XXX-description
```

### 2. Pull Request Requirements

- [ ] Toate testele trec (CI/CD)
- [ ] Code review aprobat (1 reviewer minim)
- [ ] No merge conflicts
- [ ] Coverage nu scade sub prag
- [ ] Lint errors rezolvate

### 2.1 Release Approval Workflow

| Etapă            | Aprobare                        | Responsabil      | Criteriu                |
| ---------------- | ------------------------------- | ---------------- | ----------------------- |
| PR Review        | ✅ Mandatory                    | Engineering Lead | Code quality + tests    |
| Security Review  | ✅ Mandatory (medium/high risk) | Security Owner   | Threats/PII/permissions |
| Product Sign-off | ✅ Mandatory (feature releases) | Product Owner    | Scope & acceptance      |
| Release Gate     | ✅ Mandatory                    | Release Manager  | Checklist complet       |

**Release Checklist (minim):**

- [ ] PRs legate de release sunt merged
- [ ] CI/CD verde pe main
- [ ] Migrații DB validate (dry-run)
- [ ] Rollback plan documentat
- [ ] Anunț intern release + changelog

### 3. Release Types

| Type    | Branch           | Frequency    | Notes                |
| ------- | ---------------- | ------------ | -------------------- |
| Hotfix  | `hotfix/*`       | As needed    | Direct to production |
| Feature | `feature/*`      | Sprint-based | Via staging          |
| Release | `release/vX.Y.Z` | Bi-weekly    | Full testing cycle   |

### 4. Deployment Pipeline

```text
PR Merge → CI Tests → Build Docker → Deploy Staging → Smoke Tests → Deploy Production
```

### 5. Rollback Procedure

```bash
# 1. Identify last good version
docker images cerniq/api --format "{{.Tag}}" | head -5

# 2. Rollback
docker compose pull api:v1.2.3
docker compose up -d api

# 3. Verify
curl http://localhost:64000/health/ready
```

## Versioning

- **Semantic Versioning**: `MAJOR.MINOR.PATCH`
- **Git Tags**: `v1.2.3`
- **Docker Tags**: `cerniq/api:1.2.3` și `cerniq/api:latest`

## Security Milestones

| Milestone                   | Deadline        | Status        | Referință                                                              |
| --------------------------- | --------------- | ------------- | ---------------------------------------------------------------------- |
| **Primul Pentest Extern**   | Q1 2026         | 🟡 Planificat | [security-policy.md](./security-policy.md#penetration-testing-program) |
| **DPIA Aprobare DPO**       | Înainte go-live | 🟡 Draft      | [gdpr-dpia.md](./gdpr-dpia.md)                                         |
| **DPA Validation Complete** | Q1 2026         | 🟡 În progres | [dpa-register.md](./dpa-register.md)                                   |

> **Notă:** Nicio lansare în producție nu este permisă fără completarea milestone-urilor de securitate.

---

## Documentație Asociată

- [CI/CD Workflow](../../.github/workflows/) - GitHub Actions
- [Docker Compose](../../infra/docker/) - Deployment configuration
- [Security Policy](./security-policy.md) - Penetration Testing Program
- [GDPR DPIA](./gdpr-dpia.md) - Data Protection Impact Assessment

---

**Document tip:** Governance Process  
**Actualizat:** 01 Februarie 2026
