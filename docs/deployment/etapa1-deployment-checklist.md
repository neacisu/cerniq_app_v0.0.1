# Etapa 1 Deployment Checklist

## Pre-deployment

- [ ] `pnpm --filter @cerniq/db test && pnpm --filter @cerniq/db typecheck`
- [ ] `pnpm --filter @cerniq/worker-enrichment test && pnpm --filter @cerniq/worker-enrichment build`
- [ ] `pnpm --filter @cerniq/api test && pnpm --filter @cerniq/api build`
- [ ] `pnpm --filter @cerniq/web test && pnpm --filter @cerniq/web build`
- [ ] DB migrations reviewed and dry-run validated on staging
- [ ] OpenBao/secret templates include all Etapa 1 env vars
- [ ] Redis and BullMQ connectivity validated
- [ ] Grafana dashboards provisioned and loading
- [ ] Prometheus alert rules loaded and validated
- [ ] Playwright E2E smoke suite passed on staging

## Release execution

- [ ] Deploy DB migration first, monitor migration logs
- [ ] Deploy API and worker services with rolling strategy
- [ ] Deploy web and web-admin after API health is green
- [ ] Verify `/health`, `/health/deps`, `/metrics` on API
- [ ] Verify worker health and queue consumption

## Post-deployment verification

- [ ] Import CSV smoke test (Bronze insert visible)
- [ ] Silver enrichment smoke test (status moves to in_progress/complete)
- [ ] Approval task create/assign/decide smoke test
- [ ] Gold promotion smoke test
- [ ] Alert test firing (synthetic) and notification delivery
- [ ] Error budget / SLO checks in Grafana

## Rollback criteria

Trigger rollback if one or more:

- API error rate > 5% for 10 minutes
- Enrichment queue depth > 5000 for 10 minutes
- Critical alerts unresolved > 15 minutes
- Data integrity issue confirmed (duplicate/corrupt promotion)

## Rollback steps

1. Pause ingress to mutation-heavy endpoints (`/imports`, `/enrichment/*/decide`, `/silver/*/promote`).
2. Scale down new worker deployment to zero.
3. Restore previous API and web image tags.
4. Resume previous workers and validate queue drain.
5. If migration is backward-compatible, keep schema and re-run smoke tests.
6. If migration is breaking, execute approved rollback migration and verify integrity checks.
