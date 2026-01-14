# ADR-0028: Git Branching Strategy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Ca echipă de 1 persoană, necesităm o strategie simplă dar eficientă.

## Decizie

Utilizăm **GitHub Flow** simplificat.

## Consecințe

### Branches

- `main` - production-ready, protected
- `feature/*` - noi features
- `fix/*` - bug fixes
- `hotfix/*` - urgent production fixes

### Flow

```text
1. Create branch: feature/F0.1.1-docker-setup
2. Develop & commit
3. Push & create PR
4. Self-review (checklist)
5. Merge to main
6. Auto-deploy to production
```

### Commit Convention (Conventional Commits)

```text
feat(api): add companies endpoint
fix(db): correct RLS policy for leads
docs(adr): add ADR-0028 git branching
chore(deps): update fastify to 5.6.2
```
