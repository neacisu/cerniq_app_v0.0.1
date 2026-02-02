# ADR-0069: xAI Grok-4 ca LLM Primary

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Alegerea providerului LLM pentru agentul de vânzări AI.

**Decision:**

- **Primary:** xAI Grok-4 — Function calling robust, context window 128K tokens, cost ~$0.02/1K tokens, rate limit 60 RPM
- **Fallback:** OpenAI GPT-4o — Activat la Grok unavailable sau rate limit

**Configuration:**

```typescript
const LLM_CONFIG = {
  primary: { provider: 'xai', model: 'grok-4', maxTokens: 4096, temperature: 0.3 },
  fallback: { provider: 'openai', model: 'gpt-4o', maxTokens: 4096, temperature: 0.3 },
  routing: { maxRetries: 2, fallbackOnError: true, fallbackOnRateLimit: true }
};
```

**Consequences:**

- (+) Cost predictibil pentru bugetare
- (+) Performance consistent pentru negocieri
- (-) Dependență de xAI (mitigat cu fallback OpenAI)
