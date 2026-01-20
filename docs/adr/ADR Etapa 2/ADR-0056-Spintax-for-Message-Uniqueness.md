# ADR-0056: Spintax for Message Uniqueness

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** WhatsApp și email providers detectează mesaje identice și le marchează ca spam.

**Decision:** Toate template-urile folosesc **Spintax** pentru variație:

```text
{Bună ziua|Salut|Hello} {{{firstName}}},

{Vă contactez|Scriu|Mă adresez} {în legătură cu|referitor la|despre} 
{serviciile noastre|oferta noastră|produsele Cerniq}.
```

**Rationale:**

- Fiecare mesaj devine unic
- Evită fingerprinting
- Păstrează context consistent

**Consequences:**

- (+) Unicitate garantată pentru fiecare mesaj
- (+) Evitarea detectării pattern-urilor
- (-) Template-uri mai complexe de creat
- (-) Necesită validare spintax
- (-) Preview poate diferi de final
