# CERNIQ.APP — ETAPA 0: LOGGING STANDARDS

## Standarde și Best Practices pentru Logging

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. PRINCIPII LOGGING

## 1.1 Reguli Fundamentale

1. **JSON Format** - Toate log-urile în JSON pentru SigNoz
2. **Correlation IDs** - Fiecare request are traceId unic
3. **PII Redaction** - Email, phone, password, CUI redactate
4. **Structured Context** - tenantId, userId în fiecare log
5. **Appropriate Levels** - Nu spam cu debug în producție

---

## 2. LOG LEVELS

| Level | Valoare | Utilizare | Producție |
| ----- | ------- | --------- | --------- |
| `fatal` | 60 | Aplicația se oprește | ✓ |
| `error` | 50 | Erori care necesită atenție | ✓ |
| `warn` | 40 | Situații neașteptate | ✓ |
| `info` | 30 | Evenimente business importante | ✓ |
| `debug` | 20 | Debugging development | ✗ |
| `trace` | 10 | Detalii granulare | ✗ |

---

## 3. IMPLEMENTARE PINO

## 3.1 Configurare Logger

```typescript
// packages/logger/src/index.ts
import pino from 'pino';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.email',
  'req.body.phone',
  'req.body.cui',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.creditCard'
];

export const createLogger = (options: { name: string }) => {
  return pino({
    name: options.name,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    
    // Redact PII
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]'
    },
    
    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
    
    // Format pentru development
    transport: process.env.NODE_ENV !== 'production' 
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
    
    // Base context
    base: {
      service: options.name,
      version: process.env.APP_VERSION || '0.0.0',
      env: process.env.NODE_ENV
    },
    
    // Formatters
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
        service: bindings.name
      })
    }
  });
};

export const logger = createLogger({ name: 'cerniq-api' });
```

## 3.2 Request Logger Plugin

```typescript
// apps/api/src/plugins/request-logger.ts
import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';

const requestLoggerPlugin: FastifyPluginAsync = async (fastify) => {
  // Generate request ID
  fastify.addHook('onRequest', async (request) => {
    request.id = request.headers['x-request-id'] as string || randomUUID();
    
    // Add context to logger
    request.log = request.log.child({
      requestId: request.id,
      traceId: request.headers['x-trace-id'] || request.id,
      tenantId: request.headers['x-tenant-id'],
      userId: request.user?.id
    });
    
    request.log.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip
    }, 'Request received');
  });
  
  // Log response
  fastify.addHook('onResponse', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime
    }, 'Request completed');
  });
  
  // Log errors
  fastify.addHook('onError', async (request, reply, error) => {
    request.log.error({
      method: request.method,
      url: request.url,
      error: {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      }
    }, 'Request error');
  });
};

export default requestLoggerPlugin;
```

---

## 4. LOGGING PATTERNS

## 4.1 Business Events

```typescript
// Good: Structured business event
logger.info({
  event: 'company.enriched',
  companyId: company.id,
  tenantId: company.tenant_id,
  enrichmentSource: 'anaf',
  fieldsUpdated: ['fiscal_status', 'address', 'employees'],
  duration: enrichmentDuration
}, 'Company enrichment completed');

// Bad: Unstructured message
logger.info(`Company ${company.id} enriched from ANAF`);
```

## 4.2 Error Logging

```typescript
// Good: Structured error with context
logger.error({
  event: 'enrichment.failed',
  companyId: company.id,
  enrichmentSource: 'termene',
  error: {
    name: error.name,
    message: error.message,
    code: error.code
  },
  retryCount: 2,
  willRetry: true
}, 'Enrichment failed, will retry');

// Bad: Just logging error
logger.error(error);
```

## 4.3 External API Calls

```typescript
// Good: Log API call with timing
const startTime = Date.now();
try {
  const result = await anafApi.getCompanyInfo(cui);
  logger.info({
    event: 'api.call.success',
    api: 'anaf',
    endpoint: '/company',
    cui: '[REDACTED]', // PII already redacted by Pino
    duration: Date.now() - startTime,
    statusCode: 200
  }, 'ANAF API call successful');
} catch (error) {
  logger.error({
    event: 'api.call.failed',
    api: 'anaf',
    endpoint: '/company',
    duration: Date.now() - startTime,
    error: { name: error.name, message: error.message }
  }, 'ANAF API call failed');
}
```

