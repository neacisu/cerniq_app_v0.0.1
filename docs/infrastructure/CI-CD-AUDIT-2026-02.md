# CI/CD Audit Report - 2026-02 (Infrastructura Noua)

> **Scope:** CI/CD pentru Cerniq.app pe arhitectura noua (Proxmox/LXC + orchestrator central).
> **Out of scope:** hardening bare-metal / alte proiecte de pe infrastructura shared.

## Executive Summary

- CI (PR) ruleaza in GitHub Actions si foloseste containere de servicii pentru izolare (PostgreSQL/Redis in workflow).
- CD (deploy) ruleaza pe runner self-hosted `CT108` si face deploy prin SSH pe:
  - `CT110` (staging)
  - `CT109` (production)
- Secretele sunt gestionate centralizat prin OpenBao pe orchestrator; pe CT-uri ruleaza doar OpenBao Agents (template rendering in runtime).
- Infrastructura noua elimina complet dependintele locale in Docker pentru: PostgreSQL server, OpenBao server, Traefik local.

## Arhitectura Tinta (relevanta pentru CI/CD)

- **Runner:** `CT108` (self-hosted GitHub Actions runner)
- **Targets:** `CT110` (staging) si `CT109` (production)
- **Ingress:** Traefik pe orchestrator (file provider `cerniq.yml`)
- **Secrets:** OpenBao pe orchestrator (acces prin HTTPS :443 via Traefik)
- **DB:** PostgreSQL extern pe `CT107 (10.0.1.107:5432)`
- **Redis:** shared pe orchestrator (fara expunere publica), acces intern controlat

## Fisiere auditate (repo)

- `.github/workflows/ci-pr.yml`
- `.github/workflows/deploy.yml`
- `docs/infrastructure/ci-cd-pipeline.md`
- `docs/adr/ADR Etapa 0/ADR-0032-CI-CD-Pipeline-Strategy.md`

## CI (ci-pr.yml) - Observatii

- Ruleaza lint/typecheck/tests/security pe PR.
- OpenBao este referentiat prin `OPENBAO_ADDR` (GitHub Secret) si AppRole (role_id/secret_id).
- Secretele CI pentru teste se citesc din KV v1: `secret/cerniq/ci/test`.

### Verificari recomandate

```bash
rg "OPENBAO_ADDR|approle" .github/workflows/ci-pr.yml
rg "secret/cerniq/ci/test" .github/workflows/ci-pr.yml
```

## CD (deploy.yml) - Observatii

- Runnerul self-hosted executa build/push si deploy via SSH pe CT109/CT110.
- In deploy, se sincronizeaza config-uri pentru:
  - OpenBao agent configs + templates
  - Vector
  - OTEL Collector
- Deploy-ul porneste agentii OpenBao si verifica template rendering (existenta `/secrets/api.env`).
- Smoke tests sunt aliniate la arhitectura noua (PG extern prin PgBouncer, fara `docker exec cerniq-postgres`).

### Gap-uri / Riscuri ramase (cunoscute in plan)

- Trivy scan in deploy este inca non-blocant (`continue-on-error: true`) in mai multe joburi.
- Validare E2E (ingress + smoke tests reale pe endpoints) ramane conditionata de faptul ca aplicatia sa fie deployata si accesibila.

### Verificari recomandate

```bash
rg "continue-on-error" .github/workflows/deploy.yml
rg "openbao-agent|vector|otel" .github/workflows/deploy.yml
```

## GitHub Secrets / Environments (fara valori)

- `OPENBAO_ADDR`
- `OPENBAO_CICD_ROLE_ID`
- `OPENBAO_CICD_SECRET_ID`
- `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`
- `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`
- optional: cheie SSH pentru SCP catre orchestrator (pentru sync `cerniq.yml`)

## Concluzie

Pipeline-ul este aliniat conceptual la infrastructura noua (runner dedicat, targets dedicate, OpenBao central, PG extern, observability central). Finalizarea se considera completa doar dupa un deploy E2E reusit (staging + production) cu verificari de ingress si smoke tests reale.

