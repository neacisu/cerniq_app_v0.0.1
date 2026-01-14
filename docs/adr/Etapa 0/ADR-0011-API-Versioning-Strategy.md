# ADR-0011: API Versioning Strategy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

API-ul Cerniq.app va evolua și necesităm o strategie de versioning care:

- Permite backward compatibility
- Nu break-ează clienții existenți
- Este ușor de implementat și întreținut

## Decizie

Utilizăm **URL Path Versioning** cu format `/api/v{N}/`.

## Consecințe

### Pozitive

- Explicit și ușor de înțeles
- Cacheable (URL diferit per versiune)
- Documentabil clar în OpenAPI
- Routing simplu în Fastify

### Pattern

```text
/api/v1/companies       # Version 1
/api/v2/companies       # Version 2 (când va fi necesar)
```

### Implementare

```typescript
// API routes structure
fastify.register(v1Routes, { prefix: '/api/v1' });
// fastify.register(v2Routes, { prefix: '/api/v2' }); // când e nevoie

// Deprecation header pentru versiuni vechi
fastify.addHook('onSend', async (request, reply) => {
  if (request.url.startsWith('/api/v1')) {
    reply.header('Deprecation', 'true');
    reply.header('Sunset', '2027-01-01');
    reply.header('Link', '</api/v2>; rel="successor-version"');
  }
});
```
