# ADR-0084: LLM Fallback Strategy

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Dependența de un singur provider LLM e riscantă (downtime, rate limits).

**Decision:** **Fallback Chain:**

| Priority | Provider | Model |
| -------- | -------- | ----- |
| 1 (Primary) | xAI | grok-4 |
| 2 (Fallback) | OpenAI | gpt-4o |
| 3 (Backup) | Anthropic | claude-3-sonnet |

**Implementation:**

- Iterate through chain on errors
- Log which provider was used
- Metric: `llm.calls` cu labels (provider, model, fallback)
- Only retry on retryable errors

**Consequences:**

- (+) High availability
- (-) Cost variabil (fallback-uri pot fi mai scumpe)
- (-) Complexitate în prompt compatibility
