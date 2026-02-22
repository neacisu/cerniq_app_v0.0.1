---
name: Etapa 0 Plan Complet
overview: Plan unic complet pentru finalizarea Etapei 0 pe noua infrastructura Hetzner+Proxmox+orchestrator. Include toate cele 20 faze (F0.1-F0.20), UI/UX complet cu 28 pagini din exemplul mock, actualizare documentatie, Vite 7.3.1, design system Dark Terroir OKLCH P3, 93+ fisiere frontend (13 primitive + 5 data display + 5 layout + 2 brand + 3 feedback + 28 pagini), 62+ teste, 16 documente pattern, 51 iconite Lucide mapping, 36 statusuri SBadge, 9 badge variants, 6 button variants.
todos:
  - id: phase-0-branch
    content: FAZA 0 (PRE-TASK) — Creare branch feat/etapa-0-implementation, comit+push [skip ci] planul si UI/UX spec, fara rularea CI/CD flows
    status: in_progress
  - id: phase-a-monorepo
    content: "FAZA A — F0.6 Monorepo: package.json in toate 10 workspace-uri + turbo.json + Turborepo (taskuri 1-6)"
    status: pending
  - id: phase-b-shared
    content: "FAZA B — Shared Packages: packages/shared-types (Zod schemas), packages/db (Drizzle + PgBouncer + 5 schema-uri + tabele tenants/users/RBAC/approval/audit), packages/config (taskuri 7-17)"
    status: pending
  - id: phase-c-api
    content: "FAZA C — F0.9 API port 64010: Fastify v5, plugins, error handling, Pino PII, health 3-tier, OTEL, BullMQ factory, circuit breaker, rate limit (taskuri 18-29)"
    status: pending
  - id: phase-d-database
    content: "FAZA D — F0.10 Database: RLS policies, Drizzle migrations, seed data dev+test (taskuri 30-33)"
    status: pending
  - id: phase-e-frontend
    content: "FAZA E — F0.11 Frontend 28 PAGINI: React 19 + Vite 7.3.1 + Tailwind v4 + Refine v5 + shadcn/ui, Design System Dark Terroir OKLCH P3, ~93 fisiere, 13 primitive + 5 data display + 5 layout + 2 brand + 3 feedback + 28 pagini mock (toate Etapele 0-5), WCAG 2.2 AA (taskuri 34-62)"
    status: pending
  - id: phase-f-admin
    content: "FAZA F — F0.19 Admin Dashboard: React 19 + Vite 7.3.1, layout admin, WebSocket, Dashboard/Queues/Health, Dockerfile port 64012 (taskuri 63-68)"
    status: pending
  - id: phase-g-monitoring
    content: "FAZA G — F0.18 Monitoring API Sidecar: Fastify v5, BullMQ read-only, WebSocket broadcast, REST endpoints, Dockerfile port 64080 (taskuri 69-75)"
    status: pending
  - id: phase-h-devenv
    content: "FAZA H — F0.12 Dev Environment: docker-compose.override.yml, .env.example, VSCode launch.json, Dockerfile.dev (taskuri 76-79)"
    status: pending
  - id: phase-i-testing
    content: "FAZA I — F0.13+F0.20 Testing: vitest per-package, factories, fixtures, MSW, 62+ teste (API+DB+Frontend 28 pagini+13 primitive+5 data display+Monitoring+Admin+Smoke), coverage thresholds (taskuri 80-88)"
    status: pending
  - id: phase-j-docker
    content: "FAZA J — F0.14-F0.17 Docker Integration: servicii reale, healthchecks, Traefik, port matrix, CI/CD, staging deploy, smoke tests (taskuri 89-92)"
    status: pending
  - id: phase-k-ports
    content: "FAZA K — Rescriere port matrix: corectare Web/API, HAProxy Gateway, porturi monitoring+python (taskuri 93-97)"
    status: pending
  - id: phase-l-docs-patterns
    content: "FAZA L — 16 documente pattern lipsa: 5 BLOCKERE (External API, Webhook, OpenBao Inventory, Worker Pool, Redis DB), 7 HIGH (FSM, File Upload, i18n, PDF, Notifications, Pagination, Search), 4 MEDIUM"
    status: pending
  - id: phase-m-python
    content: "FAZA M — Python service skeletons: python-mcp (64078), python-graph (64077), python-pdf (64076), python-document (64075) — directoare cu Dockerfile/requirements.txt/README/placeholder"
    status: pending
  - id: phase-n-docs-uiux
    content: "FAZA N — Actualizare documentatie UI/UX: rescrierea docs/ui-ux/ (4 fisiere), actualizare spec normativ, versiuni Vite 6->7 in 5 documente, font Inter->Bricolage/DM Sans/Geist Mono, convertire HSL->OKLCH in 4 fisiere, aliniere design system in 7 spec UI Etapa 1-5"
    status: pending
isProject: false
---

# Plan Complet Finalizare Etapa 0 — [Cerniq.app](http://Cerniq.app)

## 1. Ce presupune Etapa 0 (toate 20 fazele)

Etapa 0 defineste **Infrastructura MVP** — fundatia pentru toate etapele 1-5. Conform documentatiei, cuprinde **20 faze (F0.1-F0.20)**. Fazele F0.1-F0.13 sunt documentate in planul de implementare. Fazele F0.14-F0.20 au fost reconstituite din context (referinte in github-repository-setup.md, monitoring-api-spec.md, testing-strategy.md):

- **F0.1-F0.5**: Infrastructura (Docker, PostgreSQL, Redis, Traefik, Observability) — **DONE**
- **F0.6**: Monorepo PNPM + Turborepo — **PARTIAL**
- **F0.7-F0.8**: Backup + Security Hardening — **DONE**
- **F0.9**: API Boilerplate (Fastify v5, plugins, error handling, health checks, OTEL) — **NOT STARTED**
- **F0.10**: Database Schema Foundation (Drizzle ORM, 5 schema-uri, multi-tenant RLS, migrations) — **NOT STARTED**
- **F0.11**: Frontend Boilerplate (React 19, Vite 7, Refine v5, Tailwind v4, 28 pagini, design system complet) — **NOT STARTED**
- **F0.12**: Development Environment (Docker override, VSCode debug, env templates) — **PARTIAL**
- **F0.13**: Testing Foundation (Vitest, factories, fixtures, contract tests) — **PARTIAL**
- **F0.14**: PgBouncer Connection Pooling — **DONE** (CT109/CT110)
- **F0.15**: CI/CD Pipeline — **DONE** (GitHub Actions, self-hosted runner CT108)
- **F0.16**: DNS and Domain Configuration — **DONE** (Cloudflare, subdomenii cerniq.app)
- **F0.17**: GitHub Repository Setup — **DONE** (CODEOWNERS, branch protection, templates)
- **F0.18**: Monitoring API Sidecar (`apps/monitoring-api`) — **NOT STARTED**
- **F0.19**: Admin Dashboard (`apps/web-admin`) — **NOT STARTED**
- **F0.20**: Integration Testing and Final Validation — **PARTIAL** (infra tests exista, lipsesc integration+acceptance)

