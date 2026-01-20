# ADR-0076: Python 3.14 Free-Threading pentru MCP

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** MCP Server necesită concurrency ridicată pentru multiple sesiuni AI, integrare cu biblioteci async Python, și performance pentru embedding generation.

**Decision:** **Python 3.14.2** cu **Free-Threading** enabled (fără GIL):

```dockerfile
FROM python:3.14.2-slim
ENV PYTHON_GIL=0
CMD ["python", "-X", "gil=0", "-m", "mcp_server.main"]
```

**Benefits:**

- True parallelism pentru CPU-bound tasks (embedding computation)
- Shared memory între threads
- Compatibilitate cu biblioteci existente

**Consequences:**

- (+) Performance parallelism real
- (-) Necesită Python 3.14+ (released Q4 2025)
- (-) Memory management mai atent
- (-) Debugging mai complex
