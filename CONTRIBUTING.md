# Contribuție la Cerniq monorepo

## Cerințe

- **Node.js** și **pnpm** conform [`package.json`](package.json) (`engines`).
- În medii CI folosiți versiunile specificate acolo.

## Comenzi uzuale

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm validate   # lint + typecheck + test (turbo)
```

### Pachet individual

```bash
pnpm --filter @cerniq/web lint
pnpm --filter @cerniq/api typecheck
```

### Teste

```bash
pnpm --filter @cerniq/web test --run
pnpm --filter @cerniq/api test --run   # necesită servicii/config dacă suitele integration pornesc app-ul
pnpm test:e2e   # Playwright (env + URL)
```

## Calitate

- Rezolvați erorile din panoul **Problems** (IDE) pe fișierele modificate.
- **SonarCloud / Quality Gate**: vezi [`sonar-project.properties`](sonar-project.properties) și pipeline-ul CI; `pnpm diagnostics:sonar:fetch` poate fi folosit local dacă aveți token.

## Git hooks

Proiectul folosește **Husky** + **lint-staged** (vezi root `package.json`). Puteți ocoli cu `git commit --no-verify` doar când e justificat (documentați în PR).

## PR

Folosiți template-ul din [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). Pentru schimbări arhitecturale mari, legați ADR-uri din [`docs/adr`](docs/adr).

## Demo login (doar dev)

În build **development**, formularul de login poate pre-umple credențiale demo (vezi `apps/web/src/lib/demo-auth.ts`). În **producție** câmpurile sunt goale implicit; pentru staging puteți seta `VITE_SHOW_DEMO_LOGIN=true` dacă e politica echipei.
