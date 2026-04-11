# Catalog E2E Playwright — fluxuri critice

**ADR:** [ADR-0029](../adr/ADR%20Etapa%200/ADR-0029-Testing-Strategy.md)  
**Comandă locală (root):** `pnpm test:e2e`  
**CI:** job `playwright-e2e` în `.github/workflows/ci-pr.yml` — rulează `apps/web` cu `playwright.config.cjs` când se modifică `apps/web/**`.

## Rol în piramidă

E2E **nu** urmărește 100% acoperire de linii Vitest; urmărește **invariante de business** și regresii pe fluxuri critice.

## Fluxuri și mapare (întreținere obligatorie)

| Zonă de risc | Invariante (rezumat) | Spec-uri Playwright |
| ------------ | -------------------- | ------------------- |
| Autentificare / shell public | Utilizatorul poate autentifica; rutele protejate rămân inaccesibile fără sesiune | `apps/web/e2e/auth-login.spec.ts`, `apps/web/e2e/public-auth-shell.spec.ts`, `e2e/login.spec.ts` |
| Import date / pipeline | Import CSV și pași asociați nu pierd date vizibile în UI; erorile sunt surfaced | `apps/web/e2e/import-csv-flow.spec.ts`, `e2e/import-csv.spec.ts` |
| Lead / companii (gold) | Acțiuni pe lead/companii se reflectă în listări și detalii | `apps/web/e2e/lead-management.spec.ts`, `apps/web/e2e/gold-company-view.spec.ts`, `e2e/gold-lead-management.spec.ts` |
| Outreach / secvențe | Configurație secvență și timeline respectă regulile afișate | `apps/web/e2e/outreach-sequence.spec.ts` |
| Navigare etape / rute E3–E5 | Rutele etapelor critice rămân accesibile conform navigației produs | `e2e/stages-e3-e5-routes.spec.ts`, `e2e/critical-stages-e1-e5.spec.ts`, `e2e/navigation.spec.ts` |
| Pipeline bronze/silver/gold | Tranziții de strat și vizibilitate date conform fluxului | `e2e/pipeline-bronze-silver-gold.spec.ts` |
| HITL / aprobări | Stări de așteptare și tranziții vizibile acolo unde UI expune HITL | `e2e/hitl-approval.spec.ts` |
| Enrichment | Flux enrichment nu regresează pașii critici din UI | `e2e/enrichment-pipeline.spec.ts` |
| Securitate UI | Verificări de bază pe comportament expus (fără a înlocui auditul de securitate) | `e2e/security.spec.ts` |

La adăugarea unui flux critic nou: **(1)** spec Playwright **(2)** rând nou în tabelul de mai sus **(3)** legătură în PR / review la fel ca pentru cod de producție.

## CI vs local

- În **CI**, Playwright pentru web este un job **condiționat** de modificări sub `apps/web/**` (vezi workflow). Nu înlocuiește `pnpm test:coverage` sau `pnpm test:integration`.
- **`pnpm test:e2e` la root** folosește configurația Playwright din rădăcina repo-ului; mențineți ambele seturi de spec-uri (root `e2e/` și `apps/web/e2e/`) mapate în acest catalog.
