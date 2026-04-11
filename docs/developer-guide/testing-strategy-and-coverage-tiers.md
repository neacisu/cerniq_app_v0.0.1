# Strategie de testare și registru coverage (tier-uri)

Acest document operationalizează **[ADR-0029](../adr/ADR%20Etapa%200/ADR-0029-Testing-Strategy.md)**. Surse canonice legate:

| Artefact | Rol |
| -------- | --- |
| [ADR-0029](../adr/ADR%20Etapa%200/ADR-0029-Testing-Strategy.md) | Decizii, piramidă, anti-pattern-uri, comenzi |
| [testing-coverage-tiers.json](./testing-coverage-tiers.json) | Registru mașină-citibil: pachet → tier → praguri → integrare |
| [`infra/scripts/verify-vitest-coverage-policy.mjs`](../../infra/scripts/verify-vitest-coverage-policy.mjs) | Gate CI: coerență `vitest.config.ts` ↔ registru |
| [`infra/scripts/run-vitest-ci.mjs`](../../infra/scripts/run-vitest-ci.mjs) | Lista pachetelor pentru rapoarte JSON `test:ci` |

## Tier-uri (rezumat)

- **Tier A:** logică pură, fără I/O greu — praguri Vitest **100** pe suprafața măsurată.
- **Tier B:** aplicații, workeri, integrări — praguri **100** pe domeniul inclus în coverage; integrare obligatorie unde unit-ul ar falsifica comportamentul (DB, Redis, HTTP real).
- **Tier C (concept):** bootstrap/glue — în `@cerniq/db` este modelat prin **`coverage.include`** limitat + `test:integration` pentru `client`/`migrate`/fluxuri SQL.

## `pnpm validate` vs `test:coverage` vs `test:ci` vs integrare / E2E / pgTAP

Tabelul canonic (când blochează PR-ul, artefacte) este în **ADR-0029**, secțiunea *Matrice: scop, blocare PR, artefacte*.

Rezumat:

- **`pnpm validate`** — `turbo run lint typecheck test` **fără** `--coverage`; nu este singurul gate din CI.
- **`pnpm verify:coverage-policy`** + **`pnpm test:coverage`** — praguri v8 aliniate registrului; **gate obligatoriu** în CI.
- **`pnpm test:integration`** — `infra/scripts/run-integration-from-registry.mjs` (comenzi unice din registru); **gate** în CI după `test:coverage`. Local, fără `REDIS_URL`, smoke-ul BullMQ este omis (nu și în CI).
- **`pnpm test:ci`** — rapoarte JSON Vitest pentru audit; **gate** în CI.
- **`pnpm test:e2e`** / job Playwright — invariante UI; gate **condiționat** pe modificări `apps/web` în workflow-ul curent.
- **`pnpm test:pgtap`** / pas SQL în CI — vezi `pgtapPolicy` din `testing-coverage-tiers.json`.

## Cardinalitate și artefacte CI

Rapoartele `coverage-summary.json` și summary-ul GitHub Actions trebuie să rămână **auditable**: evitați etichete dinamice cu cardinalitate foarte mare în metrici auxiliare; detalii în implementarea [`infra/scripts/coverage-job-summary.mjs`](../../infra/scripts/coverage-job-summary.mjs).

## Link bidirecțional

- Din ADR către acest ghid și `testing-coverage-tiers.json`.
- Din acest ghid către ADR și scripturi infra de mai sus.
