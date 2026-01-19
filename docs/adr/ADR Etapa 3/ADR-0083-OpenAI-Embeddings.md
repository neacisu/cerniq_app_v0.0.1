# ADR-0083: Embeddings cu OpenAI text-embedding-3-small

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Alegere model embedding pentru vectorii de căutare.

**Decision:** **OpenAI text-embedding-3-small:**

| Property | Value |
| -------- | ----- |
| Dimensions | 1536 |
| Cost | $0.0001/1K tokens |
| Rate Limit | 3000 RPM |
| Quality | Suficient pentru product search |

**API Usage:**

- `openai.embeddings.create()` — Single embedding
- Batch support pentru multiple texts
- `encoding_format: 'float'` pentru precision

**Consequences:**

- (+) Cost predictibil și mic
- (+) Calitate adecvată pentru use case
- (-) Vendor lock-in (mitigat: embedding-uri pot fi regenerate)
