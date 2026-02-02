# ADR-0073: Guardrails Anti-Hallucination Obligatorii

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** LLM-ul poate genera informații false. În context comercial, consecințele sunt severe (pierderi financiare, probleme legale).

**Decision:** **5 Guardrails obligatorii** rulează după fiecare generare AI:

| Guardrail | Verificare | Acțiune pe Fail |
|-----------|-----------|-----------------|
| PRICE_GUARD | preț_oferit >= min_price din DB | Regenerare cu preț corect |
| STOCK_GUARD | stoc > 0 pentru produse menționate | Regenerare cu "indisponibil" |
| DISCOUNT_GUARD | discount <= max_discount_aprobat | Regenerare cu discount maxim |
| SKU_GUARD | toate SKU-urile există în catalog | Regenerare fără SKU false |
| FISCAL_GUARD | CUI valid, adresă completă | Block și request date corecte |

**Consequences:**

- (+) Zero halucinații pentru date critice
- (-) Latență adițională (~100ms total)
- (-) Complexitate în handling regenerări
