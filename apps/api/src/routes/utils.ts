import type { FastifyRequest } from "fastify";

export function requireTenantId(request: FastifyRequest): string {
  const tenantId = request.tenantId;
  if (!tenantId) {
    throw new Error("Tenant missing in request context");
  }
  return tenantId;
}

export function getActorId(request: FastifyRequest): string {
  const user = request.user as { id?: string; sub?: string } | undefined;
  const actorId = user?.id ?? user?.sub;
  if (!actorId) {
    throw new Error("Authenticated user id missing");
  }
  return actorId;
}

export function parseLimit(limit: unknown, fallback = 25, max = 100): number {
  const parsed = Number(limit ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.floor(parsed));
}

export function parseOffset(offset: unknown, fallback = 0): number {
  const parsed = Number(offset ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}
