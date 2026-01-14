# ADR-0019: CORS Policy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

API-ul trebuie să accepte requests de la frontend-ul SPA rulat pe alt origin în development și production.

## Decizie

Implementăm **CORS strict** cu origins explicite.

## Consecințe

```typescript
fastify.register(cors, {
  origin: [
    'https://app.cerniq.app',
    'https://admin.cerniq.app',
    ...(process.env.NODE_ENV === 'development' 
      ? ['http://localhost:3000', 'http://localhost:5173'] 
      : []),
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Correlation-Id',
    'X-Tenant-Id',
  ],
  exposedHeaders: [
    'X-Request-Id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
  ],
  maxAge: 86400, // 24 hours preflight cache
});
```
