# Arhitectura metricilor worker (E3 / E4 / E5 și altele)

## Decizie (martie 2026)

- **Worker-ii** (ex. `workers/e3-ai-sales`, `workers/e4-postsale`, `workers/e5-nurturing`) expun contoare și histograme Prometheus prin module dedicate (`e3-metrics.ts`, `e4-metrics.ts`, `lib/e5-metrics.ts`) și prin primitive partajate în `@cerniq/worker-shared` unde e cazul.
- **Scraping**: Prometheus colectează endpoint-ul HTTP de metrici al fiecărui proces worker (configurare infrastructură), **nu** browser-ul SPA.
- **SPA / UI public**: nu apelează direct `/metrics` pe workeri (CORS, securitate, cardinalitate). Orice dashboard în aplicația web consumă date **doar** prin:
  - **proxy API admin** (ex. `GET /api/admin/live` → Monitoring API pentru cozi + JSON sistem), și/sau
  - **Grafana** legată la același Prometheus ca backend-ul operațional.
- **API Cerniq (Fastify)**: metricile `cerniq_http_*`, `cerniq_e3_*`, `cerniq_e4_*`, `cerniq_e5_*` sunt definite în `apps/api/src/plugins/metrics.ts` și documentate pentru UI prin `GET /api/admin/prometheus/api-plugin-catalog` (JWT admin/owner/superadmin). Endpoint-ul text `GET /metrics` al API rămâne cu **allowlist IP** (`METRICS_ALLOW_CIDR`).

## Implicații

- **Carduri KPI** în UI trebuie să citească un **nume de metrică** sau un **câmp JSON** documentat; dacă seria nu există în sursa observată, afișare **„indisponibil”**, nu valori estimate.
- **Duplicarea numelor** între worker și API trebuie evitată la definire; la migrări (ex. `e5_graph_*` vs `etapa5_*`) mențineți o singură convenție în Prometheus și documentați alias-urile în runbook.

## Fișiere de referință

- API: `apps/api/src/plugins/metrics.ts`, `apps/api/src/routes/admin-monitoring.ts`
- E3: `workers/e3-ai-sales/src/e3-metrics.ts` (sau cale echivalentă în monorepo)
- E4: `workers/e4-postsale/src/e4-metrics.ts`
- E5: `workers/e5-nurturing/src/lib/e5-metrics.ts`
