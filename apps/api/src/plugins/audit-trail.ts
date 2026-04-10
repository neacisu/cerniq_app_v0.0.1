import type { FastifyPluginCallback, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { trace } from "@opentelemetry/api";
import { recordAuditEvent } from "@cerniq/observability";
import { httpRouteLabel } from "./metrics.js";
import { createHash } from "node:crypto";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SKIP_PREFIXES = [
  "/health",
  "/metrics",
  "/docs",
  "/documentation",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
];

const MAX_BODY_BYTES = 48_000;

function pathOnly(url: string): string {
  const p = url.split("?")[0] ?? "";
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

function shouldSkipPath(path: string): boolean {
  if (path === "/" || path.startsWith("/docs")) return true;
  return SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function clientIpHash(request: FastifyRequest): string {
  const raw = request.ip ?? "";
  if (!raw) return "";
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 16);
}

function requestUserId(request: FastifyRequest): string | null {
  const u = request.user as { sub?: string; userId?: string; id?: string } | undefined;
  if (!u) return null;
  if (typeof u.id === "string") return u.id;
  if (typeof u.userId === "string") return u.userId;
  if (typeof u.sub === "string") return u.sub;
  return null;
}

function hashBody(body: unknown): string | null {
  if (body === undefined || body === null) return null;
  try {
    const s = typeof body === "string" ? body : JSON.stringify(body);
    if (Buffer.byteLength(s, "utf8") > MAX_BODY_BYTES) return null;
    return createHash("sha256").update(s, "utf8").digest("hex");
  } catch {
    return null;
  }
}

const auditTrailPluginFn: FastifyPluginCallback = (_app, _opts, done) => {
  _app.addHook("onResponse", (request, reply, hookDone) => {
    if (process.env.AUDIT_TRAIL_DISABLED === "true" || process.env.NODE_ENV === "test") {
      hookDone();
      return;
    }
    const method = request.method.toUpperCase();
    if (!MUTATING.has(method)) {
      hookDone();
      return;
    }
    const p = pathOnly(request.url);
    if (shouldSkipPath(p)) {
      hookDone();
      return;
    }

    const spanCtx = trace.getActiveSpan()?.spanContext();
    const correlationRaw = request.headers["x-correlation-id"];
    const correlationId = typeof correlationRaw === "string" ? correlationRaw : undefined;
    const routeLabel = httpRouteLabel(request);

    recordAuditEvent({
      tenantId: request.tenantId ?? null,
      userId: requestUserId(request),
      correlationId,
      traceId: spanCtx?.traceId,
      spanId: spanCtx?.spanId,
      method,
      routePattern: routeLabel,
      statusCode: reply.statusCode,
      ipHash: clientIpHash(request) || null,
      userAgent:
        typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
      requestBodyHash: hashBody(request.body),
      metadata: {
        path: p,
        durationMs: reply.elapsedTime,
        resource: routeLabel,
        action: method,
        routerPath: request.routeOptions.url ?? null,
      },
    });
    hookDone();
  });

  done();
};

export const auditTrailPlugin = fp(auditTrailPluginFn, {
  name: "audit-trail",
});
