# ADR-0038: Deduplicare Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Date din multiple surse pot conține duplicate cu variații minore.

**Decision:** Two-phase deduplication:

## Phase 1: Exact Match (Bronze)

```typescript
// SHA-256 hash pe payload normalizat
const deduplicationHash = sha256(
  normalizeString(name) + '|' + 
  normalizePhone(phone) + '|' + 
  normalizeCUI(cui)
);
```

## Phase 2: Fuzzy Match (Silver)

```typescript
// Levenshtein + Jaro-Winkler scoring
import fuzzball from 'fuzzball';

const similarity = fuzzball.WRatio(name1, name2);
const isSameCUI = cui1 === cui2;
const addressMatch = fuzzball.partial_ratio(addr1, addr2) > 80;

const isDuplicate = 
  isSameCUI || 
  (similarity > 85 && addressMatch);
```

**Consequences:**

- (+) Duplicate rate <1% în Gold
- (+) Entity resolution accuracy
- (-) CPU intensive pentru volume mari
