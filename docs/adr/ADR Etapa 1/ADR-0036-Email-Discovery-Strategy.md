# ADR-0036: Email Discovery Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Necesitatea găsirii adreselor email pentru contacte business.

**Decision:** Multi-provider strategy:

1. **Hunter.io** (primary) - 15 req/sec, pattern discovery
2. **ZeroBounce** (verification) - 10 req/sec
3. **Web Scraping** (fallback) - Contact pages

Flow:

```text
CUI/Domain → Hunter Pattern Discovery → Email Candidates → ZeroBounce Verify → Valid Email
```

**Consequences:**

- (+) Coverage rate ridicat
- (+) Validare email deliverability
- (-) Cost per verified email
