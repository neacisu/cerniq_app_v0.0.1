# ADR-0034: Strategie Ingestie Multi-Source

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Date provin din surse multiple: CSV import, API webhooks, web scraping, manual entry.

**Decision:**

```typescript
// Unified ingestion interface
interface BronzeIngestionSource {
  sourceType: 'csv' | 'webhook' | 'scrape' | 'manual' | 'api';
  sourceIdentifier: string;  // filename, URL, endpoint
  rawPayload: Record<string, unknown>;
  ingestionTimestamp: Date;
  checksum: string;  // SHA-256 pentru deduplicare
}
```

Fiecare sursă are worker dedicat, toate scriu în `bronze_contacts` cu format unificat.

**Consequences:**

- (+) Flexibilitate adăugare surse noi
- (+) Deduplicare centralizată via checksum
- (+) Audit trail complet
- (-) Normalizare necesară în Silver layer