Criterii "Must Have" pentru a trece la Etapa 1:

- Docker Engine functional, PostgreSQL cu PostGIS healthy, Redis cu noeviction
- Traefik cu HTTPS valid, API responds pe /health/ready, Frontend se incarca in browser cu toate cele 28 pagini
- Multi-tenant RLS functional, Backup script testat, 80% coverage API tests
- Schema-urile bronze/silver/gold/approval/audit create si migrate
- Monitoring API functional, Admin Dashboard cu layout de baza
- 62+ teste de validare trec, coverage thresholds atinse
- Documentatia UI/UX aliniata 100% cu exemplul mock si design system-ul Dark Terroir

---

## 2. Stadiul implementarii la data curenta

### COMPLET (F0.1-F0.5, F0.7-F0.8, F0.14-F0.17)

- **F0.1 Docker Infrastructure** — DONE: Docker Engine, networks (cerniq_public/backend/data), docker-compose.yml cu servicii
- **F0.2 PostgreSQL** — DONE: PostgreSQL 18.2 extern pe CT107, PgBouncer pe CT109/CT110, PostGIS + pgvector
- **F0.3 Redis + BullMQ** — DONE: Redis 8.4.0 shared pe orchestrator, accesat prin gateway hz.247
- **F0.4 Traefik** — DONE: Centralizat pe orchestrator, SSL/HTTPS functional
- **F0.5 Observability** — DONE: Grafana v12.3.3/Prometheus v3.9.1/Loki/Tempo pe orchestrator
- **F0.7 Backup** — DONE: pg_dump pe CT107, WAL archiving, Borg pe StorageBox
- **F0.8 Security** — DONE: OpenBao pe orchestrator, UFW firewall, container hardening
- **F0.14 PgBouncer** — DONE: CT109 (staging), CT110 (production), pool_mode=transaction
- **F0.15 CI/CD** — DONE: GitHub Actions CI+CD, self-hosted runner CT108, deploy staging/production
- **F0.16 DNS** — DONE: Cloudflare DNS cu subdomenii *.cerniq.app
- **F0.17 GitHub Repo** — DONE: Branch protection, PR templates, CODEOWNERS

### PARTIAL (F0.6, F0.12, F0.13, F0.20)

