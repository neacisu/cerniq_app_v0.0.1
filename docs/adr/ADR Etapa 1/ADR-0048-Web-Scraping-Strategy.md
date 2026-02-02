# ADR-0048: Web Scraping Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Unele date sunt disponibile doar pe site-uri publice (DAJ, ANIF, OUAI).

**Decision:** Playwright-based scraping cu stealth:

```typescript
import { chromium } from 'playwright';
import StealthPlugin from 'playwright-extra-plugin-stealth';

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});

// Respectăm robots.txt și ToS
// Rate limit: 1 req per 2 secunde per domain
// Cache rezultate 7 zile
```

**Consequences:**

- (+) Date publice accesibile
- (+) Automated și schedulat
- (-) Fragil la schimbări site
- (-) Legal considerations (public data only)
