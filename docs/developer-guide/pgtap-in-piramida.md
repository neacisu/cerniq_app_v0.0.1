# pgTAP în piramida de testare

**ADR:** [ADR-0029](../adr/ADR%20Etapa%200/ADR-0029-Testing-Strategy.md)  
**Script:** [`infra/scripts/run-pgtap.sh`](../../infra/scripts/run-pgtap.sh)  
**Comandă root:** `pnpm test:pgtap`

## Rol

pgTAP verifică **constrângeri SQL**, politici și invariante la nivel de schemă acolo unde testele TypeScript nu sunt suficiente sau unde vrem verificare directă în Postgres.

## Extindere

- Adăugați teste SQL noi în structura așteptată de `run-pgtap.sh` (vezi script pentru criterii de descoperire).
- Preferință: migrații sensibile (RLS, constrângeri unice) au cel puțin un test pgTAP sau o justificare în ADR de ce rămân doar în Vitest/Testcontainers.

## CI fără extensie

Dacă extensia pgTAP nu este instalată în mediul CI, scriptul **sare** rularea (comportament documentat); nu înlocuiește testele de integrare cu DB real când extensia este disponibilă.
