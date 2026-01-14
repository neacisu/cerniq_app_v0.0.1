# ADR-0008: Fastify v5.6.2 ca API Framework

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

API-ul Cerniq.app necesită un framework HTTP performant cu:

- TypeScript support nativ
- Schema validation built-in
- Plugin architecture
- Hook system pentru middleware

## Decizie

Utilizăm **Fastify v5.6.2** cu **@fastify/type-provider-zod**.

## Consecințe

### Pozitive

- ~2x mai rapid decât Express
- Type provider pentru Zod integration
- JSON Schema validation built-in
- Plugin encapsulation
- Async/await native

### Negative

- Express middleware nu e compatibil direct
- Learning curve pentru plugins

### Pattern Standard

```typescript
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  }
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Route cu Zod validation
fastify.get('/companies', {
  schema: {
    querystring: z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }),
    response: {
      200: z.object({
        data: z.array(CompanySchema),
        meta: PaginationSchema,
      }),
    },
  },
}, async (request, reply) => {
  // request.query is typed!
});
```
