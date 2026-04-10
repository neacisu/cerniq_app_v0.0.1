import type { FastifyRequest } from "fastify";
import { httpRouteLabel } from "../plugins/metrics.js";
import { AppError, UnauthorizedError } from "../errors/app-error.js";
import { hashClientIp } from "../lib/http-job-tracing.js";

type JwtUserShape = {
  tenantId?: string;
  tenant_id?: string;
  role?: string;
};

/**
 * Extrage tenant-ul din `request.user` după `jwtVerify()` — aceeași regulă ca în `tenant-context`.
 * Folosit când autentificarea reușește în handler (ex. SSE cu ?token=) dar `request.tenantId`
 * nu a fost setat în `onRequest` (path diferit în spatele proxy / ordine hook).
 */
export function resolveTenantIdFromJwtUser(request: FastifyRequest): string | null {
  const user = request.user as JwtUserShape | undefined;
  let tenantId: string | null = null;
  if (typeof user?.tenantId === "string" && user.tenantId.trim().length > 0) {
    tenantId = user.tenantId.trim();
  } else if (typeof user?.tenant_id === "string" && user.tenant_id.trim().length > 0) {
    tenantId = user.tenant_id.trim();
  }
  const role = user?.role;
  const header = request.headers["x-tenant-id"];
  if (role === "superadmin" && typeof header === "string" && header.trim().length > 0) {
    tenantId = header.trim();
  }
  return tenantId;
}

/** Dacă `request.tenantId` lipsește după JWT valid, îl completează din payload. */
export function ensureRequestTenantIdFromJwtIfMissing(request: FastifyRequest): void {
  if (typeof request.tenantId === "string" && request.tenantId.trim().length > 0) {
    return;
  }
  const tid = resolveTenantIdFromJwtUser(request);
  if (tid) {
    request.tenantId = tid;
  }
}

export function requireTenantId(request: FastifyRequest): string {
  const tenantId = request.tenantId;
  if (!tenantId) {
    request.log.warn(
      {
        event: "TENANT_MISSING",
        endpoint: httpRouteLabel(request),
        ipHash: hashClientIp(request) || null,
      },
      "tenant missing in request context",
    );
    throw new AppError("Tenant missing in request context", 401, "TENANT_MISSING");
  }
  return tenantId;
}

export function getActorId(request: FastifyRequest): string {
  const user = request.user as { id?: string; sub?: string } | undefined;
  const actorId = user?.id ?? user?.sub;
  if (!actorId) {
    request.log.warn(
      {
        event: "ACTOR_MISSING",
        endpoint: httpRouteLabel(request),
        ipHash: hashClientIp(request) || null,
      },
      "authenticated user id missing",
    );
    throw new UnauthorizedError("Authenticated user id missing", "ACTOR_MISSING");
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
