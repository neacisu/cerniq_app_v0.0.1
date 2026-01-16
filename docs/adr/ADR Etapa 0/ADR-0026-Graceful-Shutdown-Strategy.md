# ADR-0026: Graceful Shutdown Strategy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Serviciile trebuie să se oprească graceful pentru a:

- Finaliza requests în progress
- Închide conexiuni database corect
- Drain BullMQ workers

## Decizie

Implementăm **graceful shutdown** cu timeout configurable.

## Consecințe

```typescript
const SHUTDOWN_TIMEOUT = 30000; // 30 seconds

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal');
  
  // 1. Stop accepting new requests
  await fastify.close();
  
  // 2. Wait for in-flight requests (Fastify handles this)
  
  // 3. Close BullMQ workers
  await Promise.all(workers.map(w => w.close()));
  
  // 4. Close database connections
  await db.$disconnect();
  
  // 5. Close Redis
  await redis.quit();
  
  logger.info('Graceful shutdown complete');
  process.exit(0);
}

// Register signal handlers
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Timeout fallback
setTimeout(() => {
  logger.error('Shutdown timeout exceeded, forcing exit');
  process.exit(1);
}, SHUTDOWN_TIMEOUT);
```
