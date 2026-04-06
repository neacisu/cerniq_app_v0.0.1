# Contribuție la Cerniq monorepo

## Cerințe

- **Node.js** și **pnpm** conform [`package.json`](package.json) (`engines`).
- În medii CI folosiți versiunile specificate acolo.

## Comenzi uzuale

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm validate   # lint + typecheck + test (turbo) — același tip de poartă ca pre-push spre main (fără markdownlint pe tot repo-ul)
```

### Poarte calitate (rezumat)

| Comandă | Rol |
| ------- | --- |
| `pnpm validate` | Lint + typecheck + test (Turbo) înainte de PR |
| `pnpm --filter <pachet> <script>` | Verificări țintă (ex. `@cerniq/api test`) |
| `pnpm test:e2e` | Playwright — vezi `PLAYWRIGHT_BASE_URL` în `playwright.config.ts` |
| `pnpm test:infra` | Vitest — suite `tests/e2e/infrastructure` (opțional/local vs CI; vezi `docs/infrastructure/ci-cd-pipeline.md`) |
| `pnpm test:load:etapa1` | k6 — necesită binar [k6](https://k6.io/) instalat |
| `pnpm test:ci` | Vitest orchestrat + planuri `tests/plans` (inclusiv markdownlint țintă, compose, E5 requirements) |
| `pnpm lint:md` | markdownlint-cli2 pe setul documentelor PR/plan |
| `pnpm verify:sonar-config` | Validare config Sonar (rulează în CI Lint) |
| SonarCloud QG | Job condiționat `SONAR_SCAN=true` — vezi secțiunea **Calitate** de mai jos |
| `pyright` (Python E5) | Analiză statică pe `workers/e5-nurturing/python/*.py` conform [`pyrightconfig.json`](pyrightconfig.json) (`**/.venv` exclus); rulează local dacă aveți CLI instalat |

**Inventar scripturi infra:** [`docs/infrastructure/infra-scripts-inventory.md`](docs/infrastructure/infra-scripts-inventory.md). **OpenAPI/Swagger:** UI `/docs`, alias `/documentation`, ghid [`docs/developer-guide/openapi-swagger-parity.md`](docs/developer-guide/openapi-swagger-parity.md).

### Cognitive Brain SSE și Refine

- **JWT în query pentru SSE** (`EventSource` fără `Authorization`): riscuri și mitigări — [`docs/developer-guide/security-sse-brain-token.md`](docs/developer-guide/security-sse-brain-token.md).
- **Refine** (`CerniqRefineProvider`): contract `authProvider` / `dataProvider` aliniat la `useAuth` — [`docs/developer-guide/refine-auth-data-provider.md`](docs/developer-guide/refine-auth-data-provider.md).

### Dependabot și supply chain

- Configurație: [`.github/dependabot.yml`](.github/dependabot.yml) (`github-actions`, `npm`, `docker` pe directoare cu `Dockerfile`, `pip` sub `services/python-*` cu `requirements.txt`).
- Proces și excepții (`pnpm approve-builds`): [`docs/developer-guide/supply-chain-dependabot.md`](docs/developer-guide/supply-chain-dependabot.md).

### Exemplu UI în documentație (`UI_UX_Example`)

Folderul [`docs/specifications/Etapa 0/UI_UX_Example/source`](docs/specifications/Etapa%200/UI_UX_Example/source) este un **prototip / mock Vite** separat de SPA-ul principal [`apps/web`](apps/web). Nu face parte din obiectivul „date reale” pentru `apps/web` și **nu** este țintă de build sau deploy de producție până la o decizie explicită de promovare. **CI** (workflow-uri din `.github/workflows`) nu referă `UI_UX_Example` — verificare automată: [`tests/plans/workflows-no-ui-ux-example.test.ts`](tests/plans/workflows-no-ui-ux-example.test.ts).

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
pnpm test:e2e --grep @critical   # doar suite minimă E1–E5 (`e2e/critical-stages-e1-e5.spec.ts`)
pnpm test:ci     # Vitest JSON per pachet + workers E3/E4/E5 (vezi `infra/scripts/run-vitest-ci.mjs`)
```

### Acoperire cod (Vitest coverage-v8)

- **`@cerniq/api`** și **`@cerniq/web`**: praguri definite în `apps/api/vitest.config.ts` și `apps/web/vitest.config.ts` (în prezent **statements / branches / functions / lines: 80 / 75 / 80 / 80**). **Nu coborî pragurile fără review explicit în PR** — reflectă riscul (API: scrieri și validări).
- Rulare cu rapoarte LCOV: `pnpm test:coverage` (Turbo propagă `--coverage` către pachetele configurate).
- Verificare rapidă că fișierele de configurare încă declară `thresholds`: `pnpm verify:coverage-policy`.
- SonarCloud folosește `apps/api/coverage/lcov.info` și `apps/web/coverage/lcov.info` (vezi `sonar-project.properties`).

### Playwright (E2E)

