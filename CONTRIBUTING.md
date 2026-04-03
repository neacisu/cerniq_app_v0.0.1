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
- **SonarCloud / Quality Gate**: config în [`sonar-project.properties`](sonar-project.properties). CI rulează `pnpm verify:sonar-config` în job-ul **Lint** (validare chei + căi LCOV declarate). **Scanarea efectivă și Quality Gate** pe cod nou au loc în SonarCloud când activați job-ul **SonarCloud** (`SONAR_SCAN=true` + secret `SONAR_TOKEN`); fără acestea, QG nu este evaluat automat la fiecare PR — verificați manual în SonarCloud înainte de release. Local: `pnpm diagnostics:sonar:fetch` cu token.
- **Inventar generat (sincron cu codul)**: după schimbări la rute sau metrici Prometheus, rulați `pnpm audit:api-routes:write` și `pnpm audit:prometheus-metrics:write`, apoi comitați [`docs/generated/api-routes-inventory.json`](docs/generated/api-routes-inventory.json) și [`docs/generated/prometheus-metrics-inventory.json`](docs/generated/prometheus-metrics-inventory.json). `pnpm audit:api-routes` afișează același JSON la stdout fără a scrie fișierul.
- **Health `/health/*`**: în SPA-ul principal operațiunile de sănătate nu sunt expuse în meniu; consumatorul suportat este [`apps/web-admin`](apps/web-admin) (ex. `fetchHealthDeps` → `/health/deps`). **Auth `/api/v1/auth/*`**: [`apps/web`](apps/web) prin `AuthProvider` + pagini Login / ForgotPassword.

## Git hooks

Proiectul folosește **Husky** + **lint-staged** (vezi root `package.json`). Puteți ocoli cu `git commit --no-verify` doar când e justificat (documentați în PR).

## PR

Folosiți template-ul din [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). Pentru schimbări arhitecturale mari, legați ADR-uri din [`docs/adr`](docs/adr).

## Demo login (doar dev)

În build **development**, formularul de login poate pre-umple credențiale demo (vezi `apps/web/src/lib/demo-auth.ts`). În **producție** câmpurile sunt goale implicit; pentru staging puteți seta `VITE_SHOW_DEMO_LOGIN=true` dacă e politica echipei.
