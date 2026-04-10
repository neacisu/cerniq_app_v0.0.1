/**
 * Asigură augmentarea `FastifyInstance#rateLimit` în proiectul `tsconfig.json` (rădăcină)
 * (shim-uri care re-exportă rute din `apps/api` fără a trece prin `plugins/index.ts`).
 */
import "@fastify/rate-limit";
