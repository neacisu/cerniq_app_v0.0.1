# ADR-0047: AI Structuring Pipeline

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Date nestructurate necesită parsing AI (PDF-uri, text liber).

**Decision:** xAI Grok-4 pentru structurare:

```typescript
const aiStructurePrompt = `
Extract structured data from the following text.
Return JSON with these fields:
- company_name
- cui
- address
- contact_person
- phone
- email

Text: {input}

JSON:
`;

// Rate limit: 60 req/min
// Fallback: Regex patterns
```

**Consequences:**

- (+) Handling date nestructurate
- (+) High accuracy pentru Romanian text
- (-) Cost per request
- (-) Latență AI call
