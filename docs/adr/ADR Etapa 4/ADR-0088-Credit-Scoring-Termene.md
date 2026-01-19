# ADR-0088: Credit Scoring via Termene.ro

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Evaluarea riscului de credit necesită date externe despre companii.

**Decision:** Integrare cu **Termene.ro API** pentru:

- Status ANAF și TVA
- Date financiare din bilanțuri
- BPI (Buletinul Procedurilor de Insolvență)
- Litigii active

**Scoring Formula:**

| Component | Points |
| ----------- | ------ |
| ANAF Status | 15 |
| Financial Health | 30 |
| Payment History (intern) | 25 |
| BPI Status | 20 |
| Litigation Risk | 10 |

**Consequences:**

- (+) Date comprehensive și actualizate
- (+) API stabil și documentat
- (+) Conformitate GDPR (date publice)
- (-) Cost per query
- (-) Rate limiting (20 req/sec)
