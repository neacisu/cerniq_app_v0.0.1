# ADR-0079: Regenerare Response pe Guardrail Fail

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Când un guardrail eșuează, avem opțiuni: block, regenerare automată, sau modificare manuală.

**Decision:** **Regenerare automată** cu maximum 3 încercări:

1. Generate response
2. Run guardrails
3. If fail: inject corrections în prompt și regenerate
4. After 3 failures: escalate to human cu message "Colegul meu vă va contacta..."

**Correction Prompt Example:**

```text
CORECȚIE: Prețul pentru {sku} trebuie să fie minim {minimum} RON, nu {mentioned} RON.
```

**Consequences:**

- (+) Reducere intervenții manuale
- (+) UX mai bun (răspuns corect automat)
- (-) Cost LLM crescut pentru regenerări
