# Inventar `infra/scripts` — CI vs CD vs operațiuni manuale

**Scop:** să existe o sursă unică care spune **ce rulează automat în pipeline** și **ce este pentru ops pe server**, fără a executa scripturi distructive din acest document.

## Rezumat numeric

- **~84** fișiere `.sh`, `.mjs`, `.py` (nivelul rădăcină `infra/scripts/` + subfolder `lib/`).
- **Toate** scripturile `*.sh` din `infra/scripts/*.sh` sunt supuse **ShellCheck** în [`.github/workflows/ci-pr.yml`](../../.github/workflows/ci-pr.yml) (job `shellcheck`) și validare sintaxă `bash -n`.
- **CD:** [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) copiază **`infra/scripts/*.sh`** pe host la `/opt/cerniq/scripts/` (nu include `.mjs` / `.py` în acel pas SCP — acestea rămân pentru rulare din repo sau alte runbook-uri).

## Invocate din root `package.json` (CI / developer obișnuit)

| Script npm | Fișier `infra/scripts` |
| ---------- | ----------------------- |
| `diagnostics:inventory` (+ variantele) | `build-diagnostics-inventory.mjs` |
| `diagnostics:problems` | `replay-diagnostics-problems.mjs` |
| `diagnostics:sonar:fetch` | `fetch-sonar-issues.mjs` |
| `audit:api-routes` (+ `:write`) | `audit-api-routes.mjs` |
| `audit:prometheus-metrics` (+ `:write`) | `audit-prometheus-metrics.mjs` |
| `verify:sonar-config` | `verify-sonar-config.mjs` |
| `verify:coverage-policy` | `verify-vitest-coverage-policy.mjs` |
| `test:ci` | `run-vitest-ci.mjs` |
| `smoke:bullmq-prefix` | `bullmq-prefix-smoketest.mjs` |

## Invocate din teste / CI (Node)

- `tests/infra/audit-metadata-scripts.test.mjs` — `audit-prometheus-metrics.mjs`, `audit-api-routes.mjs`
- `tests/infra/sonar-token-from-rendered-env.test.mjs` — `lib/sonar-token-from-rendered-env.mjs`
- `ci-pr.yml` job **Lint** — `node --test tests/infra/audit-metadata-scripts.test.mjs` (+ alte `.mjs` din `tests/infra/` după configurația curentă)

## Operațiuni cu impact asupra datelor / infrastructurii (manual — review obligatoriu)

**Nu rulați fără să citiți scriptul integral și runbook-ul.** Exemple (non-exhaustiv):

- Backup / restore / DR: `borg_*`, `pg_dump_*`, `pg_pitr_restore.sh`, `disaster_recovery_full.sh`, `redis_backup_*.sh`, `redis_restore.sh`, `restore_table.sh`, `backup-pre-deploy.sh`, `wal_archive.sh`, …
- OpenBao: `openbao-*.sh`, `put-openbao-ci-sonar-token.sh` (scrie în KV — vezi [openbao-secrets-inventory.md](../developer-guide/patterns/openbao-secrets-inventory.md))
- PostgreSQL pe CT: `ct107_*.sh`, `ct107_*.py`, `ct_smoketest_dynamic-db-via-pgbouncer.sh`
- Traefik / OTLP orchestrator: `traefik_*.sh`, `otel_*.py`, `otlp_*.sh`, `preflight_extins_*.sh`, `preflight_extins_*.py`
- Cloudflare / DNS: `cloudflare_sync_dns.py`
- Staging: `staging_validate_ingress.py`, `staging_health_responder.py`

Pentru proceduri detaliate, urmăriți runbook-urile din `docs/` (ex. backup, OpenBao, securitate) și ADR-urile de infrastructură din [`docs/adr`](../adr/ADR-INDEX.md).

## Actualizare

La adăugarea unui script nou: decideți dacă intră în **CI** (adăugați invocare în workflow sau `package.json`) și documentați aici pe scurt dacă **modifică date în producție**.
