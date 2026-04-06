# Sincronizare schema / tipuri: `packages/*` ↔ UI ↔ API

**Task plan:** `packages-db-shared-integrations-schema`.  
**Regulă:** nicio coloană sau câmp expus în UI/API fără sursă în `packages/db` (Drizzle) + migrare, și tipuri aliniate în pachetele de mai jos.

## Pachete în scope

| Pachet                  | Rol în lanțul de date                      |
| ----------------------- | ------------------------------------------ |
| `@cerniq/db`            | Scheme Drizzle, migrări — sursa coloanelor |
| `@cerniq/shared-types`  | Tipuri partajate API ↔ clienți             |
| `@cerniq/shared`        | Utilitare / constante comune               |
| `@cerniq/integrations`  | Adaptori furnizori externi                 |
| `@cerniq/config`        | Config / env tipat                         |
| `@cerniq/observability` | Metrici / telemetry helpers                |

## Checklist la schimbare câmp UI/API

1. **DB:** migrare Drizzle + `pnpm --filter @cerniq/db run typecheck`.
2. **shared-types:** tipuri exportate folosite de `apps/api` și `apps/web`.
3. **API:** rute Zod / handler aliniat la coloane reale.
4. **Web:** fără constante business ascunse; date din `apiFetch` / hooks.
5. **integrations / config / observability:** doar dacă schimbarea atinge env sau outbound calls.

## Verificare automată

- Script `typecheck` prezent pe fiecare pachet — verificat de `tests/plans/monorepo-packages-typecheck-scripts.test.ts`.
- Rulare manuală / CI: `pnpm typecheck` (turbo) sau filtre `--filter` pe pachetele modificate.