- URL de bază: `PLAYWRIGHT_BASE_URL` (implicit `http://localhost:64000` în `playwright.config.ts`). Pentru staging, folosiți variabile de mediu pentru credențiale; **nu comitați parole** în repo.
- În dev, login-ul poate pre-umple câmpuri demo (vezi secțiunea „Demo login” de mai jos); suitele `e2e/*.spec.ts` se bazează pe acest comportament când nu sunt setate `PLAYWRIGHT_E2E_*`.

## Calitate

- Rezolvați erorile din panoul **Problems** (IDE) pe fișierele modificate.
- **Markdown** (reguli comune MD041/MD060/MD040 pe template PR, README-uri țintă): `pnpm lint:md` (rulează și din `tests/plans/markdownlint-core-docs.test.ts` în `pnpm test:ci`).
- **SonarCloud / Quality Gate**: config în [`sonar-project.properties`](sonar-project.properties). CI rulează `pnpm verify:sonar-config` în job-ul **Lint** (validare chei + căi LCOV declarate). **Scanarea efectivă și Quality Gate** pe cod nou au loc în SonarCloud când activați job-ul **SonarCloud** (`SONAR_SCAN=true`) și există token: **preferință OpenBao** `secret/cerniq/ci/sonar` → cheie `token` (vezi [`openbao-secrets-inventory.md`](docs/developer-guide/patterns/openbao-secrets-inventory.md)); fallback secret GitHub `SONAR_TOKEN`. Local: `pnpm diagnostics:sonar:fetch` cu `SONAR_TOKEN` în mediu (sau export din sursa ta de secrete). În [`ci-pr.yml`](.github/workflows/ci-pr.yml), legăturile la `vars` / `SONAR_TOKEN` folosesc `fromJSON(toJSON(...))` ca workaround pentru language server-ul GitHub Actions (fără schimbare semantică); dacă tot vezi „Context access might be invalid”, conectează-te în panoul **GitHub Actions** din IDE și reîncarcă fereastra. **Nu posta niciodată tokenul Sonar** în chat, issue sau commit — dacă a fost expus, revocă-l în SonarCloud și generează altul.
- **Inventar generat (sincron cu codul)**: după schimbări la rute sau metrici Prometheus, rulați `pnpm audit:api-routes:write` și `pnpm audit:prometheus-metrics:write`, apoi comitați [`docs/generated/api-routes-inventory.json`](docs/generated/api-routes-inventory.json) și [`docs/generated/prometheus-metrics-inventory.json`](docs/generated/prometheus-metrics-inventory.json). `pnpm audit:api-routes` afișează același JSON la stdout fără a scrie fișierul.
- **Health `/health/*`**: în SPA-ul principal operațiunile de sănătate nu sunt expuse în meniu; consumatorul suportat este [`apps/web-admin`](apps/web-admin) (ex. `fetchHealthDeps` → `/health/deps`). **Auth `/api/v1/auth/*`**: [`apps/web`](apps/web) prin `AuthProvider` + pagini Login / ForgotPassword.

## Git hooks

Proiectul folosește **Husky** + **lint-staged** (vezi root `package.json`).

| Verificare | CI (`ci-pr.yml`, job **Lint**) | `.husky/pre-commit` | `.husky/pre-push` (doar `main`) |
| ---------- | ------------------------------ | ------------------- | -------------------------------- |
| ESLint (repo) | `pnpm lint` (Turbo) | `lint-staged` → `eslint --fix` pe fișierele staged `*.{ts,tsx}` | `pnpm lint` |
| Prettier | `pnpm prettier --check .` (tot repo-ul) | `lint-staged` → `prettier --write` pe staged `*.{ts,tsx}` | nu rulează |
| Typecheck | `pnpm typecheck` | `pnpm typecheck` (tot monorepo-ul) | `pnpm typecheck` |
| Teste | job separat **Tests** | — | `pnpm test` |

**Diferențe intenționate:** la commit, Prettier/ESLint se aplică prin **lint-staged** (nu este echivalent bit-cu-bit cu `prettier --check .` pe tot arborele). Înainte de PR, rulați local `pnpm lint` și `pnpm prettier --check .` dacă ați atins formatare în afara `ts/tsx` sau fișiere nestaged.

**Bypass:** `git commit --no-verify` / `git push --no-verify` sar peste hook-uri. **Consecințe:** risc de respingere la review sau eșec în CI; folosiți doar când e justificat (ex. commit intermediar WIP) și menționați în descrierea PR.

## PR

Folosiți template-ul din [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). Pentru epics (E1–E5, securitate, date), urmați [Traceabilitate ADR în PR](docs/developer-guide/pr-adr-traceability.md) și legați ADR-uri din [`docs/adr`](docs/adr).

## Demo login (doar dev)

În build **development** (`import.meta.env.DEV`), formularul de login poate pre-umple credențiale demo (`DEMO_LOGIN_CREDENTIALS` în `apps/web/src/lib/demo-auth.ts`). În **producție** câmpurile sunt goale implicit — `Login.tsx` folosește `defaultValues` fără demo decât dacă setați explicit **`VITE_SHOW_DEMO_LOGIN=true`** (staging). Nu comitați capturi de ecran produs cu parolă demo. Gard sursă: `tests/plans/login-demo-prefill-policy-source.test.ts`.
