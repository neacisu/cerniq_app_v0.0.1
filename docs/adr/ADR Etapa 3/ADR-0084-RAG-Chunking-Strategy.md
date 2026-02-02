# ADR-0084: Chunking Strategy pentru RAG

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Produsele au descrieri lungi. Pentru RAG eficient, trebuie chunk-uri optimale.

**Decision:** **Semantic Chunking** cu:

| Parameter | Value |
| --------- | ----- |
| Chunk size | 500-800 tokens (target 600) |
| Overlap | 100 tokens |
| Separators | `\\n##`, `\\n###`, `\\n\\n`, `\\n`, `.`, ` ` |

**Text Structure:**

1. Product name (H1)
2. Description (H2)
3. Technical Specifications (H2)
4. Usage Instructions (H2)
5. Compatibility Notes (H2)

**Tool:** `RecursiveCharacterTextSplitter` from langchain

**Consequences:**

- (+) Retrieval precis
- (+) Context suficient în fiecare chunk
- (-) Storage mai mare (overlap)
