# ADR-0107: CI/CD Pipeline Strategy

| Metadata      | Value                                           |
|---------------|-------------------------------------------------|
| **Status**    | Accepted                                        |
| **Date**      | 2026-02-01                                      |
| **Deciders**  | Engineering Team                                |
| **Category**  | Infrastructure                                  |
| **Tags**      | ci-cd, github-actions, automation, devops       |

---

## Context

Cerniq.app necesită un pipeline de CI/CD pentru a automatiza testarea, validarea și deployment-ul codului. Până acum, deployment-ul a fost 100% manual prin SSH, ceea ce prezintă riscuri:

1. **Erori umane** - deployment manual poate omite pași critici
2. **Lipsa validării** - codul poate ajunge în producție fără teste
3. **Inconsistență** - diferite configurări între deployments
4. **Lipsa auditului** - nu există log-uri de deployment
5. **Time-to-deploy** - procesul manual durează 30-60 minute

### Cerințe

- CI să ruleze automat la fiecare PR și push
- CD să suporte atât staging cât și production
- Security scanning pentru vulnerabilități
- Zero-downtime deployments în producție
- Notificări pentru succese/eșecuri

---

## Decision

Implementăm CI/CD folosind **GitHub Actions** cu două workflow-uri separate:

### 1. CI Pipeline (`ci-pr.yml`)

**Trigger:** Push pe `main`/`develop`, Pull Requests

**Jobs:**
1. **Lint & Type Check** - ESLint 9, TypeScript
2. **Unit Tests** - Vitest cu PostgreSQL + Redis services
3. **Security Scan** - Trivy filesystem scan
4. **Docker Build** - Verificare build (fără push)
5. **Python Lint** - Ruff + mypy pentru workers (condiționat)

### 2. CD Pipeline (`deploy.yml`)

**Trigger:** Git tag `v*.*.*`, Manual workflow dispatch

**Jobs:**
1. **Build & Push** - Docker images to GHCR
2. **Security Scan** - Trivy image scan
3. **Deploy Staging** - Pentru pre-release tags
4. **Deploy Production** - Pentru release tags
5. **Verification** - Smoke tests post-deploy

### Strategia de Deployment

| Tag Format | Target Environment |
|------------|-------------------|
| `v1.0.0-rc.1` | Staging |
| `v1.0.0-beta.1` | Staging |
| `v1.0.0` | Production |

---

## Alternatives Considered

### A1: GitLab CI

| Pro | Contra |
|-----|--------|
| Built-in container registry | Necesită migrare de la GitHub |
| Good self-hosted support | Complexitate adăugată |

**Decizie:** Respins - suntem deja pe GitHub.

### A2: Jenkins

| Pro | Contra |
|-----|--------|
| Foarte customizabil | Necesită hosting separat |
| Multă documentație | Maintenance overhead |

**Decizie:** Respins - overhead prea mare pentru stadiul actual.

### A3: ArgoCD / GitOps

| Pro | Contra |
|-----|--------|
| Declarative deployments | Necesită Kubernetes |
| Automatic sync | Complexitate prematură |

**Decizie:** Respins - vom reconsidera în Etapa 3+ când adoptăm K8s.

### A4: GitHub Actions (Ales)

| Pro | Contra |
|-----|--------|
| Integrat cu repo-ul | Vendor lock-in GitHub |
| Free pentru public repos | Costuri pentru private repos |
| Marketplace cu actions | YAML verbose |
| Secrets management | - |

**Decizie:** Acceptat - cel mai bun raport efort/valoare.

---

## Consequences

### Positive

1. **Automatizare** - Fiecare PR este validat automat
2. **Consistență** - Același proces pentru toți developerii
3. **Security** - Vulnerabilități detectate înainte de merge
4. **Traceability** - Logs pentru fiecare deployment
5. **Speed** - Deploy în <5 minute după tag

### Negative

1. **GitHub Lock-in** - Dependență de GitHub Actions
2. **Learning Curve** - Echipa trebuie să învețe YAML workflows
3. **Secrets Management** - Necesită configurare inițială

### Risks

| Risk | Mitigation |
|------|-----------|
| Workflow files compromised | Branch protection, CODEOWNERS |
| Secrets leaked | GitHub encrypted secrets, minimal scope |
| CI costs explode | Concurrency limits, cache optimization |

---

## Implementation

### Phase 1 (Etapa 0) - COMPLETED ✅

- [x] Create `.github/workflows/ci-pr.yml`
- [x] Create `.github/workflows/deploy.yml`
- [x] Update `docs/infrastructure/ci-cd-pipeline.md`
- [x] Create this ADR

### Phase 2 (Etapa 0) - TODO

- [ ] Configure GitHub Secrets (SSH keys, etc.)
- [ ] Configure Branch Protection Rules
- [ ] Configure GitHub Environments (staging, production)
- [ ] First successful deployment via pipeline

### Phase 3 (Etapa 1)

- [ ] Add E2E tests to CI pipeline
- [ ] Add Slack notifications
- [ ] Add deployment metrics/dashboards
- [ ] Implement canary deployments

---

## Related Documents

- [CI/CD Pipeline Documentation](../../infrastructure/ci-cd-pipeline.md)
- [Deployment Guide](../../infrastructure/deployment-guide.md)
- [Technical Debt Board](../../architecture/technical-debt-board.md) - TD-I01
- [Security Policy](../../governance/security-policy.md)

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-02-01 | Engineering | Initial ADR - workflows implemented |
