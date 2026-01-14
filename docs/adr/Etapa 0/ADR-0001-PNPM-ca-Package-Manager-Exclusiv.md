# ADR-0001: PNPM ca Package Manager Exclusiv

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Proiectul Cerniq.app utilizează o arhitectură monorepo cu multiple packages (apps/api, apps/web, packages/db, packages/shared-types). Necesităm un package manager care:

- Suportă workspaces native
- Oferă performanță superioară pentru instalare
- Economisește spațiu disc prin deduplicare
- Previne phantom dependencies

## Decizie

Utilizăm **PNPM 9.15+** EXCLUSIV pentru toate operațiunile de package management. npm și yarn sunt **INTERZISE**.

## Consecințe

### Pozitive

- **Hard links** pentru deduplicare → economie 60-70% spațiu disc
- **Strict node_modules** → evitare phantom dependencies
- `pnpm fetch` pentru Docker layer caching optimal
- Workspace protocol (`workspace:*`) pentru dependențe interne
- Performanță instalare: ~3x mai rapid decât npm

### Negative

- Necesită training pentru echipă (mitigat: echipă de 1 persoană)
- Unele packages necesită `shamefully-hoist` (documentat explicit)

### Configurație Obligatorie

```yaml
# .npmrc
shamefully-hoist=false
auto-install-peers=true
link-workspace-packages=true
prefer-frozen-lockfile=true
strict-peer-dependencies=false
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json root
{
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=9.15.0"
  }
}
```
