# STRUCTURED LOG SCHEMAS & STANDARDS

**Document Status:** DRAFT 1.0  
**Data:** 20 Ianuarie 2026  
**Context:** Etapa 0 - Observability Foundation

---

## 1. PURPOSE

Acest document definește **contractul strict** pentru formatul logurilor emise de toate serviciile Cerniq (API, Workeri, CronJobs). Structura standardizată este critică pentru:

1. Ingestia corectă în **SigNoz (ClickHouse)**.
2. Parsarea automată de către **Monitoring API**.
3. Corelarea evenimentelor distribuită (Tracing).

---

## 2. BASE LOG SCHEMA

Toate logurile trebuie să respecte acest format de bază (implementat via Pino).

```typescript
import { z } from 'zod';

export const BaseLogSchema = z.object({
  // Standard Pino fields
  level: z.number().int().describe('30=info, 40=warn, 50=error'),
  time: z.number().int().describe('Unix timestamp in ms'),
  pid: z.number().int(),
  hostname: z.string(),
  
  // Custom Service Context
  service: z.string().describe('numele serviciului, ex: cerniq-api, enrichment-worker'),
  env: z.enum(['development', 'staging', 'production']),
  version: z.string().describe('Service version from package.json'),
  
  // Distributed Tracing (OpenTelemetry)
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  
  // Multi-tenancy Context
  tenantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  
  // Message
  msg: z.string(),
  
  // Event Type Discriminator
  event: z.string().optional().describe('Event code for machine parsing, e.g., JOB_COMPLETED'),
});
```

---

## 3. DOMAIN SPECIFIC SCHEMAS

### 3.1 HTTP Access Logs (`event: 'http_request'`)

Emmis automat de middleware-ul `request-logger`.

```typescript
export const HttpLogSchema = BaseLogSchema.extend({
  event: z.literal('http_request'),
  req: z.object({
    id: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    url: z.string(),
    userAgent: z.string().optional(),
    ip: z.string(),
  }),
  res: z.object({
    statusCode: z.number().int(),
    responseTime: z.number().describe('Duration in ms'),
  }),
});
```

### 3.2 Worker Job Logs (`event: 'job_*'`)

Esențiale pentru monitorizarea stării workerilor și debugging.

#### Job Started

```typescript
export const JobStartedSchema = BaseLogSchema.extend({
  event: z.literal('job_started'),
  queue: z.string(),
  jobId: z.string(),
  jobName: z.string(),
  attempt: z.number().int().default(1),
  inputDataSummary: z.record(z.any()).optional().describe('Non-sensitive input summary'),
});
```

#### Job Completed

```typescript
export const JobCompletedSchema = BaseLogSchema.extend({
  event: z.literal('job_completed'),
  queue: z.string(),
  jobId: z.string(),
  duration: z.number().describe('Processing time in ms'),
  resultSummary: z.record(z.any()).optional(),
  throughput: z.number().optional().describe('Items processed (e.g., imported rows)'),
});
```

#### Job Failed

```typescript
export const JobFailedSchema = BaseLogSchema.extend({
  event: z.literal('job_failed'),
  queue: z.string(),
  jobId: z.string(),
  attempt: z.number().int(),
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    code: z.string().optional(),
  }),
  willRetry: z.boolean(),
});
```

### 3.3 Business Audit Logs (`event: 'audit_*'`)

Pentru acțiuni critice care necesită audit trail.

```typescript
export const AuditLogSchema = BaseLogSchema.extend({
  event: z.string().startsWith('audit_'),
  actor: z.object({
    type: z.enum(['user', 'system', 'api_key']),
    id: z.string(),
  }),
  action: z.string(),
  resource: z.object({
    type: z.string(), // ex: 'company'
    id: z.string(),
  }),
  changes: z.object({
    before: z.record(z.any()).optional(),
    after: z.record(z.any()).optional(),
  }).optional(),
  status: z.enum(['success', 'failure', 'denied']),
});
```

---

## 4. EXAMPLE JSON OUTPUTS

### 4.1 Worker Success

```json
{
  "level": 30,
  "time": 1705312345678,
  "service": "enrichment-worker",
  "env": "production",
  "traceId": "7b8e63280590ed4b2762a5676767520e",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "job_completed",
  "queue": "enrichment-queue",
  "jobId": "1052",
  "duration": 450,
  "msg": "Successfully enriched company metrics",
  "resultSummary": {
    "source": "anaf",
    "fieldsUpdated": 12
  }
}
```

### 4.2 Security Audit

```json
{
  "level": 40,
  "time": 1705312349999,
  "service": "cerniq-api",
  "env": "production",
  "userId": "user_ui_999",
  "event": "audit_access_denied",
  "actor": { "type": "user", "id": "user_ui_999" },
  "action": "delete_company",
  "resource": { "type": "company", "id": "comp_123" },
  "status": "denied",
  "msg": "User attempted to delete company without permissions"
}
```

---

## 5. REDACTION POLICY (PII)

Următoarele câmpuri sunt **automat redactate** sau hash-uite înainte de a fi scrise în loguri:

| Field Pattern | Action |
| :--- | :--- |
| `password`, `token`, `secret`, `key` | `[REDACTED]` |
| `email`, `phone`, `cnp` | `[REDACTED]` |
| `authorization` header | `[REDACTED]` |
| `cookie` header | `[REDACTED]` |

---
