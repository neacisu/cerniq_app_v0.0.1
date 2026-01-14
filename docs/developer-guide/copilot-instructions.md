# Cerniq.app — GitHub Copilot Instructions

> **Authority:** Master Spec v1.2 is the Single Source of Truth for this project.

## Project Overview

Cerniq.app is a B2B sales automation platform for the Romanian agricultural market.

**Architecture:**

- 5-stage pipeline: Data Enrichment → Cold Outreach → AI Sales → Post-Sale → Nurturing
- Vertical Slice Architecture (organize by feature)
- Medallion Data Model (Bronze → Silver → Gold)
- Multi-tenant with Row Level Security
- Event-driven with BullMQ workers

## Technology Stack (MANDATORY VERSIONS)

**Backend:**

- Node.js 24.12.0 LTS "Krypton"
- Python 3.14.2 Free-Threading
- PostgreSQL 18.1 (pgvector 0.8.1, PostGIS 3.6.1)
- Redis 7.4.7
- BullMQ 5.66.4
- Fastify 5.6.2

**Frontend:**

- React 19.2.3 (Server Components, React Compiler 1.0)
- Tailwind CSS 4.1.x (Oxide engine)
- Refine v5 (TanStack Query v5)
- shadcn/ui

**AI/LLM:**

- xAI Grok-4: Structured outputs, agent core
- OpenAI: Embeddings only
- Groq: Real-time chat
- Ollama: Privacy-first local

## Code Style Requirements

### TypeScript

- **Strict mode enabled** - no `any`, explicit types everywhere
- Use Zod for runtime validation
- Derive types from Zod schemas: `type X = z.infer<typeof XSchema>`
- async/await only, no callbacks or .then() chains

### Python

- Type hints mandatory on all functions
- Pydantic strict mode for validation
- With free-threading, use explicit locks for shared state

### SQL (PostgreSQL)

- `UNIQUE(tenant_id, business_key)` NOT `UNIQUE(business_key)`
- Always include `tenant_id` in queries
- Enable RLS on tenant-scoped tables
- Use descriptive constraint names

## Forbidden Patterns

| ❌ NEVER USE       | ✅ USE INSTEAD           |
| ------------------ | ------------------------ |
| `any` type         | Explicit types           |
| `shop_id`          | `tenant_id`              |
| `gold_hitl_tasks`  | `approval_tasks`         |
| email as user ID   | UUID                     |
| `UNIQUE(cui)`      | `UNIQUE(tenant_id, cui)` |
| default parameters | Required params          |
| catch-all handlers | Specific error types     |

## Naming Conventions

**Tables:**

- `bronze_*` - Raw ingestion (append-only)
- `silver_*` - Validated data
- `gold_*` - Operational data
- `approval_*` - HITL tasks

**Queues (BullMQ):**

- Pattern: `{layer}:{category}:{action}`
- Example: `enrich:anaf:fiscal-status`

**Events:**

- Pattern: `ENTITY_ACTION` or `ENTITY_ACTION_STATUS`
- Example: `LEAD_CREATED`, `APPROVAL_COMPLETED`

## Multi-Tenant Requirements

Every tenant-scoped table must:

1. Have `tenant_id UUID NOT NULL` column
2. Use composite unique constraints: `UNIQUE(tenant_id, key)`
3. Have RLS policy enabled
4. Set context in middleware: `SET LOCAL app.current_tenant = 'uuid'`

## Anti-Hallucination Rules

When generating code that handles AI outputs:

1. ALWAYS validate against database before using
2. NEVER trust LLM for arithmetic - recalculate
3. ALWAYS check product exists before offering
4. ALWAYS verify stock > 0
5. ALWAYS validate CUI with modulo-11 checksum

## Rate Limits

| Provider    | Limit  |
| ----------- | ------ |
| ANAF API    | 1/sec  |
| Termene.ro  | 20/sec |
| Hunter.io   | 15/sec |
| TimelinesAI | 50/min |
| xAI Grok    | 60/min |

## Event Contract

All events must include:

```typescript
{
  eventId: string; // UUID v7
  eventType: string; // Enum value
  idempotencyKey: string; // {entity}:{id}:{action}:{hourTs}
  timestamp: string; // ISO 8601 UTC
  correlationId: string; // For tracing
  tenantId: string; // UUID
  payload: T;
  version: number;
  source: string;
}
```

## Before Writing Code

1. Check if similar code exists in codebase
2. Verify version compatibility
3. Ensure multi-tenant isolation
4. Add OpenTelemetry spans for observability
5. Include correlationId in async operations
