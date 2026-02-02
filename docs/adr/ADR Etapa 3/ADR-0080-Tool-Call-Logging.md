# ADR-0080: Tool Call Logging Complet

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Pentru debugging, audit și îmbunătățire AI, toate tool calls trebuie logate complet.

**Decision:** **Logging complet** pentru fiecare tool call în `ai_tool_calls`:

| Field | Purpose |
| ----- | ------- |
| tool_name | Identificare tool |
| tool_input/output | Payload complet JSONB |
| started_at/completed_at | Timing |
| duration_ms | Latency tracking |
| status | pending/success/error |
| guardrail_results | Rezultate validare |
| tokens_used, estimated_cost_usd | Cost tracking |

**Indexes:** conversation_id, negotiation_id, (tool_name, created_at DESC)

**Consequences:**

- (+) Debugging facilitat
- (+) Analytics pe tool usage
- (+) Cost tracking precis
