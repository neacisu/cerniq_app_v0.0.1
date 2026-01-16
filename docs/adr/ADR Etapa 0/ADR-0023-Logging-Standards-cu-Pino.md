# ADR-0023: Logging Standards cu Pino

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm structured logging cu:

- JSON format pentru ingestion în SigNoz
- Correlation IDs pentru tracing
- PII redaction automată

## Decizie

Utilizăm **Pino** cu **pino-pretty** pentru development.

## Consecințe

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'email', 'phone', 'cui'],
    remove: true,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'cerniq-api',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
});

// Mandatory context în toate log entries
logger.child({
  tenantId: request.user?.tenantId,
  correlationId: request.headers['x-correlation-id'],
  traceId: span?.spanContext().traceId,
});
```
