# ADR-0079: Separare Conversation Store

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Conversațiile AI pot deveni foarte mari (100+ mesaje). Stocarea în tabelul principal ar afecta performanța.

**Decision:** **Separare** în tabele dedicate:

- `ai_conversations` — Metadata (stats, session ID, timestamps)
- `ai_conversation_messages` — Mesaje append-only cu role, content, tool_calls

**Schema Key Points:**

- `message_count`, `tool_call_count`, `total_tokens_used` în table principal
- Mesaje indexate pe `(conversation_id, created_at DESC)`
- Suport pentru role: user, assistant, system, tool

**Consequences:**

- (+) Query-uri rapide pe metadata
- (+) Scalabilitate pentru conversații lungi
- (+) Audit trail complet
