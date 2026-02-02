# GitHub Repository Setup

## Scope
Standardizarea setărilor repository-ului pentru Etapa 0.

## Setări recomandate
- Default branch: `develop`
- Protecție branch pentru `main` și `develop`
- Required reviews: 1+
- Require status checks: CI
- Enable Issues, PRs, Discussions

## Fișiere obligatorii
- `.github/CODEOWNERS`
- `.github/ISSUE_TEMPLATE/*`
- `.github/PULL_REQUEST_TEMPLATE.md`

## Securitate
- Activează GitHub Security Alerts
- Configurează Dependabot/Renovate

## Validare
- PR fără CI nu se poate merge
- Review obligatoriu pentru `main`

## Referințe
- ADR-0028 Git Branching Strategy
- ADR-0032 CI/CD Pipeline Strategy
- Etapa 0 plan: F0.17.1.T001-T004
