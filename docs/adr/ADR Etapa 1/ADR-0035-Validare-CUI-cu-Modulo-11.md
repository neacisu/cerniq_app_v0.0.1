# ADR-0035: Validare CUI cu Modulo-11

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** CUI (Cod Unic de Identificare) este identificatorul fiscal unic românesc și trebuie validat algoritmic.

**Decision:** Implementăm validare Modulo-11 conform specificației ANAF:

```typescript
function validateCUI(cui: string): boolean {
  const cleaned = cui.replace(/^RO/i, '').trim();
  if (!/^\d{2,10}$/.test(cleaned)) return false;
  
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = cleaned.padStart(10, '0').split('').map(Number);
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  
  const checkDigit = (sum * 10) % 11 % 10;
  return checkDigit === digits[9];
}
```

**Consequences:**

- (+) Validare offline fără API call
- (+) Filtrare CUI-uri invalide înainte de ANAF API
- (+) Economie rate limit ANAF
