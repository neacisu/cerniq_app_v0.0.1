/**
 * Augmentări minime pentru `tsconfig.json` (rădăcină) când analizează re-export-uri
 * către `apps/api` (fără a importa `tenant-context.ts`, care trage runtime DB).
 * `import "fastify"` este obligatoriu ca merge-ul să nu înlocuiască tipurile Fastify.
 * Aliniat la `apps/api/src/plugins/tenant-context.ts` (tenantId).
 *
 * `FastifyInstance#rateLimit` vine din `@fastify/rate-limit`; încărcare: `fastify-rate-limit-bootstrap.ts`.
 */
import type {} from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    tenantId?: string | null;
  }
}