- **F0.6 Monorepo** — PARTIAL: Exista `pnpm-workspace.yaml`, root `package.json` cu lint/test/typecheck. Lipseste: **turbo.json**, **package.json in apps/, packages/, workers/**
- **F0.12 Dev Env** — PARTIAL: Exista ESLint, Prettier, Husky, lint-staged. Lipseste: **docker-compose.override.yml**, **.env.example**, **Dockerfile.dev**, **VSCode launch.json**
- **F0.13 Testing** — PARTIAL: Exista `vitest.config.ts` la root, 8 fisiere e2e infra tests (223 teste pass). Lipseste: **unit tests**, **integration tests**, **test factories**, **database fixtures**
- **F0.20 Integration Testing** — PARTIAL: Exista teste e2e infrastructura. Lipseste: **integration tests aplicatie**, **acceptance tests**, **smoke tests**

### NEIMPLEMENTAT (F0.9, F0.10, F0.11, F0.18, F0.19)

- **F0.9 API Boilerplate** — NOT STARTED: Doar placeholder HTTP server. Fara Fastify, plugins, error handling, health checks, OTEL, Pino
- **F0.10 Database Schema** — NOT STARTED: Directoare goale. Fara Drizzle client, schema-uri, RLS, migrations, seed
- **F0.11 Frontend** — NOT STARTED: Doar placeholder HTTP "Coming Soon". Fara React, Refine, Tailwind, Vite
- **F0.18 Monitoring API** — NOT STARTED: Directorul `apps/monitoring-api/` nu exista
- **F0.19 Admin Dashboard** — NOT STARTED: Doar placeholder `server.js`

---

## 3. Gap-uri de implementare — noua infrastructura

### Gap 1: Database Connection

- **Realitate**: Prin PgBouncer local (`cerniq-pgbouncer:6432`) -> CT107 (`10.0.1.107:5432`). Credentiale din OpenBao
- **Impact F0.9/F0.10**: Drizzle client configurat pt PgBouncer extern (fara pool intern). Env vars din OpenBao template injection

### Gap 2: Redis Connection

- **Realitate**: Redis shared pe orchestrator, accesat prin gateway hz.247 (`10.0.1.10:6379`), ACL + prefix `cerniq:` obligatoriu

### Gap 3: Secrets Management

- **Realitate**: OpenBao agents injecteaza env vars din templates. Fara fisiere `_FILE`

### Gap 4: Observability

- **Realitate**: OTEL Collector local (port 64070/64071) exporta catre orchestrator. Grafana/Prometheus/Loki/Tempo pe orchestrator

### Gap 5: Traefik Routing

- **Realitate**: Traefik pe orchestrator cu config YAML (`infra/config/traefik-orchestrator/cerniq.yml`). Containerele NU au labels Traefik

### Gap 6: Port Allocation

- **Realitate**: Porturi 64000-64099: Web=64000, API=64010, Admin=64012, Monitoring-API=64080

---

## 4. Izolare proiecte — REGULI STRICTE

- **Redis**: EXCLUSIV prefix `cerniq:` pe toate cheile/cozile BullMQ
- **PostgreSQL CT107**: EXCLUSIV baza de date `cerniq_production`/`cerniq_staging`
- **Traefik orchestrator**: Modificam EXCLUSIV `cerniq.yml`
- **OpenBao orchestrator**: EXCLUSIV path-urile `kv/cerniq/`*
- **Docker networks**: EXCLUSIV `cerniq_public`/`cerniq_backend`/`cerniq_data`
- **CI/CD**: Self-hosted runner CT108

---

## 5. Plan de implementare — taskuri complete

### FAZA 0: Branch Setup si Documentatie (PRE-TASK)

**Scop:** Creare branch de lucru si comitarea documentatiei actualizate fara a declansa CI/CD.

**Taskuri:**
0a. `git checkout -b feat/etapa-0-implementation` — creare branch de lucru
0b. Salvare plan implementare in codebase: `docs/specifications/Etapa 0/etapa0-implementation-plan-v3.md`
0c. `git add` planul + UI/UX spec
0d. `git commit -m "[skip ci] docs: add etapa 0 implementation plan v3 and UI/UX spec"` — `[skip ci]` previne CI/CD
0e. `git push -u origin feat/etapa-0-implementation`

### FAZA A: Monorepo Foundation (F0.6 completare)

**Fisiere noi/modificate:**

- `apps/api/package.json`, `apps/web/package.json`, `apps/web-admin/package.json`, `apps/monitoring-api/package.json`
- `packages/db/package.json`, `packages/shared-types/package.json`, `packages/config/package.json`
- `workers/ai/package.json`, `workers/enrichment/package.json`, `workers/outreach/package.json`
- `turbo.json` (root), `package.json` (root update)

**Taskuri:**

1. Creare `package.json` in fiecare din cele 10 workspace-uri
2. Creare `turbo.json` cu pipeline: build, dev, lint, test, typecheck
3. `pnpm add -D turbo` la root
4. Update root `package.json` scripts
5. `pnpm install` pentru a link workspace-urile
6. Validare: `pnpm turbo run build --dry-run` trece

### FAZA B: Shared Packages

**Fisiere noi:**

- `packages/shared-types/src/` — Zod schemas (Company/Contact/Lead/Events, API response, structured logs, PII redaction)
- `packages/db/src/` — Drizzle client, schema-uri (tenants, users, rbac, approval, audit), migrations, seed
- `packages/config/` — ESLint + TypeScript shared configs

**Taskuri:**
7. Zod schemas cu validari specifice (CUI regex, leadScore 0-100), structured log schemas, PII redaction
8. Drizzle client prin PgBouncer (`pool: { size: 0 }`)
9. SQL migration: CREATE EXTENSION postgis/vector/pg_trgm, CREATE SCHEMA bronze/silver/gold/approval/audit
10. Tabela `tenants` (id UUID PK, name, slug, status, settings JSONB, timestamps)
11. Tabela `users` (id UUID PK, tenant_id FK, email, password_hash, name, role, status, timestamps)
12. Tabele RBAC: roles, permissions, role_permissions, user_roles
13. Tabela `approval.approval_tasks` (24 coloane — transversala E1-E5)
14. Tabela `approval.approval_type_configs` (15 coloane)
15. Tabela `audit.approval_audit_log` (18 coloane — IMUTABILA)
16. RLS policies: `tenant_id = current_setting('app.tenant_id')::uuid`
17. ESLint + TypeScript shared configs

### FAZA C: API Boilerplate (F0.9)

**Fisiere noi:** `apps/api/src/` — Fastify factory, plugins (CORS/Helmet/JWT/Cookie/tenant-context/request-logging/rate-limit/database/redis/otel/metrics), error handling (AppError hierarchy), health check routes 3-tier, queue factory, circuit breaker, graceful shutdown

**Taskuri:**
18. Fastify v5 cu Zod type provider, `trustProxy: true`, port 64010
19. Environment variable validation la startup (Zod schema, `process.exit(1)` daca lipsesc)
20. Plugin system: CORS, Helmet, JWT, Cookie, tenant-context, request-logging, rate-limit
21. Tenant-context: `SET app.tenant_id` pe conexiunea Drizzle pentru RLS
22. Error handling: AppError hierarchy (400/401/403/404/409/429), fara stack traces in productie
23. Pino logger cu PII redaction
24. Health check endpoints 3-tier (`/health/live`, `/health/ready`, `/health/deps`)
25. Prometheus metrics cu prom-client (`cerniq_health_check_status`, `cerniq_health_check_latency_ms`)
26. OpenTelemetry auto-instrumentation, export la `http://localhost:64071`
27. BullMQ Queue factory cu prefix `cerniq:`
28. Circuit breaker (Opossum), Rate limiting (Redis store), Graceful shutdown
29. Dockerfile (actualizare BUILD steps — NU modificam FROM base image)

### FAZA D: Database Schema Finalization (F0.10)

**Taskuri:**
30. RLS policies pe TOATE tabelele cu `tenant_id`
31. Drizzle `generate` + `push` migrations
32. Seed data: 2 tenants, 3 users/tenant, roles, RBAC, 3 approval_type_configs
33. Seed data testing: tenant izolat pentru @testcontainers

### FAZA E: Frontend Complet + Design System (F0.11 — `apps/web`) — 28 PAGINI

**DOCUMENT NORMATIV**: [etapa0-Ui_ux etapa0 plan complet.MD](docs/specifications/Etapa 0/etapa0-Ui_ux etapa0 plan complet.MD) (2698 linii)
**REFERINTA VIZUALA**: [UI_UX_Example/source/src/App.jsx](docs/specifications/Etapa 0/UI_UX_Example/source/src/App.jsx) (1570 linii, 28 pagini mock complet)

**Dependente NPM noi:**

- Core: `react@^19.2.0`, `react-dom@^19.2.0`
- Build: `vite@^7.3.1`, `@vitejs/plugin-react@^5.1.1`, `@tailwindcss/vite`
- Framework: `@refinedev/core@^5`, `@refinedev/react-router@^5`, `@refinedev/react-table`
- UI: `sonner`, `lucide-react`, `clsx`, `tailwind-merge`, `@radix-ui/react-tooltip`, `@radix-ui/react-collapsible`, `@radix-ui/react-tabs`, `@radix-ui/react-select`
- Forms: `react-hook-form`, `@hookform/resolvers`
- Data: `@tanstack/react-query@^5`
- Testing: `vitest` (jsdom), `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@axe-core/react`, `@playwright/test`
- Dev: `eslint@^9.39.1`, `eslint-plugin-react-hooks@^7.0.1`, `eslint-plugin-react-refresh`
- React 19 Compiler: `babel-plugin-react-compiler`

**NOTA**: Stack de productie (Tailwind v4 + Refine v5 + shadcn/ui + Lucide React) cu design vizual IDENTIC cu exemplul mock.

**Fisiere noi (~93 fisiere):**

Styles (4):

- `apps/web/src/styles/tokens.css` — Design Tokens OKLCH P3 (@theme): brand amber/gold, surface deep navy, semantic colors, tier colors bronze/silver/gold
- `apps/web/src/styles/globals.css` — CSS reset, dark/light mode, focus-visible, scrollbar
- `apps/web/src/styles/animations.css` — Keyframes: fadeUp, fadeIn, shimmer, spin, slideIn, pageIn, toastIn, glow + `prefers-reduced-motion`
- `apps/web/src/styles/typography.css` — Font scale Major Third, utilizari componente

Primitive UI Components (13 — shadcn/ui base):

- `button.tsx` — 6 variante: primary (`btp`), outline (`bto`), ghost (`btg`), brand (`btb`), danger (`btd`), success (`btok`) + 3 marimi: small (`bsm`), large (`blg`), icon-only (`bic` 32x32) + `:disabled` state
- `input.tsx` — cu `.err` state, `.wi` (with icon), wrapper `.inpw` + `.inpi` (icon button inside)
- `select.tsx` — Radix Select, stilizat glassmorphism matching input, folosit in Bronze (filter judet)
- `table.tsx` — Table wrapper (`.tw` border+radius) + Table (`.tbl` collapse, th uppercase+bg, td borders, tr:hover highlight, tr:last-child no-border)
- `tabs.tsx` — Radix Tabs, border-bottom style, `.act` state cu brand color + font-weight 600, folosit in Leads (filter status) si Settings (4 tabs)
- `card.tsx` — glassmorphism (oklch backdrop-filter blur 12px), `:hover` border-color, `.ch` header, `.ct` title, `.cb` body
- `badge.tsx` — 9 variante culoare: `bbr` (bronze), `bsi` (silver), `bgo` (gold), `bok` (ok/green), `bwa` (warning/amber), `ber` (error/red), `bin` (info/blue), `bnt` (neutral/gray), `bbd` (brand/amber translucent) + 36 statusuri exacte in SBadge + TBadge tier
- `skeleton.tsx`, `spinner.tsx`, `toast.tsx` (Sonner), `separator.tsx`, `tooltip.tsx`
- `index.ts` — barrel export

Data Display Components (5 — NOI, din exemplul mock):

- `apps/web/src/components/data/KpiCard.tsx` — KPI cu icon, value, change, animation delay, onClick
- `apps/web/src/components/data/ProgressBar.tsx` — Progress bar cu culori dinamice
- `apps/web/src/components/data/StatusDot.tsx` — Dot ok/wa/er/in/nt cu box-shadow glow
- `apps/web/src/components/data/StatsBar.tsx` — Stats bar horizontal (pipeline funnel)
- `apps/web/src/components/data/ChatMessage.tsx` — Message bubbles (out/in/ai/system)

Layout (5): AppLayout, Sidebar (collapsible 240→64px cubic-bezier(.4,0,.2,1), 7 nav sections, `.ni.act` cu left-bar 3px brand, badge counts `.nb.dn` danger rosu + `.nb.nw` warning galben cu animatie `glow` pulsatie, user zone cu avatar initiale + name + role + logout), Header (glassmorphism blur 20px, breadcrumbs "cerniq.app > Page", notification dot `.nd` 7px rosu pe bell icon, settings button, user avatar), Breadcrumb, PageWrapper (max-width 1380px, animation pageIn)

Brand (2): CerniqLogo (SVG hexagon + wordmark), EtapaBadge/EtapaBanner

Feedback (3): EmptyState, ErrorBoundary, LoadingPage

**Pages (28 — TOATE din exemplul mock):**

Auth (2):

- `pages/auth/Login.tsx` — Glassmorphism card, react-hook-form + Zod, email autofocus, password toggle, loading state
- `pages/auth/ForgotPassword.tsx` — Placeholder

Dashboard (1):

- `pages/dashboard/index.tsx` — KPIs (Bronze 47,382 / Silver 8,941 / Gold 1,247 / Venituri EUR184K), Pipeline Funnel, Activitate Recenta, mini-widgets Outreach/Infrastructure/KPI Lunar

Etapa 1 — Enrichment (5):

- `pages/etapa1/import.tsx` — Drag and drop CSV/Excel, istoric import-uri cu progress bars
- `pages/etapa1/bronze.tsx` — Tabel contacte bronze, search, filter judet, calitate medie
- `pages/etapa1/silver.tsx` — Companii validate ANAF+Termene, tier badges bronze/silver/gold
- `pages/etapa1/gold.tsx` — Leads calificate, score, revenue potential, launch outreach
- `pages/etapa1/approvals.tsx` — HITL approval cards cu confidence AI, approve/reject, urgency HIGH/MED/LOW

Etapa 2 — Outreach (6):

- `pages/etapa2/outreach.tsx` — Dashboard leads contactati, raspunsuri, email-uri, lead funnel, WA quota 20 numere
- `pages/etapa2/leads.tsx` — Lead management, tab filter per stadiu, sentiment score
- `pages/etapa2/sequences.tsx` — Multi-step sequences WA+Email cu timings
- `pages/etapa2/templates.tsx` — Template library cu preview, variabile dinamice, A/B testing
- `pages/etapa2/phones.tsx` — 20 telefoane WA, progress bars per numar, status ACTIVE/OFFLINE/BANNED
- `pages/etapa2/review.tsx` — AI message review queue cu approve/edit/reject, reason display

Etapa 3 — AI Sales (5):

- `pages/etapa3/ai-dashboard.tsx` — AI Sales Agent, state machine (DISCOVERY/PROPOSAL/OBJECTION/CLOSING/WON), LLM routing (xAI Grok/Claude/GPT-4o), guardrails summary
- `pages/etapa3/negotiations.tsx` — Negocieri active cu chat UI (out/in/ai/system bubbles), detalii, actiuni
- `pages/etapa3/offers.tsx` — Proforma si oferte tabel, statusuri DRAFT/SENT/DELIVERED/PAID
- `pages/etapa3/invoices.tsx` — e-Factura SPV ANAF, registru facturi cu TVA 24%, restante
- `pages/etapa3/guardrails.tsx` — Anti-hallucination (Price/Stock/SKU/Fiscal guards), audit log

Etapa 4 — Post-Vanzare (4):

- `pages/etapa4/payments.tsx` — Tranzactii Revolut, reconciliere automata MATCHED/UNMATCHED
- `pages/etapa4/credit.tsx` — Credit scoring profiles Termene.ro, limite dinamice, risc LOW/MED/HIGH
- `pages/etapa4/logistics.tsx` — AWB Sameday, tracking live, COD
- `pages/etapa4/returns.tsx` — RMA returns cu approve/detalii

Etapa 5 — Nurturing (4):

- `pages/etapa5/nurturing.tsx` — Retentie clienti, CLTV mediu, NPS, churn rate
- `pages/etapa5/referrals.tsx` — KOL (Key Opinion Leaders), KNN proximity map cu cercuri interactive
- `pages/etapa5/churn.tsx` — Churn risk detection cu signals, win-back actions
- `pages/etapa5/geo-map.tsx` — Harta geografica PostGIS, judete cu bubble sizes

Sistem (2):

- `pages/system/workers.tsx` — Infrastructure status (PostgreSQL, Redis, BullMQ workers, Traefik, OTEL, API)
- `pages/system/settings.tsx` — Tabs: general (tenant config, praguri automate), integrations (7 API-uri), team, billing

Providers (4): theme-provider, auth-provider, data-provider, query-provider
Config (2): navigation.ts (7 sectiuni, 28 items, badge counts), constants.ts
Hooks (3): useTheme, useBreakpoint, useDebounce
Lib (2): utils.ts (cn()), axios.ts (JWT interceptors)
Types + Entry (3): types/index.ts, App.tsx, main.tsx
HTML + Build (3): index.html, vite.config.ts, tsconfig.json, Dockerfile

**Navigatie completa (7 sectiuni din exemplul mock):**

```
PRINCIPAL: Dashboard
ETAPA 1 — ENRICHMENT: Import, Bronze, Silver, Gold, Approvals HITL (badge:3)
ETAPA 2 — OUTREACH: Outreach Dashboard, Leads (badge:127), Sequences, Templates, Phones WA, Review Queue (badge:8)
ETAPA 3 — AI SALES: AI Dashboard, Negotiations (badge:5), Offers, Invoices, Guardrails
ETAPA 4 — POST-VANZARE: Payments Revolut, Credit Scoring, Logistics AWB, Returns RMA
ETAPA 5 — NURTURING: Retentie, Referrals, Churn Risk, Harta Geografica
SISTEM: Workers Status, Setari
```

**Lucide React Icon Mapping (51 iconite din exemplu):**

home→Home, db→Database, building→Building2, users→Users, user→User, upload→Upload, star→Star, send→Send, clipboard→ClipboardList, chart→BarChart3, settings→Settings, bell→Bell, eye→Eye, eyeOff→EyeOff, arrow→ArrowRight, chevL→ChevronLeft, chevR→ChevronRight, chevD→ChevronDown, check→Check, moon→Moon, logout→LogOut, plus→Plus, refresh→RefreshCw, zap→Zap, msg→MessageSquare, mail→Mail, phone→Phone, trend→TrendingUp, package→Package, truck→Truck, credit→CreditCard, doc→FileText, shield→Shield, heart→Heart, list→List, filter→Filter, search→Search, edit→Pencil, trash→Trash2, activity→Activity, flag→Flag, robot→Bot, dollar→DollarSign, layers→Layers, globe→Globe, info→Info, xmark→X, warning→AlertTriangle, sparkle→Sparkles, gift→Gift, network→Network

**Responsive Breakpoints (custom, din exemplu):**

- `@media(max-width:1100px)`: KPI grid 4→2 cols, grid-4-col→2 cols, grid-3-col→1 col
- `@media(max-width:700px)`: Sidebar collapsed permanent 64px, KPI grid→2 cols
- Tailwind breakpoints standard (sm:640, md:768, lg:1024, xl:1280, 2xl:1536) pentru restul

**Mock Data (identice cu exemplul):**

- Companii: SC Ferma Dunarea SA, Cooperativa Agriland, OUAI Ialomita Nord, SC AgroSud SRL, SC AgroTech Dunarea
- CUI-uri: RO55443322, RO11223344, RO77889900, RO44556677, RO12345678, RO87654321, RO33221144, RO99887766
- Judete: Ialomita, Calarasi, Braila, Dolj, Teleorman
- 36 statusuri exacte in SBadge: COMPLETED, PROCESSING, FAILED, PENDING, ACTIVE, PAUSED, OFFLINE, BANNED, COLD, CONTACTED_WA, CONTACTED_EMAIL, WARM_REPLY, NEGOTIATION, CONVERTED, DEAD, DRAFT, SENT, DELIVERED, PAID, OVERDUE, RISK_LOW, RISK_MED, RISK_HIGH, LOYAL, AT_RISK, CHURNED, NEW, IN_TRANSIT, RETURNED, MATCHED, UNMATCHED, DISCOVERY, PROPOSAL, OBJECTION_HANDLING, CLOSING, WON

**Taskuri:**
34. React 19 + **Vite 7.3.1** + `@vitejs/plugin-react` 5.1.1, `@tailwindcss/vite`
35. Refine v5 headless: `@refinedev/core`, `@refinedev/react-router`, `@refinedev/react-table`
36. shadcn/ui init + customizare cu design tokens Cerniq
37. Design Tokens: `tokens.css` cu @theme complet — OKLCH P3 (exact din exemplul mock: --b3/b4/b5/b6 brand, --s950/s900/s800/s700/s600 surface, --t1/t2/t3/t4 text, --ok/wa/er/in semantic, --fD/fB/fM fonts)
38. Global Styles: `globals.css` (CSS reset, scrollbar custom 5px, focus-visible 2px solid --b5) + `animations.css` (8 keyframes: fadeUp, fadeIn, shimmer, spin, slideIn, pageIn, toastIn, glow + prefers-reduced-motion) + `typography.css` (font scale, .fd/.fm utility classes, .sv/.sl/.sc stat typography)
39. 13 Primitive UI Components (shadcn/ui + customizare): button (6 variante + 3 marimi), input (cu error/icon states), select (Radix), table (wrapper+table cu header/hover/border), tabs (Radix, border-bottom + active state), card (glassmorphism), badge (9 variante culoare, 36 statusuri exacte SBadge, TBadge tier), skeleton, spinner, toast (Sonner), separator, tooltip, barrel index
40. 5 Data Display Components NOI: KpiCard (icon+value+change+delay animation+onClick), ProgressBar (culori dinamice ok/wa/er), StatusDot (5 stari cu box-shadow glow), StatsBar (horizontal bars cu labels+values), ChatMessage (4 tipuri: out/in/ai/system cu stiluri distincte)
41. 3 Feedback Components (EmptyState cu icon+title+description, ErrorBoundary, LoadingPage), 2 Brand Components (CerniqLogo SVG hexagon+wordmark cu size/iconOnly props, EtapaBadge/EtapaBanner cu 3 tipuri: brand/info/ok)
42. 5 Layout Components: AppLayout, Sidebar (collapsible 240→64px, 7 nav sections cu section labels, nav items cu active left-bar 3px, badge counts .nb.dn/.nb.nw cu glow animation, user zone avatar+name+role+logout), Header (glassmorphism blur 20px, breadcrumbs, notification dot .nd 7px rosu pe bell, settings+avatar buttons), Breadcrumb, PageWrapper (max-w-1380, pageIn animation)
43. ThemeProvider dark default, localStorage persistence
44. Login Page (glassmorphism card 400px max-width, radial gradient background 15%/85%, fadeUp animation cubic-bezier(.34,1.56,.64,1), email autofocus, password toggle eye/eyeOff, inline validation, loading state cu Spinner, "Demo precompletat" hint, footer GDPR) + ForgotPassword placeholder
45. Dashboard complet cu KPIs (Bronze 47,382 / Silver 8,941 / Gold 1,247 / Venituri EUR184K cu onClick navigatie), Pipeline Funnel (6 bars cu StatsBar), Activitate Recenta (6 events cu StatusDot+time-ago), 3 mini-widgets Outreach/Infrastructure/KPI Lunar (card cu rows key-value cu color semantic)
46. 5 pagini Etapa 1: Import (drag-drop zone cu border dashed + color change, click upload, history table cu progress bars), Bronze (tabel cu search input + select filter judet, progress bar calitate, SBadge status), Silver (ANAF checkmark ✓/✗ + Termene checkmark, score progress, TBadge tier, butoane Sync ANAF + Gold), Gold (tabel cu company+contact+judet+revenue+score, buton send per row, Launch Outreach global), Approvals HITL (cards cu border-color per urgency HIGH/MED/LOW, badge urgency+type, confidence AI progress bar, approve btok + reject btd, EmptyState cand inbox gol)
47. 6 pagini Etapa 2: Outreach (4 KPIs, Lead Funnel cu SBadge labels + StatsBar, WA Quota 10x2 grid de progress bars verticale cu numar), Leads (tab filter ALL/COLD/CONTACTED_WA/.../CONVERTED cu SBadge in tab labels, tabel cu canal badge WA/Email, sentiment progress bar, time-ago), Sequences (cards cu step timeline WA/Email badges + delay hours, stats leads/rate/conversii, Pause/Activate toggle), Templates (split panel: library left cu selected highlight border-left 3px brand, preview right cu monospace code block + variabile bbd badges), Phones (3 KPIs, 5x4 grid cards cu WA-01..WA-20, progress bar per numar, status dot ok/er, click toast), Review (AI message preview .mai bubble, warning reason box bwa background, 3 butoane Aproba&Trimite/Edit/Respinge, EmptyState cand queue gol)
48. 5 pagini Etapa 3: AI Dashboard (4 KPIs cu onClick, 3 cards: State Machine 5 states cu StatsBar, LLM Routing 3 modele cu cost+progress, Guardrails 5 checks cu StatusDot), Negotiations (dual-view: lista cards cu avatar+company+SBadge+AI badge+value+chevron -> detail cu 2-col: left chat UI cu ChatMessage 4 tipuri + input + AI/send buttons, right detail card key-value + actions card 3 butoane, back button), Offers (3 KPIs, tabel 8 coloane cu actiuni doc+send), Invoices (4 KPIs, tabel cu highlight OVERDUE background rosu, SPV badge ok/pending, TVA 24%), Guardrails (4 guard KPI cards cu StatusDot, audit log tabel 5 coloane cu PASS/BLOCKED coloring)
49. 4 pagini Etapa 4: Payments (3 KPIs, tabel cu UNMATCHED highlight background galben, +/- amount coloring verde/rosu, currency badge, type badge PAYMENT/REFUND/UNKNOWN), Credit (3 KPIs, tabel cu score progress bar /10, limit/used coloane, risk SBadge), Logistics (3 KPIs, tabel cu AWB clickable toast tracking, colete, judet, ETA, COD badge), Returns (3 KPIs, RMA cards cu id+SBadge+company+reason+date+value, approve+details butoane, setState remove on approve)
50. 4 pagini Etapa 5: Nurturing (4 KPIs, tabel cu SBadge status, NPS cu color coding, CLTV monospace, churn % progress bar, next contact URGENT highlight rosu), Referrals (3 KPIs, 2-col: KOL list cu influence %, KNN proximity map cu positioned circles sized/colored by type — clienti activi solid vs candidati KNN dashed, legend), Churn (3 KPIs, risk cards cu border-color per severity, risk progress bar cu %, signal badges ber, action text, Win-Back+Profil butoane), GeoMap (EtapaBanner ok, 2-col: harta cu positioned circles sized by density cu box-shadow glow + click toast, top judete StatsBar cu click toast + potential neexplorat dashed box)
51. 2 pagini Sistem: Workers (4 KPIs, servicii list 12 items cu StatusDot + zebra striping, columns: name/detail/latency/jobs/status badge), Settings (Tabs 4: general cu 2 cards tenant config 4 fields + praguri automate 4 fields numerice, integrations 7 API cards cu StatusDot+key masked+edit button, team placeholder, billing cu plan name+price+features list ok color)
52. Auth provider JWT, Data provider REST, QueryProvider
53. Protected routes cu redirect
54. Navigation config: 7 sectiuni, 28 items, badge counts (Approvals .dn:3, Leads .nw:127, Review .dn:8, Negotiations .nw:5)
55. Hooks: useBreakpoint, useDebounce
56. Lib: cn() (clsx + tailwind-merge), axios cu JWT interceptors
57. index.html: `lang="ro"`, `data-theme="dark"`, font preconnect (Bricolage Grotesque + DM Sans + Geist Mono via Google Fonts)
58. Responsive: custom breakpoint 1100px (KPI 4→2, grid 4→2, grid 3→1), custom breakpoint 700px (sidebar permanent collapsed 64px, KPI→2 cols), Tailwind defaults pentru restul
59. Accessibility WCAG 2.2 AA: skip links, aria labels, focus management, keyboard navigation, target size >= 36px, `prefers-reduced-motion`, `aria-hidden` pe iconite decorative
60. Performance: React 19 Compiler, manualChunks, JS < 200KB gzipped, LCP < 2.5s, INP < 200ms, CLS = 0
61. Text color utility classes: .t1/.t2/.t3 + semantic .tok/.twa/.ter/.tb (in tokens.css sau Tailwind @apply)
62. Dockerfile: multi-stage build (node build -> nginx serve pe port 64000)

### FAZA F: Admin Dashboard (F0.19 — `apps/web-admin`)

**NOTA**: Reutilizeaza Design System "Dark Terroir" din Faza E. Conform STRATEGIE_MONITORIZARE_UI.md.

**Taskuri:**
63. React 19 + **Vite 7.3.1**, importa design tokens si componente din design system
64. Layout admin cu sidebar: Dashboard, Queues, System Health, Logs
65. WebSocket provider: `ws://monitoring-api:64080/ws/live`, reconnect exponential backoff
66. Dashboard page: Bento grid, Recharts, status cards per queue
67. Queue monitor page: tabel BullMQ cu counts, butoane Pause/Resume/Retry/Purge
68. Dockerfile: multi-stage build, nginx pe port 64012

### FAZA G: Monitoring API Sidecar (F0.18 — `apps/monitoring-api`)

**Taskuri:**
69. Fastify v5 cu `@fastify/websocket`, port 64080
70. Queue monitor: BullMQ read-only instances
71. System metrics: CPU, RAM, load average
72. WebSocket broadcast: interval 2s, JSON-RPC METRIC_UPDATE
73. REST endpoints: `/api/queues`, `/api/queues/:name`, `/api/system/metrics`
74. Control endpoint: `POST /api/control/pause` cu `x-admin-key`
75. Dockerfile: multi-stage, port 64080

### FAZA H: Development Environment (F0.12)

**Taskuri:**
76. `docker-compose.override.yml`: volumes hot reload, ports debug (9229)
77. `.env.example`: toate variabilele documentate
78. VSCode launch.json: 3 configuratii (API debug, Chrome, Compound)
79. Dockerfile.dev: `tsx watch --inspect=0.0.0.0:9229`

### FAZA I: Testing Foundation (F0.13 + F0.20)

**62+ teste specifice covrind API, Database, Frontend (28 pagini, 13 primitive, 5 data display), Monitoring API, Admin Dashboard, Dev Environment, Integration Smoke Tests.**

Coverage Thresholds: API 80%, Business Logic 85%, Event Schemas 90%, Migrations 100%, Auth/Security 95%, Global: statements 80%, branches 75%, functions 80%, lines 80%

**Taskuri:**
80. vitest configs per-package (jsdom frontend, node API)
81. Test factories: Company, Contact, Tenant, User (@faker-js/faker)
82. Database fixtures: @testcontainers/postgresql
83. MSW mock handlers
84. API Tests: app init, plugins, health checks 3-tier, error handling, schema validation, OTEL, rate limiting
85. Database Tests: migrations, tabele/schema-uri, RLS, rollback, seed
86. Frontend Tests: build/typecheck, design tokens (OKLCH P3 variables), dark mode, 3 fonturi (Bricolage/DM Sans/Geist Mono), contrast WCAG, 13 componente primitive (button 6 variante, input error/icon, select, table header/hover, tabs active state, card glassmorphism, badge 9 variante + 36 statusuri SBadge + 3 tier TBadge), auth pages (login form validation/autofocus/toggle eye/eyeOff/loading spinner/redirect, demo hint), layout (sidebar collapse 240→64 + keyboard, nav badges .dn/.nw glow, header notification dot, breadcrumb, theme toggle), accessibility (axe-core pe Login+Dashboard), performance (JS/CSS size, vendor chunks), E2E Playwright (login flow, sidebar navigation 28 pagini)
87. Frontend Tests EXTINSE (28 pagini): fiecare pagina randeaza fara erori, mock data vizibil (companii/CUI-uri/judete exacte), navigatie functionala intre pagini, responsive 1100px+700px breakpoints
88. Monitoring API Tests + Admin Dashboard Tests + Integration Smoke Tests

### FAZA J: Docker Integration si Smoke Tests (F0.14-F0.17)

**Taskuri:**
89. Actualizare docker-compose.yml cu serviciile reale
90. Docker healthchecks pe TOATE serviciile (API :64010, Web :64000, Admin :64012, Monitoring :64080, PgBouncer :6432)
91. Actualizare Traefik cerniq.yml, port matrix, CI/CD pipeline
92. Rebuild + deploy staging, smoke tests, deploy productie

### FAZA K: Rescriere Port Matrix

**Taskuri:**
93. Corectare porturi Web=64000, API=64010
94. OTLP 64070/64071 pastrate local intern
95. Adaugare 64080 monitoring-api, 64095 pgbouncer-exporter
96. Adaugare porturi Python: 64075-64078
97. HAProxy Gateway mapping (19xxx staging, 29xxx production)

### FAZA L: 16 Documente Pattern lipsa

5 BLOCKERE: External API Integration, Webhook Ingestion, OpenBao Secrets Inventory, Worker Pool Sizing, Redis DB Separation
7 HIGH: FSM Pattern, File Upload, i18n, PDF Generation, Notifications, Pagination, Search/Filter
4 MEDIUM: Email, Cron, Data Export, API Versioning

### FAZA M: Python Service Skeletons

Directoare skeleton (NU implementate): python-mcp (64078), python-graph (64077), python-pdf (64076), python-document (64075)

### FAZA N: Actualizare Documentatie UI/UX (TRANSVERSALA)

**Scop:** Alinierea COMPLETA a documentatiei cu exemplul mock si design system-ul Dark Terroir.

**N.1 Rescrierea `docs/ui-ux/` (4 fisiere):**

- `docs/ui-ux/README.md` — Stack: React 19 + Vite 7 + Tailwind v4 + Refine v5 + shadcn/ui, referinta normativa la exemplul mock
- `docs/ui-ux/frontend-stack.md` — Vite 7.3.1, `@vitejs/plugin-react` 5.1.1, fonturi Bricolage/DM Sans/Geist Mono, ESLint 9.39+
- `docs/ui-ux/design-tokens.md` — Rescriere COMPLETA cu OKLCH P3 din exemplu, eliminare HSL, adaugare tier/badge/card/spacing/shadows/z-index
- `docs/ui-ux/components-list.md` — Rescriere cu toate 28+ componente (13 primitive + 5 data display + 5 layout + 2 brand + 3 feedback) + 28 pagini + navigatie 7 sectiuni + 51 iconite Lucide mapping

**N.2 Actualizare spec normativ:**

- `docs/specifications/Etapa 0/etapa0-Ui_ux etapa0 plan complet.MD` — Scope expandat la 28 pagini, referinta exemplu mock, Vite 7.3.1, `@vitejs/plugin-react` 5.1.1

**N.3 Actualizare versiuni (Vite 6->7, font Inter->Bricolage/DM Sans/Geist Mono):**

- `docs/specifications/master-specification.md` — Sectiunea Frontend Stack
- `docs/architecture/architecture.md` — Web App Component
- `docs/developer-guide/getting-started.md` — Frontend Development
- `docs/specifications/Etapa 0/etapa0-plan-implementare-complet-v2.md` — vite ^6.0.0 -> ^7.3.1
- `docs/adr/ADR Etapa 0/ADR-0013-Tailwind-CSS-v4-cu-Oxide-Engine.md` — --font-sans: "Inter" -> fonturile noi

**N.4 Convertire culori HSL -> OKLCH P3:**

- `docs/specifications/Etapa 1/etapa1-ui-charts-navigation.md`
- `docs/specifications/Etapa 3/etapa3-ui-charts-navigation.md`
- `docs/specifications/Etapa 1/etapa1-ui-components.md`
- `docs/specifications/Etapa 3/etapa3-ui-components.md`

**N.5 Aliniere design system Dark Terroir in spec UI Etapa 1-5:**

- `docs/specifications/Etapa 1/etapa1-ui-components.md`, `etapa1-ui-pages.md`
- `docs/specifications/Etapa 2/etapa2-ui-components.md`
- `docs/specifications/Etapa 3/etapa3-ui-components.md`, `etapa3-ui-pages.md`, `etapa3-ui-forms-dialogs.md`, `etapa3-ui-tables.md`

---

## 6. Fundatia pentru Etapele 1-5

- **5 schema-uri PostgreSQL goale** + extensii (PostGIS, pgvector, pg_trgm) — Etapa 1 creeaza tabelele prin Drizzle migrations
- **Tabele transversale** (approval_tasks 24 col, approval_type_configs 15 col) — folosite de E1-E5
- **Audit trail imutabil** (approval_audit_log 18 col, event_hash chain)
- **RBAC** (roles, permissions) — fiecare etapa adauga permisiuni noi
- **BullMQ Queue Factory** cu prefix `cerniq:` — etapele adauga cozi
- **Circuit Breaker, Rate Limiting, Multi-tenant RLS, Drizzle Migration Infrastructure**
- **Auth Provider JWT** — etapele adauga pagini/rute noi
- **Monitoring API + WebSocket** — cozile noi apar automat
- **28 pagini frontend cu mock data** — etapele 1-5 inlocuiesc mock data cu date reale progresiv
- **16 documente pattern** (Faza L) — referinta implementare E1-E5
- **Port Matrix + Python Skeletons** — porturi rezervate, structuri pregatite

---

## 7. Fisiere cheie de referinta

- **Exemplu vizual mock (referinta definitiva)**: [UI_UX_Example/source/src/App.jsx](docs/specifications/Etapa 0/UI_UX_Example/source/src/App.jsx) (1570 linii, 28 pagini)
- **UI/UX Design System complet**: [etapa0-Ui_ux etapa0 plan complet.MD](docs/specifications/Etapa 0/etapa0-Ui_ux etapa0 plan complet.MD) (2698 linii)
- **Strategie Monitorizare UI**: [STRATEGIE_MONITORIZARE_UI.md](docs/specifications/Etapa 0/STRATEGIE_MONITORIZARE_UI.md)
- **Monitoring API spec**: [etapa0-monitoring-api-spec.md](docs/specifications/Etapa 0/etapa0-monitoring-api-spec.md)
- **Noua infrastructura**: [infrastructura_noua.md](infrastructura_noua.md)
- **Port Matrix**: [etapa0-port-matrix.md](docs/specifications/Etapa 0/etapa0-port-matrix.md)
- **Health Checks**: [etapa0-health-check-specs.md](docs/specifications/Etapa 0/etapa0-health-check-specs.md)
- **Logging Standards**: [etapa0-logging-standards.md](docs/specifications/Etapa 0/etapa0-logging-standards.md)
- **Testing Strategy**: [etapa0-testing-strategy.md](docs/specifications/Etapa 0/etapa0-testing-strategy.md)
- **Structured Log Schemas**: [etapa0-structured-log-schemas.md](docs/specifications/Etapa 0/etapa0-structured-log-schemas.md)
- **Env Vars**: [etapa0-environment-variables.md](docs/specifications/Etapa 0/etapa0-environment-variables.md)
- **Docker Compose**: [docker-compose.yml](infra/docker/docker-compose.yml)
- **Traefik Config**: [cerniq.yml](infra/config/traefik-orchestrator/cerniq.yml)
- **CI Pipeline**: [ci-pr.yml](.github/workflows/ci-pr.yml)
- **CD Pipeline**: [deploy.yml](.github/workflows/deploy.yml)
- **OpenBao Templates**: [api-env.tpl](infra/config/openbao/templates/api-env.tpl), [workers-env.tpl](infra/config/openbao/templates/workers-env.tpl)

