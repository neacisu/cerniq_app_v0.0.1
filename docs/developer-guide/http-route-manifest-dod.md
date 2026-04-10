# Manifest HTTP (cod static) — Definition of Done pe tier-uri

Sursa canonică generată: `docs/generated/api-http-route-manifest.json` (regenerare: `pnpm audit:http-route-manifest:write`). Verificare CI: `pnpm audit:http-route-manifest` / `python3 infra/scripts/verify_http_route_manifest.py`.

## Conținut manifest

- **`routes`**: fiecare intrare — `method`, `path` (absolut), `sourceFile`, `registerSymbol`, `prefix`.
- **`byFile`**: distribuție număr de handler-e per fișier în `apps/api/src/routes/`.
- **`infrastructure`**: rute din plugin-uri (nu în modulele `routes/*.ts`) — `/metrics`, `/docs`, `/docs/json`, `/documentation`.
- **Alias E3**: `negotiationRoutes` apare cu `prefix` `/api/v1/negotiation` și `/api/v1/negotiations` (12 handler-e × 2 = 24 înregistrări pentru acel modul).

## Limitări parser (anti-fals-pozitive)

Documentate în câmpul `limitations` din JSON: fără path din variabile, fără `app.route({})` în repo. Reverificare manuală după refactorări majore.

---

## Tier T1 — toate rutele din manifest (strat obligatoriu comun)

Pentru fiecare intrare din `routes` (excludând secțiunea `infrastructure` care are tratament separat documentat):

1. **Span HTTP server OTel** — `@fastify/otel` + `HttpInstrumentation`, cu excluderi doar pentru infrastructură (`/metrics`, `/health*`, `/docs*`, `/documentation`, `/`) conform `packages/observability/src/init.ts`.
2. **Metrici RED Prometheus** — `cerniq_http_*` cu label `route` = șablon (`httpRouteLabel` în `apps/api/src/plugins/metrics.ts`).
3. **Log acces structurat** — plugin `request-logging.ts` (requestId, correlationId, trace/span când există).

## Tier T2 — rute mutante (POST / PATCH / DELETE / PUT)

În plus față de T1, unde este în planul de audit (F2.3): **audit trail** pentru mutații — plugin `audit-trail.ts` (poate fi dezactivat prin `AUDIT_TRAIL_DISABLED` / `NODE_ENV=test`).

## Tier T3 — rute critice

În plus față de T1: **counter-e business** explicite în `metrics.ts` (E3/E4/E5, auth login, rate-limit, SSE), alerte și SLO pe familii de prefix.

## Verificare smoke traces (familii de rute)

Matricea recomandată (minimal o rută reprezentativă per grup din manifest): auth, imports, outreach, webhooks, gdpr, negotiation (ambele prefixuri opțional în același test), brain, health. Todo-ul `tel-smoke-traces-all-route-groups` extinde acoperirea cu OTLP mock/collector.

## Artefact CI

Workflow `ci-pr.yml` rulează verificarea snapshot; manifestul din repo poate fi atașat ca artefact suplimentar la nevoie (copie identică cu `docs/generated/`).