## 4.4 Queue Events

```typescript
// Job started
logger.info({
  event: 'job.started',
  queue: 'enrichment',
  jobId: job.id,
  jobName: job.name,
  data: { companyId: job.data.companyId }
}, 'Job processing started');

// Job completed
logger.info({
  event: 'job.completed',
  queue: 'enrichment',
  jobId: job.id,
  duration: job.processedOn - job.timestamp,
  result: { fieldsUpdated: 5 }
}, 'Job completed successfully');

// Job failed
logger.error({
  event: 'job.failed',
  queue: 'enrichment',
  jobId: job.id,
  attemptsMade: job.attemptsMade,
  error: { name: error.name, message: error.message }
}, 'Job failed');
```

---

## 5. LOG OUTPUT EXAMPLES

## 5.1 Production JSON

```json
{
  "level": "info",
  "time": "2026-01-15T10:30:00.000Z",
  "pid": 1,
  "host": "cerniq-api-abc123",
  "service": "cerniq-api",
  "version": "0.1.0",
  "env": "production",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "abc123def456",
  "tenantId": "tenant_001",
  "userId": "user_123",
  "event": "company.enriched",
  "companyId": "comp_456",
  "enrichmentSource": "anaf",
  "fieldsUpdated": ["fiscal_status", "address"],
  "duration": 234,
  "msg": "Company enrichment completed"
}
```

## 5.2 Development Pretty

```text
[10:30:00.000] INFO (cerniq-api): Company enrichment completed
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    traceId: "abc123def456"
    tenantId: "tenant_001"
    event: "company.enriched"
    companyId: "comp_456"
    enrichmentSource: "anaf"
    fieldsUpdated: ["fiscal_status", "address"]
    duration: 234
```

---

## 6. PII REDACTION RULES

## 6.1 Câmpuri Redactate Automat

| Câmp | Pattern | Exemplu Original | Exemplu Redactat |
| ---- | ------- | ---------------- | ---------------- |
| email | `*.email` | <user@example.com> | [REDACTED] |
| phone | `*.phone` | +40721234567 | [REDACTED] |
| password | `*.password` | secret123 | [REDACTED] |
| cui | `*.cui` | 12345678 | [REDACTED] |
| token | `*.token` | eyJhbGc... | [REDACTED] |
| apiKey | `*.apiKey` | sk-abc123 | [REDACTED] |
| authorization | `req.headers.authorization` | Bearer xyz | [REDACTED] |

## 6.2 Custom Redaction

```typescript
// Pentru câmpuri custom
const logger = pino({
  redact: {
    paths: [
      '*.cnp',           // CNP (cod numeric personal)
      '*.iban',          // IBAN
      '*.cardNumber',    // Card bancar
      '*.cvv',
      '*.pin'
    ],
    censor: (value, path) => {
      // Păstrează ultimele 4 caractere pentru debugging
      if (typeof value === 'string' && value.length > 4) {
        return `***${value.slice(-4)}`;
      }
      return '[REDACTED]';
    }
  }
});
```

---

## 7. INTEGRATION CU SIGNOZ

## 7.1 OpenTelemetry Logs Export

```typescript
// packages/telemetry/src/logs.ts
import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

const loggerProvider = new LoggerProvider();

loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:64070'
    })
  )
);

logs.setGlobalLoggerProvider(loggerProvider);
```

## 7.2 Pino Transport pentru OTel

```typescript
// Transport care trimite logs la OTel
import build from 'pino-abstract-transport';

export default async function (opts) {
  return build(async function (source) {
    for await (const obj of source) {
      // Convert Pino log to OTel format
      const otelLog = {
        timestamp: new Date(obj.time),
        severityNumber: pinoToOtelSeverity(obj.level),
        body: obj.msg,
        attributes: {
          ...obj,
          msg: undefined,
          level: undefined,
          time: undefined
        }
      };
      
      // Send to OTel collector
      otelLogger.emit(otelLog);
    }
  });
}
```

---

## 8. LOG RETENTION

| Environment | Level | Retention | Storage |
| ----------- | ----- | --------- | ------- |
| Development | debug | Session | Local |
| Staging | debug | 3 days | SigNoz |
| Production | info | 7 days | SigNoz |
| Production errors | error | 30 days | SigNoz |

---

**Document generat:** 15 Ianuarie 2026
